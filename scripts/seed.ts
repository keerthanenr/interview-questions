import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log("🌱 Seeding database...\n");

  // 1. Create test organization
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .upsert(
      { name: "Acme Engineering", plan: "professional" },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (orgErr) {
    console.error("Failed to create org:", orgErr.message);
    process.exit(1);
  }
  console.log(`✓ Organization: ${org.name} (${org.id})`);

  // 2. Check for existing auth user or create a test user record
  // NOTE: Link this to your actual Supabase auth user ID
  const { data: existingUsers } = await supabase
    .from("users")
    .select("id")
    .eq("org_id", org.id)
    .limit(1);

  let userId: string;
  if (existingUsers && existingUsers.length > 0) {
    userId = existingUsers[0].id;
    console.log(`✓ Using existing user: ${userId}`);
  } else {
    // Try to get the first auth user
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    if (authUsers?.users?.length) {
      userId = authUsers.users[0].id;
      const { error: userErr } = await supabase.from("users").upsert(
        {
          id: userId,
          org_id: org.id,
          email: authUsers.users[0].email ?? "admin@acme.dev",
          full_name: "Test Admin",
          role: "admin",
        },
        { onConflict: "id" }
      );
      if (userErr) console.warn("User upsert warning:", userErr.message);
      console.log(`✓ User linked: ${userId}`);
    } else {
      // Create a placeholder user ID
      userId = "00000000-0000-0000-0000-000000000001";
      await supabase.from("users").upsert(
        {
          id: userId,
          org_id: org.id,
          email: "admin@acme.dev",
          full_name: "Test Admin",
          role: "admin",
        },
        { onConflict: "id" }
      );
      console.log(`✓ Placeholder user created: ${userId}`);
    }
  }

  // 3. Create test assessment
  const { data: assessment, error: assessErr } = await supabase
    .from("assessments")
    .insert({
      org_id: org.id,
      created_by: userId,
      title: "Senior React Developer - Q1 2026",
      challenge_pool: [
        "todo-list-filtering",
        "data-fetching-dashboard",
        "form-with-validation",
        "virtualized-infinite-scroll",
        "realtime-collaborative-counter",
      ],
      settings: { useDefaultTimes: true, adaptiveDifficulty: true },
      status: "active",
    })
    .select()
    .single();

  if (assessErr) {
    console.error("Failed to create assessment:", assessErr.message);
    process.exit(1);
  }
  console.log(`✓ Assessment: ${assessment.title} (${assessment.id})`);

  // 4. Create test candidates
  const candidateData = [
    {
      email: "alice@example.com",
      full_name: "Alice Chen",
      token: `seed-alice-${Date.now()}`,
      status: "completed" as const,
    },
    {
      email: "bob@example.com",
      full_name: "Bob Martinez",
      token: `seed-bob-${Date.now()}`,
      status: "in_progress" as const,
    },
    {
      email: "carol@example.com",
      full_name: "Carol Williams",
      token: `seed-carol-${Date.now()}`,
      status: "invited" as const,
    },
  ];

  for (const cd of candidateData) {
    const { data: candidate, error: candErr } = await supabase
      .from("candidates")
      .insert({
        assessment_id: assessment.id,
        email: cd.email,
        full_name: cd.full_name,
        token: cd.token,
        status: cd.status,
        started_at: cd.status !== "invited" ? new Date().toISOString() : null,
        completed_at:
          cd.status === "completed" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (candErr) {
      console.error(`Failed to create candidate ${cd.email}:`, candErr.message);
      continue;
    }
    console.log(
      `✓ Candidate: ${cd.full_name} (${candidate.id}) — ${cd.status}`
    );

    // For completed and in-progress candidates, create sessions and events
    if (cd.status === "invited") continue;

    const { data: session, error: sessErr } = await supabase
      .from("sessions")
      .insert({
        candidate_id: candidate.id,
        current_phase: cd.status === "completed" ? "complete" : "build",
        completed_at:
          cd.status === "completed" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (sessErr || !session) {
      console.error(
        `Failed to create session for ${cd.email}:`,
        sessErr?.message
      );
      continue;
    }
    console.log(`  ✓ Session: ${session.id}`);

    // Create events for the session
    const events: {
      session_id: string;
      event_type: string;
      payload: Record<string, unknown>;
    }[] = [
      {
        session_id: session.id,
        event_type: "challenge_started",
        payload: { challenge_id: "todo-list-filtering", difficulty_tier: 3 },
      },
      {
        session_id: session.id,
        event_type: "prompt_sent",
        payload: {
          prompt_text:
            "How should I structure the state for a todo list with filtering? I want to keep it simple but scalable.",
        },
      },
      {
        session_id: session.id,
        event_type: "claude_response",
        payload: {
          response_text:
            "I'd recommend using a single array of todo objects with a filter state...",
          tokens_used: 245,
          model: "claude-sonnet-4-20250514",
          duration_ms: 1800,
        },
      },
      {
        session_id: session.id,
        event_type: "code_change",
        payload: {
          changed_files: ["/App.js"],
          code_snapshot:
            "import React, { useState } from 'react';\n\nexport default function App() {\n  const [todos, setTodos] = useState([]);\n  const [filter, setFilter] = useState('all');\n  // ...\n}",
        },
      },
      {
        session_id: session.id,
        event_type: "prompt_sent",
        payload: {
          prompt_text:
            "Can you help me implement the toggle functionality? I want to toggle a todo's completed status when clicking on it.",
        },
      },
      {
        session_id: session.id,
        event_type: "claude_response",
        payload: {
          response_text:
            "Here's how you can implement the toggle:\n```jsx\nconst toggleTodo = (id) => {\n  setTodos(todos.map(t => t.id === id ? {...t, completed: !t.completed} : t));\n};\n```",
          tokens_used: 180,
          model: "claude-sonnet-4-20250514",
          duration_ms: 1200,
        },
      },
      {
        session_id: session.id,
        event_type: "claude_output_accepted",
        payload: { acceptance_type: "partial", similarity: 72 },
      },
      {
        session_id: session.id,
        event_type: "code_change",
        payload: {
          changed_files: ["/App.js"],
          code_snapshot: "// Full todo implementation with filter...",
        },
      },
      {
        session_id: session.id,
        event_type: "prompt_sent",
        payload: {
          prompt_text:
            "The filter buttons aren't highlighting the active filter. How can I add conditional styling?",
        },
      },
      {
        session_id: session.id,
        event_type: "claude_response",
        payload: {
          response_text: "You can use conditional class names...",
          tokens_used: 150,
          model: "claude-sonnet-4-20250514",
          duration_ms: 900,
        },
      },
      {
        session_id: session.id,
        event_type: "claude_output_accepted",
        payload: { acceptance_type: "full", similarity: 95 },
      },
    ];

    if (cd.status === "completed") {
      events.push(
        {
          session_id: session.id,
          event_type: "challenge_submitted",
          payload: { code: "// Final todo list code", time_elapsed: 1440 },
        },
        {
          session_id: session.id,
          event_type: "phase_transition",
          payload: { from_phase: "build", to_phase: "explain" },
        },
        {
          session_id: session.id,
          event_type: "phase_transition",
          payload: { from_phase: "explain", to_phase: "review" },
        },
        {
          session_id: session.id,
          event_type: "phase_transition",
          payload: { from_phase: "review", to_phase: "complete" },
        }
      );
    }

    const { error: eventsErr } = await supabase.from("events").insert(events);
    if (eventsErr) console.warn("  Events warning:", eventsErr.message);
    else console.log(`  ✓ ${events.length} events created`);

    // Create submission for completed candidate
    if (cd.status === "completed") {
      const { error: subErr } = await supabase.from("submissions").insert({
        session_id: session.id,
        phase: "build",
        code: `import React, { useState } from 'react';

export default function App() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState('all');

  const addTodo = () => {
    if (!input.trim()) return;
    setTodos([...todos, { id: Date.now(), text: input.trim(), completed: false }]);
    setInput('');
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? {...t, completed: !t.completed} : t));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const activeCount = todos.filter(t => !t.completed).length;

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 20 }}>
      <h1>Todo List</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="Add a new todo..."
          style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <button onClick={addTodo}>Add</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'active', 'completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ fontWeight: filter === f ? 'bold' : 'normal' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {filteredTodos.map(todo => (
          <li key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
            <span style={{ flex: 1, textDecoration: todo.completed ? 'line-through' : 'none' }}>{todo.text}</span>
            <button onClick={() => deleteTodo(todo.id)}>×</button>
          </li>
        ))}
      </ul>
      <p style={{ fontSize: 14, color: '#666' }}>{activeCount} items remaining</p>
    </div>
  );
}`,
        metadata: {
          challenge_id: "todo-list-filtering",
          submitted_at: new Date().toISOString(),
        },
      });
      if (subErr) console.warn("  Submission warning:", subErr.message);
      else console.log("  ✓ Build submission created");

      // Create quickfire responses
      const quickfireData = [
        {
          question_index: 0,
          question: {
            type: "multiple_choice",
            text: "What hook is used for the todos state?",
            options: ["useReducer", "useState", "useRef", "useContext"],
            correct: "useState",
          },
          response: "useState",
          is_correct: true,
          response_time_ms: 3200,
        },
        {
          question_index: 1,
          question: {
            type: "multiple_choice",
            text: "Why is Date.now() used as the todo ID?",
            options: [
              "For sorting",
              "Unique identifier",
              "Timestamp display",
              "Performance",
            ],
            correct: "Unique identifier",
          },
          response: "Unique identifier",
          is_correct: true,
          response_time_ms: 5100,
        },
        {
          question_index: 2,
          question: {
            type: "free_text",
            text: "What would happen if you added 10,000 todos?",
            correct: "Performance degradation, need virtualization",
          },
          response:
            "The list would get very slow because every re-render maps the entire array. You'd want virtualization or pagination.",
          is_correct: true,
          response_time_ms: 12_400,
        },
        {
          question_index: 3,
          question: {
            type: "multiple_choice",
            text: "What does the filter function return for 'all'?",
            options: [
              "Only completed",
              "Only active",
              "All todos",
              "Empty array",
            ],
            correct: "All todos",
          },
          response: "All todos",
          is_correct: true,
          response_time_ms: 2800,
        },
        {
          question_index: 4,
          question: {
            type: "free_text",
            text: "Why use controlled input instead of uncontrolled?",
            correct:
              "React manages the input value, easier to validate and sync",
          },
          response:
            "So React controls the value and you can easily clear it after adding a todo.",
          is_correct: true,
          response_time_ms: 8900,
        },
        {
          question_index: 5,
          question: {
            type: "multiple_choice",
            text: "What happens if you remove the key prop from the list?",
            options: [
              "Nothing",
              "Console warning + potential bugs",
              "App crashes",
              "Todos disappear",
            ],
            correct: "Console warning + potential bugs",
          },
          response: "Console warning + potential bugs",
          is_correct: true,
          response_time_ms: 4200,
        },
        {
          question_index: 6,
          question: {
            type: "free_text",
            text: "How would you persist todos across page refreshes?",
            correct:
              "localStorage, useEffect to read on mount and save on changes",
          },
          response:
            "Use localStorage with a useEffect to save on changes and read on mount.",
          is_correct: true,
          response_time_ms: 9800,
        },
        {
          question_index: 7,
          question: {
            type: "multiple_choice",
            text: "Which pattern is used for toggling?",
            options: [
              "Spread + map",
              "Direct mutation",
              "useReducer dispatch",
              "setState callback",
            ],
            correct: "Spread + map",
          },
          response: "Direct mutation",
          is_correct: false,
          response_time_ms: 6100,
        },
      ];

      for (const qf of quickfireData) {
        await supabase.from("quickfire_responses").insert({
          session_id: session.id,
          ...qf,
        });
      }
      console.log(`  ✓ ${quickfireData.length} quickfire responses created`);

      // Create review comments
      const reviewData = [
        {
          file_path: "src/components/UserList.tsx",
          line_number: 23,
          comment_text:
            "This creates a new object on every render which will cause unnecessary re-renders of child components. Consider using useMemo.",
          issue_category: "performance_antipattern",
        },
        {
          file_path: "src/components/UserList.tsx",
          line_number: 45,
          comment_text:
            "The onClick handler should use a callback to avoid binding a new function each render: onChange={() => handleFilter(f)} creates a new closure per item.",
          issue_category: "performance_antipattern",
        },
        {
          file_path: "src/components/SearchBar.tsx",
          line_number: 12,
          comment_text:
            "Missing aria-label on the search input. Screen readers won't know the purpose of this field.",
          issue_category: "accessibility_gap",
        },
        {
          file_path: "src/utils/api.ts",
          line_number: 8,
          comment_text:
            "User input is being inserted directly into the query string without sanitization. This could be a security concern if the API doesn't handle it properly.",
          issue_category: "security_concern",
        },
        {
          file_path: "src/components/UserCard.tsx",
          line_number: 31,
          comment_text:
            "Off-by-one error: the pagination starts at index 0 but the display shows page 1. The slice should be (page * pageSize, (page + 1) * pageSize).",
          issue_category: "logic_bug",
        },
      ];

      for (const rc of reviewData) {
        await supabase.from("review_comments").insert({
          session_id: session.id,
          ...rc,
        });
      }
      console.log(`  ✓ ${reviewData.length} review comments created`);

      // Create dossier with sample scores
      const { error: dossierErr } = await supabase.from("dossiers").insert({
        candidate_id: candidate.id,
        scores: {
          overall: 7.8,
          breakdown: {
            state_management: 8.5,
            component_design: 7.2,
            hooks_usage: 8.0,
            performance: 6.5,
            accessibility: 5.8,
            code_quality: 7.5,
          },
          promptQuality: 4,
          verificationScore: 3,
          independenceRatio: {
            selfWritten: 45,
            modified: 23,
            verbatimAccepted: 32,
          },
          communicationOverall: 7.2,
        },
        profile: {
          recommendation: "hire",
          ai_collaboration_narrative:
            "Alice demonstrated a thoughtful approach to AI collaboration. She used Claude primarily for scaffolding and debugging assistance, writing the core logic — including state management, filter implementation, and event handlers — herself. She modified 68% of AI suggestions before incorporating them, indicating careful code review rather than blind acceptance. Her prompts were specific and contextual, averaging 85 characters with clear problem descriptions. This pattern suggests a developer who views AI as a tool to accelerate known workflows rather than a crutch for unknown territory.",
          strengths: [
            "Strong React fundamentals and hook usage",
            "Thoughtful AI collaboration with high modification rate",
            "Clear communication in code review comments",
            "Good time management across all phases",
          ],
          areas_for_growth: [
            "Accessibility awareness could be stronger",
            "Performance optimization patterns (memoization, virtualization)",
          ],
        },
        summary:
          "Alice demonstrated solid React development skills with a particularly strong showing in state management and component composition. She completed the Tier 3 todo list challenge in 24 of the 30 allocated minutes, spending the remaining time on polish and edge cases. Her approach was methodical — she planned the component structure before coding, used AI assistance strategically for boilerplate, and wrote core business logic independently. During the quickfire round, she answered 7/8 questions correctly with an average response time of 6.6 seconds, demonstrating genuine understanding of her code. Her code review comments were specific and constructive, identifying 5 issues including a subtle off-by-one pagination bug that many candidates miss.",
      });
      if (dossierErr) console.warn("  Dossier warning:", dossierErr.message);
      else console.log("  ✓ Dossier created");
    }
  }

  console.log("\n✅ Seed complete!");
}

seed().catch(console.error);
