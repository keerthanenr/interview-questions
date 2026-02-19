# Session 4: Quickfire Phase, MR Review Phase & Challenge Content

Read the full product spec in /docs/spec.md — sections 4.2 (Explain phase), 4.3 (Review phase), and 8 (Challenge Pool) are critical for this session.

By the end of this session, a candidate can complete the entire three-phase assessment end to end: Build → Explain → Review → Complete.

## 1. Question Generation API

Before building the quickfire UI, we need the backend that generates questions from the candidate's submitted code.

### Route Handler: `/app/api/assess/questions/generate/route.ts`

- Accepts POST with `{ sessionId, code }`
- Fetches the candidate's session and the challenge they completed
- Sends the candidate's code to the Claude API with the question generation system prompt from section 4.2 of the spec (already in `/lib/claude/prompts.ts` from session 1)
- Parses Claude's JSON response into a structured array of questions
- Saves the generated questions to the session metadata (or a new column — store them so we don't regenerate on page refresh)
- Returns the questions array

### Question Schema

```typescript
interface QuickfireQuestion {
  id: string;
  type: 'multiple_choice' | 'free_text' | 'consequence_prediction' | 'bug_identification';
  difficulty: 1 | 2 | 3;
  question: string;
  codeReference?: string; // specific line or snippet the question is about
  timeLimitSeconds: number; // 10-20 depending on type
  options?: { // only for multiple_choice
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correctAnswer?: string; // 'a'|'b'|'c'|'d' for MC, expected answer summary for free text
  gradingCriteria?: string; // for free text — what Claude should look for when grading
}
```

### Question Generation Prompt

Update `/lib/claude/prompts.ts` — refine the prompt from the spec to enforce the JSON output format:

```
You are a senior React interviewer. Analyze the following candidate-submitted React code and generate exactly 10 targeted questions that test whether the candidate truly understands their implementation.

Question distribution:
- 4 multiple choice questions (timeLimitSeconds: 12)
- 3 short free text questions (timeLimitSeconds: 20)
- 2 consequence prediction questions (timeLimitSeconds: 15)
- 1 bug identification question (timeLimitSeconds: 15)

Requirements for questions:
- Questions MUST be about the candidate's specific code, not generic React trivia
- Reference specific hooks, functions, variable names, or line patterns from their code
- Cover: why specific hooks were chosen, what happens under edge cases, performance implications, alternative approaches, what would break if specific lines were changed
- Multiple choice options should be plausible — no obviously wrong answers
- Free text questions should have clear grading criteria
- Difficulty should range from 1 (straightforward) to 3 (requires deep understanding)

For the bug identification question: describe a specific subtle modification to their code and ask what would break. Do NOT include the actual bug in the question — describe the change in words (e.g., "If the dependency array on line 15's useEffect were changed to an empty array, what would happen?").

Return ONLY a JSON array of question objects with this exact schema:
{
  "id": "q1",
  "type": "multiple_choice" | "free_text" | "consequence_prediction" | "bug_identification",
  "difficulty": 1 | 2 | 3,
  "question": "the question text",
  "codeReference": "the relevant code snippet or line description",
  "timeLimitSeconds": number,
  "options": { "a": "...", "b": "...", "c": "...", "d": "..." },  // only for multiple_choice
  "correctAnswer": "a" | "b" | "c" | "d" | "expected answer summary",
  "gradingCriteria": "what to look for in the answer"  // for free_text types
}

No markdown, no preamble, no explanation. Only the JSON array.

Candidate's code:
```

### Error Handling
- If Claude returns malformed JSON, retry once with a stricter prompt
- If it fails again, fall back to a set of 5 generic React questions (store these in `/data/fallback-questions.json` as a safety net)
- Log question generation failures as events so you can monitor quality

## 2. Quickfire Phase UI

### Page: `/app/assess/[token]/explain/page.tsx`

This is a Server Component that:
- Fetches the session and validates the candidate is in the 'explain' phase
- If questions haven't been generated yet, triggers generation from the candidate's submitted code
- Passes questions to the client component

### Component: `/components/assessment/QuickfireRound.tsx`

This is the core quickfire experience. Mark as `'use client'`.

**State machine for the round:**
```
INTRO → QUESTION_ACTIVE → QUESTION_TRANSITION → (repeat) → ROUND_COMPLETE
```

**Intro screen (5 seconds):**
- "Quickfire Round"
- "You'll answer 10 questions about the code you just wrote"
- "Each question is timed — answer as quickly and accurately as you can"
- "Ready?" with a countdown 3...2...1... then auto-advance to the first question
- This screen sets expectations and gives the candidate a moment to breathe after the build phase

**Question screen:**
- The question text displayed prominently at the top
- If there's a `codeReference`, show it in a styled code block below the question
- A countdown timer bar that visually drains from full to empty (like a progress bar shrinking). Use a CSS animation or requestAnimationFrame — should feel smooth, not ticking.
- The timer also shows seconds remaining as a number

**For multiple choice questions:**
- 4 option buttons (A, B, C, D) laid out in a 2x2 grid
- Clicking an option immediately submits the answer and advances (no confirm button)
- Keyboard shortcuts: press 1/2/3/4 or A/B/C/D to select
- After selection, briefly flash green/red to indicate correct/incorrect (200ms) before advancing

**For free text questions:**
- A textarea with character count
- A "Submit" button (also submittable with Cmd/Ctrl+Enter)
- Timer still running — if time expires, whatever they've typed is submitted automatically

**For consequence prediction:**
- Same as free text but with the question framed as a scenario

**For bug identification:**
- Same as free text but the question describes a code modification

**When time expires:**
- For multiple choice: auto-submit with no answer (marked incorrect)
- For free text: auto-submit whatever is in the textarea (even if empty)
- Show a brief "Time's up" indicator before moving to the next question

**Question transition (1 second):**
- Brief pause between questions showing "Question X of 10"
- Prevents disorientation from instant switches

**After each answer, POST to:**

`POST /api/assess/quickfire/answer`
- Accepts `{ sessionId, questionIndex, response, responseTimeMs, isCorrect }`
- Saves to `quickfire_responses` table
- Logs `quickfire_answered` event

For multiple choice, `isCorrect` is determined client-side (compare selection to correctAnswer).
For free text, `isCorrect` is null — it will be graded later by Claude.

**Round complete screen:**
- "Quickfire round complete!"
- Show a brief summary: "You answered X/Y multiple choice questions correctly"
- Don't show free text results (they haven't been graded yet)
- "Continue to Code Review" button → triggers phase transition to review

