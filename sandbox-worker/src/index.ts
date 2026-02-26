/**
 * ReactAssess Sandbox Worker
 *
 * Manages sandbox lifecycle for the Build phase:
 * - Creates per-session containers with pre-loaded challenge code
 * - Provides file read/write operations for the Monaco editor
 * - Proxies terminal WebSocket connections for xterm.js
 * - Captures terminal I/O for behavioral scoring (Claude Code usage analysis)
 * - Runs tests and captures results
 * - Exposes the Vite dev server preview URL
 */

import { getSandbox, Sandbox } from "@cloudflare/sandbox";

export { Sandbox };

interface Env {
  Sandbox: DurableObjectNamespace<Sandbox>;
  ANTHROPIC_API_KEY: string;
  APP_SECRET: string;
  ALLOWED_ORIGIN: string;
}

// Terminal I/O log entry written to container filesystem as JSONL
interface IOEntry {
  ts: number; // epoch milliseconds
  dir: "in" | "out"; // input from user or output from container
  data: string;
}

const TERMINAL_LOG_PATH = "/workspace/.terminal-io.jsonl";
const FLUSH_INTERVAL_MS = 15_000; // flush buffer to container every 15s
const MAX_BUFFER_SIZE = 5000; // max entries before auto-flush

interface CreateRequest {
  sessionId: string;
  challengeId: string;
  starterCode: Record<string, string>;
  testFileContent?: string;
  readmeContent?: string;
}

interface FileWriteRequest {
  sessionId: string;
  path: string;
  content: string;
}

interface FilesReadRequest {
  sessionId: string;
  path?: string;
}

interface TestRequest {
  sessionId: string;
}

interface DestroyRequest {
  sessionId: string;
}

// Shared CORS headers
function corsHeaders(origin: string, allowedOrigin: string): HeadersInit {
  const allowed = allowedOrigin || "*";
  return {
    "Access-Control-Allow-Origin": allowed === "*" ? "*" : origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(
  data: unknown,
  status: number,
  origin: string,
  allowedOrigin: string
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin, allowedOrigin),
    },
  });
}

