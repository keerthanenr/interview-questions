"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SANDBOX_WORKER_URL = process.env.NEXT_PUBLIC_SANDBOX_WORKER_URL || "";
const SANDBOX_APP_SECRET = process.env.NEXT_PUBLIC_SANDBOX_APP_SECRET || "";

interface SandboxTerminalProps {
  sessionId: string;
  sandboxReady: boolean;
}

export function SandboxTerminal({
  sessionId,
  sandboxReady,
}: SandboxTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<unknown>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<unknown>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectTerminal = useCallback(async () => {
    if (!sandboxReady || !containerRef.current || isConnecting) return;
    setIsConnecting(true);

    try {
      // Dynamically import xterm to avoid SSR
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      // Import xterm CSS (dynamic import handles the CSS)
      // @ts-expect-error CSS import handled by Next.js bundler
      await import("@xterm/xterm/css/xterm.css");

      // Create terminal
      const terminal = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        theme: {
          background: "#0d1117",
          foreground: "#c9d1d9",
          cursor: "#58a6ff",
          selectionBackground: "#264f78",
          black: "#0d1117",
          red: "#ff7b72",
          green: "#3fb950",
          yellow: "#d29922",
          blue: "#58a6ff",
          magenta: "#bc8cff",
          cyan: "#39c5cf",
          white: "#c9d1d9",
          brightBlack: "#484f58",
          brightRed: "#ffa198",
          brightGreen: "#56d364",
          brightYellow: "#e3b341",
          brightBlue: "#79c0ff",
          brightMagenta: "#d2a8ff",
          brightCyan: "#56d4dd",
          brightWhite: "#f0f6fc",
        },
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      terminal.open(containerRef.current);
      fitAddon.fit();

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;

      terminal.writeln("\x1b[38;5;39mConnecting to sandbox...\x1b[0m\r\n");

      // Connect WebSocket to the sandbox worker
      const wsUrl = SANDBOX_WORKER_URL.replace(/^http/, "ws");
      const ws = new WebSocket(
        `${wsUrl}/sandbox/terminal?sessionId=${sessionId}&cols=${terminal.cols}&rows=${terminal.rows}`
        // Send auth via subprotocol since WebSocket doesn't support custom headers
      );
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        // Send auth message first
        ws.send(JSON.stringify({ type: "auth", token: SANDBOX_APP_SECRET }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(
            typeof event.data === "string"
              ? event.data
              : new TextDecoder().decode(event.data)
          );
          if (msg.type === "output" && msg.data) {
            terminal.write(msg.data);
          } else if (msg.type === "exit") {
            terminal.writeln(
              `\r\n\x1b[38;5;208mProcess exited with code ${msg.exitCode}\x1b[0m`
            );
          }
        } catch {
          // Raw string output
          if (typeof event.data === "string") {
            terminal.write(event.data);
          }
        }
      };

      ws.onerror = () => {
        terminal.writeln(
          "\r\n\x1b[38;5;196mConnection error. Try refreshing the page.\x1b[0m"
        );
        setIsConnected(false);
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        terminal.writeln("\r\n\x1b[38;5;208mDisconnected from sandbox.\x1b[0m");
      };

      // Forward terminal input to WebSocket
      terminal.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data }));

          // Log terminal commands (fire-and-forget)
          // Detect Enter key (CR or LF)
          if (data === "\r" || data === "\n") {
            // We can't easily get the full command here, but the
            // event system will capture it from the terminal output
          }
        }
      });

      // Handle terminal resize
      terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", cols, rows }));
        }
      });

      // Fit on window resize
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        ws.close();
        terminal.dispose();
      };
    } catch (err) {
      setIsConnecting(false);
      console.error("Failed to initialize terminal:", err);
    }
  }, [sandboxReady, sessionId, isConnecting]);

  useEffect(() => {
    if (sandboxReady) {
      const cleanup = connectTerminal();
      return () => {
        cleanup?.then((fn) => fn?.());
      };
    }
  }, [sandboxReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col bg-[#0d1117]">
      {/* Terminal header */}
      <div className="flex h-7 flex-shrink-0 items-center justify-between border-[#21262d] border-b px-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              isConnected
                ? "bg-[#3fb950]"
                : isConnecting
                  ? "animate-pulse bg-[#d29922]"
                  : "bg-[#484f58]"
            )}
          />
          <span className="font-mono text-[#8b949e] text-[10px]">
            {isConnected
              ? "bash — sandbox"
              : isConnecting
                ? "connecting..."
                : "disconnected"}
          </span>
        </div>
        <span className="text-[#484f58] text-[10px]">
          Claude Code available: type &apos;claude&apos; to start
        </span>
      </div>

      {/* Terminal container */}
      <div className="min-h-0 flex-1 p-1" ref={containerRef} />
    </div>
  );
}