### Free Text Grading

Create `/app/api/assess/quickfire/grade/route.ts`:
- Called after the quickfire round completes (can be async / non-blocking)
- Fetches all free text responses for the session
- Sends each response to Claude with the question, the candidate's answer, and the grading criteria
- Claude returns a JSON `{ correct: boolean, score: number (0-1), feedback: string }`
- Updates the `quickfire_responses` rows with the graded results
- This runs in the background — the candidate doesn't wait for it

Grading prompt (add to `/lib/claude/prompts.ts`):
```
You are grading a candidate's response to a timed technical question about React code they wrote.

Question: {question}
Candidate's code context: {codeReference}
Candidate's answer: {response}
Time taken: {responseTimeMs}ms
Grading criteria: {gradingCriteria}

Grade this response. Return ONLY a JSON object:
{
  "correct": true/false (is the answer substantially correct?),
  "score": 0.0 to 1.0 (how complete and accurate is the answer?),
  "feedback": "brief explanation of what they got right/wrong"
}

Be generous with partial credit. The candidate was under time pressure (15-20 seconds). A correct but poorly worded answer should still score > 0.5. Only mark as incorrect if the answer demonstrates a fundamental misunderstanding.
```

### Test
- Complete the build phase and submit → redirected to explain phase
- Questions load (generated from the submitted code)
- Timer counts down smoothly
- Multiple choice: clicking an option submits and advances
- Free text: typing and submitting works, auto-submits on timeout
- All responses are saved to the database
- Round complete screen shows MC accuracy
- Phase transition to review works