// Validate the shared secret
function validateAuth(request: Request, appSecret: string): boolean {
  const auth = request.headers.get("Authorization");
  if (!auth) return false;
  return auth === `Bearer ${appSecret}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, env.ALLOWED_ORIGIN),
      });
    }

    // Authenticate all requests except OPTIONS
    if (!validateAuth(request, env.APP_SECRET)) {
      return jsonResponse(
        { error: "Unauthorized" },
        401,
        origin,
        env.ALLOWED_ORIGIN
      );
    }

    try {
      // ──── POST /sandbox/create ────────────────────────────────
      if (url.pathname === "/sandbox/create" && request.method === "POST") {
        const body = await request.json<CreateRequest>();
        const {
          sessionId,
          challengeId,
          starterCode,
          testFileContent,
          readmeContent,
        } = body;

        if (!sessionId || !challengeId) {
          return jsonResponse(
            { error: "sessionId and challengeId required" },
            400,
            origin,
            env.ALLOWED_ORIGIN
          );
        }

        const sandbox = getSandbox(env.Sandbox, sessionId);

        // Copy template to project directory
        await sandbox.exec("cp -r /workspace/template /workspace/project");

        // Set ANTHROPIC_API_KEY for Claude Code
        await sandbox.setEnvVars({
          ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
        });

        // Write starter code files
        for (const [filePath, content] of Object.entries(starterCode)) {
          // Convert Sandpack paths like "/App.js" to project paths like "/workspace/project/src/App.jsx"
          let targetPath: string;
          if (filePath === "/App.js" || filePath === "/App.jsx") {
            targetPath = "/workspace/project/src/App.jsx";
          } else if (filePath.startsWith("/")) {
            targetPath = `/workspace/project/src${filePath}`;
          } else {
            targetPath = `/workspace/project/src/${filePath}`;
          }
          await sandbox.writeFile(targetPath, content);
        }

        // Write test file if provided
        if (testFileContent) {
          await sandbox.mkdir("/workspace/project/__tests__", {
            recursive: true,
          });
          await sandbox.writeFile(
            "/workspace/project/__tests__/challenge.test.jsx",
            testFileContent
          );
        }

        // Write README with challenge instructions
        if (readmeContent) {
          await sandbox.writeFile(
            "/workspace/project/README.md",
            readmeContent
          );
        }

        // Install dependencies and start dev server in background
        await sandbox.exec(
          "cd /workspace/project && npm install --prefer-offline"
        );
        await sandbox.exec("cd /workspace/project && npm run dev &");

        // Read initial file tree
        const fileTree = await readFileTree(sandbox, "/workspace/project");

        return jsonResponse(
          {
            sandboxId: sessionId,
            fileTree,
            previewPort: 5173,
          },
          200,
          origin,
          env.ALLOWED_ORIGIN
        );
      }

      // ──── POST /sandbox/files (write) ─────────────────────────
      if (url.pathname === "/sandbox/files" && request.method === "POST") {
        const body = await request.json<FileWriteRequest>();
        const { sessionId, path, content } = body;

        if (!sessionId || !path) {
          return jsonResponse(
            { error: "sessionId and path required" },
            400,
            origin,
            env.ALLOWED_ORIGIN
          );
        }

        const sandbox = getSandbox(env.Sandbox, sessionId);
        await sandbox.writeFile(path, content);

        return jsonResponse({ success: true }, 200, origin, env.ALLOWED_ORIGIN);
      }

      // ──── GET /sandbox/files (read) ───────────────────────────
      if (url.pathname === "/sandbox/files" && request.method === "GET") {
        const sessionId = url.searchParams.get("sessionId");
        const filePath = url.searchParams.get("path");

        if (!sessionId) {
          return jsonResponse(
            { error: "sessionId required" },
            400,
            origin,
            env.ALLOWED_ORIGIN
          );
        }

        const sandbox = getSandbox(env.Sandbox, sessionId);

        if (filePath) {
          // Read a specific file
          const file = await sandbox.readFile(filePath);
          return jsonResponse(
            { content: file.content, path: filePath },
            200,
            origin,
            env.ALLOWED_ORIGIN
          );
        }

        // Read file tree
        const fileTree = await readFileTree(sandbox, "/workspace/project");
        return jsonResponse({ fileTree }, 200, origin, env.ALLOWED_ORIGIN);
      }

      // ──── GET /sandbox/terminal (WebSocket upgrade) ───────────
      if (url.pathname === "/sandbox/terminal") {
        const upgradeHeader = request.headers.get("Upgrade");
        if (upgradeHeader !== "websocket") {
          return new Response("Expected WebSocket upgrade", { status: 426 });
        }

        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) {
          return new Response("sessionId required", { status: 400 });
        }

        const sandbox = getSandbox(env.Sandbox, sessionId);
        const cols = Number.parseInt(url.searchParams.get("cols") || "80", 10);
        const rows = Number.parseInt(url.searchParams.get("rows") || "24", 10);

        // Create PTY session
        const ptyResponse = await sandbox.fetch(
          new Request("http://container/api/pty", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cols,
              rows,
              command: ["/bin/bash", "--norc", "--noprofile"],
              cwd: "/workspace/project",
              env: {
                TERM: "xterm-256color",
                COLORTERM: "truecolor",
                LANG: "en_US.UTF-8",
                HOME: "/home/user",
                USER: "candidate",
                PS1: "\\[\\e[38;5;39m\\]candidate\\[\\e[0m\\]@\\[\\e[38;5;208m\\]sandbox\\[\\e[0m\\] \\[\\e[38;5;41m\\]\\w\\[\\e[0m\\] \\$ ",
                ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
              },
            }),
          })
        );

        if (!ptyResponse.ok) {
          return new Response("Failed to create PTY", { status: 500 });
        }

        const ptyResult = (await ptyResponse.json()) as {
          success: boolean;
          pty: { id: string };
        };
        const ptyId = ptyResult.pty.id;

        // Create WebSocket pair for browser client
        const pair = new WebSocketPair();
        const [clientWs, serverWs] = Object.values(pair);
        serverWs.accept();

        // Connect to container WebSocket
        const containerWsResponse = await sandbox.fetch(
          new Request("http://container/ws", {
            headers: {
              Upgrade: "websocket",
              Connection: "Upgrade",
            },
          })
        );

        const containerWs = containerWsResponse.webSocket;
        if (!containerWs) {
          serverWs.close(1011, "Failed to connect to container");
          return new Response("Failed to establish container WebSocket", {
            status: 500,
          });
        }
        containerWs.accept();

        // ── Terminal I/O capture ─────────────────────────────────
        // Buffer terminal input/output for behavioral analysis.
        // Periodically flushes to a JSONL file in the container.
        const ioBuffer: IOEntry[] = [];
        let flushInProgress = false;

        async function flushBuffer() {
          if (flushInProgress || ioBuffer.length === 0) return;
          flushInProgress = true;
          try {
            const lines = ioBuffer
              .splice(0, ioBuffer.length)
              .map((e) => JSON.stringify(e))
              .join("\n");
            // Append to log file (read existing + concat, since writeFile overwrites)
            let existing = "";
            try {
              const file = await sandbox.readFile(TERMINAL_LOG_PATH);
              existing = file.content ?? "";
            } catch {
              // File doesn't exist yet
            }
            await sandbox.writeFile(
              TERMINAL_LOG_PATH,
              existing ? `${existing}\n${lines}` : lines
            );
          } catch {
            // Non-critical — don't break terminal over logging failure
          } finally {
            flushInProgress = false;
          }
        }

        // Periodic flush interval
        const flushTimer = setInterval(() => {
          flushBuffer();
        }, FLUSH_INTERVAL_MS);

        // Subscribe to PTY output stream
        containerWs.send(
          JSON.stringify({
            type: "request",
            id: `pty_stream_${ptyId}`,
            method: "GET",
            path: `/api/pty/${ptyId}/stream`,
            headers: { Accept: "text/event-stream" },
          })
        );

        // Forward container PTY output → browser client
        containerWs.addEventListener("message", (event) => {
          try {
            const msg = JSON.parse(event.data as string);
            if (msg.type === "stream" && msg.data) {
              const streamData = JSON.parse(msg.data);
              if (streamData.type === "pty_data" && streamData.data) {
                serverWs.send(
                  JSON.stringify({ type: "output", data: streamData.data })
                );
                // Capture output
                ioBuffer.push({
                  ts: Date.now(),
                  dir: "out",
                  data: streamData.data,
                });
                if (ioBuffer.length >= MAX_BUFFER_SIZE) {
                  flushBuffer();
                }
              } else if (streamData.type === "pty_exit") {
                serverWs.send(
                  JSON.stringify({
                    type: "exit",
                    exitCode: streamData.exitCode,
                  })
                );
              }
            }
          } catch {
            // Ignore parse errors
          }
        });

        // Forward browser client input → container PTY
        serverWs.addEventListener("message", (event) => {
          try {
            const msg = JSON.parse(event.data as string);
            if (msg.type === "input" && msg.data) {
              containerWs.send(
                JSON.stringify({ type: "pty_input", ptyId, data: msg.data })
              );
              // Capture input
              ioBuffer.push({
                ts: Date.now(),
                dir: "in",
                data: msg.data,
              });
            } else if (msg.type === "resize" && msg.cols && msg.rows) {
              containerWs.send(
                JSON.stringify({
                  type: "pty_resize",
                  ptyId,
                  cols: msg.cols,
                  rows: msg.rows,
                })
              );
            }
          } catch {
            // Ignore parse errors
          }
        });

        // Handle disconnect cleanup — flush remaining buffer
        serverWs.addEventListener("close", () => {
          clearInterval(flushTimer);
          flushBuffer();
          containerWs.close();
        });
        containerWs.addEventListener("close", () => {
          clearInterval(flushTimer);
          flushBuffer();
          serverWs.close();
        });

        return new Response(null, {
          status: 101,
          webSocket: clientWs,
          headers: corsHeaders(origin, env.ALLOWED_ORIGIN),
        });
      }

      // ──── POST /sandbox/test ──────────────────────────────────
      if (url.pathname === "/sandbox/test" && request.method === "POST") {
        const body = await request.json<TestRequest>();
        const { sessionId } = body;

        if (!sessionId) {
          return jsonResponse(
            { error: "sessionId required" },
            400,
            origin,
            env.ALLOWED_ORIGIN
          );
        }

        const sandbox = getSandbox(env.Sandbox, sessionId);

        // Run tests with JSON reporter for machine-readable results
        const result = await sandbox.exec(
          "cd /workspace/project && npx vitest run --reporter=json 2>&1 || true"
        );

        // Try to parse the JSON test output
        const testResults: {
          passed: number;
          failed: number;
          total: number;
          tests: Array<{ name: string; status: string; duration: number }>;
        } = { passed: 0, failed: 0, total: 0, tests: [] };

        try {
          // Extract JSON from the output (vitest outputs JSON to stdout)
          const jsonMatch = result.stdout.match(
            /\{[\s\S]*"testResults"[\s\S]*\}/
          );
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const suites = parsed.testResults || [];
            for (const suite of suites) {
              for (const test of suite.assertionResults || []) {
                testResults.tests.push({
                  name: test.fullName || test.title,
                  status: test.status,
                  duration: test.duration || 0,
                });
                testResults.total++;
                if (test.status === "passed") testResults.passed++;
                else testResults.failed++;
              }
            }
          }
        } catch {
          // If JSON parsing fails, count from raw output
          const passMatches = result.stdout.match(/(\d+)\s+passed/);
          const failMatches = result.stdout.match(/(\d+)\s+failed/);
          testResults.passed = passMatches
            ? Number.parseInt(passMatches[1], 10)
            : 0;
          testResults.failed = failMatches
            ? Number.parseInt(failMatches[1], 10)
            : 0;
          testResults.total = testResults.passed + testResults.failed;
        }

        return jsonResponse(
          {
            testResults,
            rawOutput: result.stdout,
            exitCode: result.exitCode,
          },
          200,
          origin,
          env.ALLOWED_ORIGIN
        );
      }

      // ──── POST /sandbox/destroy ───────────────────────────────
      if (url.pathname === "/sandbox/destroy" && request.method === "POST") {
        const body = await request.json<DestroyRequest>();
        const { sessionId } = body;

        if (!sessionId) {
          return jsonResponse(
            { error: "sessionId required" },
            400,
            origin,
            env.ALLOWED_ORIGIN
          );
        }

        // The sandbox will auto-destroy on timeout, but we can clean up
        // by letting the Durable Object hibernate
        return jsonResponse(
          { success: true, destroyed: sessionId },
          200,
          origin,
          env.ALLOWED_ORIGIN
        );
      }

      // ──── GET /sandbox/preview ────────────────────────────────
      if (url.pathname === "/sandbox/preview" && request.method === "GET") {
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) {
          return jsonResponse(
            { error: "sessionId required" },
            400,
            origin,
            env.ALLOWED_ORIGIN
          );
        }

        const sandbox = getSandbox(env.Sandbox, sessionId);

        // Proxy the request to the container's Vite dev server
        const previewResponse = await sandbox.fetch(
          new Request("http://container:5173/", {
            headers: request.headers,
          })
        );

        // Return proxied response with CORS headers
        const responseHeaders = new Headers(previewResponse.headers);
        const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);
        for (const [key, value] of Object.entries(cors)) {
          responseHeaders.set(key, value);
        }

        return new Response(previewResponse.body, {
          status: previewResponse.status,
          headers: responseHeaders,
        });
      }

      // ──── GET /sandbox/terminal-log ────────────────────────────
      if (
        url.pathname === "/sandbox/terminal-log" &&
        request.method === "GET"
      ) {
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) {
          return jsonResponse(
            { error: "sessionId required" },
            400,
            origin,
            env.ALLOWED_ORIGIN
          );
        }

        const sandbox = getSandbox(env.Sandbox, sessionId);

        try {
          const file = await sandbox.readFile(TERMINAL_LOG_PATH);
          const content = file.content ?? "";
          // Parse JSONL lines into an array
          const entries: IOEntry[] = content
            .split("\n")
            .filter((line: string) => line.trim())
            .map((line: string) => {
              try {
                return JSON.parse(line);
              } catch {
                return null;
              }
            })
            .filter(Boolean);

          return jsonResponse(
            { entries, count: entries.length },
            200,
            origin,
            env.ALLOWED_ORIGIN
          );
        } catch {
          // No log file yet (terminal hasn't been used)
          return jsonResponse(
            { entries: [], count: 0 },
            200,
            origin,
            env.ALLOWED_ORIGIN
          );
        }
      }

      return jsonResponse(
        { error: "Not found" },
        404,
        origin,
        env.ALLOWED_ORIGIN
      );
    } catch (err) {
      console.error("Worker error:", err);
      return jsonResponse(
        { error: "Internal server error" },
        500,
        origin,
        env.ALLOWED_ORIGIN
      );
    }
  },
};

// ──── Helpers ──────────────────────────────────────────────────

interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

async function readFileTree(
  sandbox: ReturnType<typeof getSandbox>,
  basePath: string,
  depth = 0,
  maxDepth = 4
): Promise<FileTreeNode[]> {
  if (depth >= maxDepth) return [];

  try {
    const result = await sandbox.exec(`ls -1pa "${basePath}"`);
    if (!result.success) return [];

    const entries = result.stdout.trim().split("\n").filter(Boolean);
    const nodes: FileTreeNode[] = [];

    for (const entry of entries) {
      // Skip hidden files, node_modules
      const name = entry.replace(/\/$/, "");
      if (name.startsWith(".") || name === "node_modules") continue;

      const isDir = entry.endsWith("/");
      const fullPath = `${basePath}/${name}`;

      const node: FileTreeNode = {
        name,
        path: fullPath,
        type: isDir ? "directory" : "file",
      };

      if (isDir) {
        node.children = await readFileTree(
          sandbox,
          fullPath,
          depth + 1,
          maxDepth
        );
      }

      nodes.push(node);
    }

    // Sort: directories first, then files, alphabetically
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  } catch {
    return [];
  }
}