## 3. MR Review Phase UI

### Page: `/app/assess/[token]/review/page.tsx`

Server Component that:
- Fetches the session and validates the candidate is in the 'review' phase
- Loads the MR review scenario for this assessment
- Passes the diff data and issue metadata to the client component

### Review Scenario Data

Create `/data/review-scenarios/react-dashboard-mr.json`:

This is a pre-built merge request with intentional issues seeded in. The MR should tell a story — it's a "junior developer's PR to add a user dashboard component". Create a realistic diff that contains:

```typescript
// Structure of the scenario file
{
  "id": "react-dashboard-mr",
  "title": "Add user dashboard component",
  "description": "This MR adds a new dashboard component that displays user stats, recent activity, and notification preferences. Please review the changes and leave your feedback.",
  "author": "junior-dev",
  "files": [
    {
      "path": "src/components/Dashboard.jsx",
      "language": "jsx",
      "hunks": [
        {
          "oldStart": 1,
          "newStart": 1,
          "lines": [
            // Array of diff lines with type: 'added' | 'removed' | 'context'
            // and content: the actual code
          ]
        }
      ]
    }
  ],
  "seededIssues": [
    {
      "id": "issue-1",
      "category": "logic_bug",
      "file": "src/components/Dashboard.jsx",
      "lineRange": [45, 48],
      "description": "Off-by-one error in pagination calculation",
      "severity": "high"
    }
    // ... more issues
  ]
}
```

**Seed exactly these issues (from section 4.3 of the spec):**

1. **Logic bug (high severity):** Off-by-one error in pagination — `items.slice(page * pageSize, page * pageSize + pageSize)` where page starts at 1 instead of 0, so the first page skips the first `pageSize` items.

2. **Performance anti-pattern (high severity):** Creating a new object inside the render function and passing it as a prop, causing unnecessary re-renders. E.g., `<ChildComponent style={{ color: 'red' }} data={items.filter(i => i.active)} />` — both the style object and the filtered array are recreated every render.

3. **State management issue (medium severity):** Storing derived state that should be computed. E.g., `const [filteredItems, setFilteredItems] = useState([])` with a useEffect that updates it whenever `items` or `filter` changes — should just be `const filteredItems = useMemo(...)`.

4. **Accessibility gap (medium severity):** A clickable div with an onClick handler but no `role="button"`, no `tabIndex`, no keyboard handler, and no aria-label. Also an image without alt text.

5. **Security concern (high severity):** Using `dangerouslySetInnerHTML={{ __html: user.bio }}` to render user-provided content without sanitization.

6. **Code style (low severity):** Inconsistent naming (mix of camelCase and snake_case), a TODO comment left in, and no error boundary wrapping the dashboard.

Write the actual JSX code for this MR. It should be ~150-200 lines of realistic but flawed React code. Make the issues discoverable but not obvious — a good candidate should find 4-5 of the 6 issues, an excellent candidate finds all 6.

### Component: `/components/assessment/MRReviewPanel.tsx`

`'use client'` component. This replaces the three-panel layout — the review phase is a different UI.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  Review Header                                        │
│  PR Title: "Add user dashboard component"             │
│  Author: junior-dev  |  Files changed: 2              │
├──────────────────────────────────────────────────────┤
│  Overall Review Summary (textarea)                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Diff View                                           │
│  - Line numbers (old + new)                          │
│  - Syntax highlighted diff                           │
│  - Click any line to add a comment                   │
│  - Inline comments appear below the line             │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Your Comments (X)  |  Submit Review                 │
└──────────────────────────────────────────────────────┘
```

**Diff viewer:**
- Use `react-diff-viewer-continued` (installed in session 2)
- Show the diff with syntax highlighting
- Old code (red/removed) and new code (green/added) with context lines
- Line numbers for both old and new files

**Inline commenting:**
- Clicking on a line number (or a "+" icon on hover) opens a comment input below that line
- Comment input: a textarea + "Add Comment" button + "Cancel" button
- After adding a comment, it appears inline below the line with the candidate's text and a small badge showing the line number
- Candidates can add multiple comments and edit/delete them before submitting
- Each comment is stored in component state until the review is submitted

**Overall review summary:**
- A textarea at the top where the candidate writes their overall assessment of the MR
- Prompt text: "Write your overall review of this merge request. Summarize the key issues you found and your recommendation (approve, request changes, or reject)."

**Comment sidebar (optional but nice):**
- A collapsible right panel or bottom panel listing all comments added so far
- Shows count: "5 comments"
- Each entry shows the line number, file, and a preview of the comment text
- Clicking an entry scrolls the diff to that line

**Submit review:**
- "Submit Review" button at the bottom
- On submit:
  - POST each comment to `/api/assess/review/comment` which saves to `review_comments` table and logs `review_comment_added` events
  - POST the overall summary to `/api/assess/review/submit` which saves to `submissions` table with phase='review'
  - Trigger phase transition to 'complete'
  - Redirect to `/assess/[token]/complete`

### Route Handlers

`POST /api/assess/review/comment`
- Accepts `{ sessionId, filePath, lineNumber, commentText }`
- Saves to `review_comments` table
- Logs `review_comment_added` event with `{ line_number, comment_text }`
- Returns the saved comment

`POST /api/assess/review/submit`
- Accepts `{ sessionId, summaryText, comments: [...] }`
- Saves summary to `submissions` table
- Batch-saves all comments to `review_comments` if not already saved individually
- Auto-categorizes comments by matching line numbers to seeded issues (uses the `seededIssues` data from the scenario). If a comment's line number falls within an issue's `lineRange`, tag it with that `issue_category`.
- Logs events
- Triggers phase transition
- Kicks off dossier generation (async)

### Test
- Complete explain phase → redirected to review
- Diff renders correctly with syntax highlighting
- Can click on lines to add comments
- Comments appear inline below the relevant line
- Can write an overall summary
- Submitting saves everything to the database
- Comments are matched to seeded issues
- Phase transitions to complete

## 4. Completion Screen

Update `/app/assess/[token]/complete/page.tsx`:

- A clean, reassuring completion page:
  - "Assessment Complete — Thank You!"
  - "Your results have been submitted and are being reviewed by the hiring team."
  - "What happens next:" section explaining the hiring manager will review their dossier
  - Estimated timeline (e.g., "You should hear back within X days" — make this configurable per assessment in V2, hardcode "a few days" for now)
- Optional: a brief post-assessment survey (2-3 questions):
  - "Did this assessment reflect how you actually work?" (1-5 scale)
  - "How fair did you find this assessment?" (1-5 scale)
  - "Any feedback for us?" (free text)
  - Save responses to a new `survey_responses` table or just as events
- Do NOT show the candidate their scores or dossier — that's only for the hiring manager

## 5. Challenge Content

Create the first 3 challenges from section 8 of the spec. Each challenge is a JSON file in `/data/challenges/`.

### Challenge 1: Interactive Todo List (Tier 1 — Easy)

`/data/challenges/todo-list.json`:

```typescript
{
  "id": "todo-list",
  "title": "Interactive Todo List",
  "tier": 1,
  "timeLimit": 15, // minutes
  "topics": ["useState", "event_handling", "list_rendering", "conditional_styling"],
  "description": "Build an interactive todo list component with the following features...",
  "requirements": [
    "Add new todos via a text input and submit button (or Enter key)",
    "Display todos in a list with the todo text and a completion toggle",
    "Clicking a todo toggles its completed state (with visual styling — e.g., strikethrough)",
    "A delete button on each todo removes it from the list",
    "Show a count of remaining (uncompleted) todos",
    "Empty input should not add a todo"
  ],
  "starterCode": {
    "App.js": "import React from 'react';\n\nexport default function App() {\n  return (\n    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>\n      <h1>Todo List</h1>\n      {/* Build your todo list here */}\n    </div>\n  );\n}"
  },
  "testCases": [
    "Renders an input field and an add button",
    "Adding a todo displays it in the list",
    "Toggling a todo shows it as completed with strikethrough",
    "Deleting a todo removes it from the list",
    "Shows correct count of remaining todos",
    "Empty input does not add a todo"
  ]
}
```

### Challenge 2: Data Fetching Dashboard (Tier 2 — Medium)

`/data/challenges/data-dashboard.json`:

- Fetch data from a mock API (use a hardcoded JSON response or `https://jsonplaceholder.typicode.com/users` — Sandpack can make fetch calls)
- Display loading state while fetching
- Display error state if fetch fails
- Render the data in a formatted table or card grid
- Add a search/filter input that filters results client-side
- Handle empty results state

Requirements should test: `useEffect`, `async/await`, loading/error state management, data transformation, conditional rendering.

Starter code: Basic App component with a comment indicating where to fetch data and a hint about the API endpoint.

### Challenge 3: Form with Validation (Tier 3 — Medium)

`/data/challenges/form-validation.json`:

- Build a registration form with: name, email, password, confirm password fields
- Real-time validation:
  - Name: required, minimum 2 characters
  - Email: required, valid email format
  - Password: required, minimum 8 characters, must contain a number and a letter
  - Confirm password: must match password
- Show validation errors below each field as the user types (with debounce) or on blur
- Disable submit button until all fields are valid
- On submit, show a success message with the submitted data
- Extract validation logic into a custom hook (`useFormValidation`)

Requirements should test: controlled components, custom hooks, form state management, validation logic, error display patterns.

### Challenge Loader Utility

Create `/lib/challenges/loader.ts`:

```typescript
export async function getChallenge(challengeId: string): Promise<Challenge>
// Loads challenge from /data/challenges/{id}.json

export async function getChallengePool(poolId?: string): Promise<Challenge[]>
// Returns all challenges sorted by tier. Pool filtering is for V2.

export async function getChallengeForSession(session: Session): Promise<Challenge>
// Determines which challenge to serve based on the session state.
// For MVP without the adaptive engine: just serve challenges in order (tier 1, then tier 2, etc.)
// When adaptive engine is built (session 5), this function will use performance data to select.
```

### Wire Challenges to the Build Phase

Update the build phase page and components:
- Load the challenge based on the session state (first challenge for a new session)
- Pass challenge data to the ChallengePanel (left panel) — title, description, requirements
- Load the challenge's starter code into Sandpack
- The timer in the header should use the challenge's `timeLimit`
- When the timer expires, auto-submit and transition to explain phase (same as manual submit)

### Test the Full Flow

At this point, the entire assessment should work end to end:

1. Hiring manager creates an assessment and invites a candidate
2. Candidate opens the assessment link → sees welcome page
3. Clicks "Start Assessment" → enters Build phase with Todo List challenge
4. Codes in Sandpack, chats with Claude, events are logged
5. Clicks "Submit" → code is submitted, questions are generated
6. Enters Quickfire round → answers 10 timed questions
7. Quickfire complete → enters MR Review phase
8. Reviews the diff, adds inline comments, writes summary
9. Submits review → sees completion screen
10. Hiring manager views the dossier with real data and scores

Run through this full flow manually at least once. Fix any breakages in transitions, data flow, or UI state.

## What NOT to do in this session
- Don't build the adaptive difficulty engine (session 5)
- Don't create challenges 4 and 5 (Virtualized Infinite Scroll, Collaborative Counter) — save for session 5
- Don't build session replay or timeline visualization
- Don't integrate Stripe or build the landing page
- Don't add email sending for invitations
- Don't spend time making the MR review scenario perfect — it needs to be realistic and contain the right issues, but it can be polished later
- Don't build the post-assessment survey (marked optional above — skip if time is tight)
