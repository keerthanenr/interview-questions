# Session 3: Event Logging, Dashboard & Candidate Dossier

Read the full product spec in /docs/spec.md — sections 4 (all subsections), 5, and 7 are most relevant for this session.

This session wires up the data layer: events start flowing to the database, the hiring manager dashboard shows real data, and the candidate dossier takes shape.

## 1. Event Logging System

The event store is the backbone of the entire product. Every candidate interaction becomes an immutable event that feeds the dossier and scoring.

### Event Logger Utility

Create `/lib/events/logger.ts`:

```typescript
// A server-side utility that writes events to the events table
// Uses the admin Supabase client (service role) since candidates aren't authed users

interface LogEventParams {
  sessionId: string;
  eventType: EventType;
  payload: Record<string, any>;
}

export async function logEvent({ sessionId, eventType, payload }: LogEventParams): Promise<void>
```

- Uses the admin Supabase client (candidates don't have Supabase auth sessions)
- Fire-and-forget pattern — don't await in the critical path if possible. The event write should not block the user experience. Use a try/catch that logs failures to console but doesn't throw.
- Validate that `eventType` is one of the known types from the spec (section 7)

### Event Types to Implement

Create Route Handlers (or modify existing ones) that log events at the right moments. All routes should be under `/app/api/assess/`:

**Build Phase Events:**

`POST /api/assess/events` — Generic event logging endpoint
- Accepts `{ sessionId, eventType, payload }` from the client
- Validates the session exists and is active
- Calls `logEvent`
- Used by client components to log: `prompt_sent`, `code_change`, `claude_output_accepted`

Update the existing `/api/chat/route.ts`:
- After streaming completes, log a `claude_response` event with `{ response_text, tokens_used, model, duration_ms }`
- Log `prompt_sent` here too (server-side, so we have a reliable record even if the client-side call fails)

**Phase Transition Events:**

`POST /api/assess/transition` — Handles moving between phases
- Accepts `{ sessionId, fromPhase, toPhase }`
- Updates the session's `current_phase` in the database
- Logs a `phase_transition` event
- Returns the updated session

**Challenge Events:**

`POST /api/assess/challenge/start` — When a challenge begins
- Accepts `{ sessionId, challengeId, difficultyTier }`
- Logs `challenge_started` event

`POST /api/assess/challenge/submit` — When candidate submits their code
- Accepts `{ sessionId, code, challengeId }`
- Saves to `submissions` table with phase='build'
- Logs `challenge_submitted` event with `{ code, time_elapsed }`
- Returns success

### Wire Up Client-Side Logging

Update the existing assessment components to call these endpoints:

**ClaudeChatPanel.tsx:**
- On message send: POST to `/api/assess/events` with `prompt_sent`
- Claude response events are handled server-side in the chat route

**CodeEditorPanel.tsx:**
- Debounced code change logging (every 10 seconds of inactivity after a change, or on significant diffs): POST to `/api/assess/events` with `code_change` and a diff payload
- Don't log every keystroke — that's too noisy. Snapshot the code state at reasonable intervals.

**When Claude provides code and the candidate modifies it:**
- This is tricky to detect perfectly in MVP. For now, track it simply:
  - When Claude's response contains a code block, store it in component state
  - If the candidate's code changes within 30 seconds of a Claude response, compare the new code to Claude's suggestion
  - Log `claude_output_accepted` with `{ original: claudeCode, modified: currentCode, acceptance_type: 'full' | 'partial' | 'rejected' }`
  - Acceptance type: 'full' if >90% similarity, 'partial' if 20-90%, 'rejected' if <20%
  - This doesn't need to be perfect — it's a heuristic that will be refined later

### Test
- Send a chat message → check the events table for both `prompt_sent` and `claude_response` rows
- Edit code in Sandpack → after debounce, check for `code_change` event
- All events have correct session_id and timestamps

## 2. Session Management

### Starting a Session

Create `/lib/sessions/manager.ts`:

```typescript
export async function startSession(candidateToken: string): Promise<Session>
// - Look up the candidate by token using admin client
// - If candidate status is 'invited', create a new session, update candidate status to 'in_progress', set candidate.started_at
// - If candidate status is 'in_progress', return the existing active session (resume support)
// - If candidate status is 'completed' or 'expired', throw an error
// - Return the session object

export async function getSessionWithCandidate(token: string): Promise<{ session: Session; candidate: Candidate; assessment: Assessment }>
// - Fetch the session along with candidate and assessment data
// - Used by the assessment pages to load context
```

### Wire to Assessment Pages

Update `/app/assess/[token]/page.tsx` (the landing page):
- Server Component that looks up the candidate by token
- If the token is invalid or expired, show an error page
- If the candidate has already completed, show a "You've already completed this assessment" page
- If valid, show the welcome/instructions page with the "Start Assessment" button

Update `/app/assess/[token]/build/page.tsx`:
- Call `startSession` or resume existing session
- Pass session data down to the AssessmentLayout and its child panels
- The session ID is now available for all event logging

### Phase Transition Flow

Update the "Submit & Continue" button in the assessment footer:

**Build → Explain:**
- Capture the final code state from Sandpack
- POST to `/api/assess/challenge/submit` with the code
- POST to `/api/assess/transition` with `{ fromPhase: 'build', toPhase: 'explain' }`
- Redirect to `/assess/[token]/explain`

**Explain → Review:**
- POST to `/api/assess/transition`
- Redirect to `/assess/[token]/review`

**Review → Complete:**
- POST to `/api/assess/transition`
- Update candidate status to 'completed' and set `completed_at`
- Redirect to `/assess/[token]/complete`
- Trigger dossier generation (async — can happen in the background)

## 3. Assessment Creation & Candidate Invitation

### Create Assessment Page (`/app/(dashboard)/dashboard/new/page.tsx`)

A form that lets hiring managers create a new assessment:

- **Title** — text input (e.g., "Senior React Developer - Q1 2026")
- **Challenge Pool** — for MVP, just offer a single preset pool ("React Fundamentals — 5 challenges, Tiers 1–5"). Show the challenge names and difficulty levels as a read-only list so they know what candidates will face. We'll add custom pool selection in V2.
- **Settings:**
  - Time limit toggle: "Use default time limits" (checked by default) or custom override
  - Adaptive difficulty: on/off toggle (default on — but since we haven't built the engine yet, this is just stored as a setting)
- **Submit** — creates the assessment in the database and redirects to the dashboard

### Invite Candidates

On the dashboard, each assessment should have an "Invite Candidate" action:

Create a modal or inline form:
- **Candidate email** — text input (required)
- **Candidate name** — text input (optional)
- On submit:
  - Generate a unique token (use `crypto.randomUUID()` or a nanoid — something URL-safe and unguessable)
  - Create a row in `candidates` table with status 'invited'
  - For MVP, just display the assessment link (`{APP_URL}/assess/{token}`) for the hiring manager to copy and send manually
  - V2 will add automated email sending via Resend/SendGrid

### Assessment List on Dashboard

Update `/app/(dashboard)/dashboard/page.tsx`:
- Fetch all assessments for the current user's org
- Display as a table or card list:
  - Assessment title
  - Created date
  - Number of candidates (invited / in progress / completed)
  - Status badge (active / paused / archived)
- Each row links to a detail view or expands to show candidates
- Each assessment has actions: "Invite Candidate", "Pause", "Archive"
- For each assessment, show its candidates with:
  - Candidate name/email
  - Status badge (invited / in progress / completed)
  - "View Dossier" link (only if completed) → `/dashboard/candidate/[id]`

## 4. Candidate Dossier View

Build the dossier page at `/app/(dashboard)/dashboard/candidate/[id]/page.tsx`. This is the primary deliverable to hiring managers (section 5 of the spec).

### Data Fetching
- Server Component that fetches:
  - Candidate details
  - Their session(s)
  - All events for their session
  - Their submissions, quickfire responses, and review comments
  - Their generated dossier (if it exists)

### Dossier Layout

The page should have clear sections as described in section 5.1 of the spec:

**Header:**
- Candidate name and email
- Assessment title
- Date completed
- Overall status/recommendation (generated later — placeholder for now)

**Technical Proficiency Score:**
- Overall score (1–10) displayed prominently
- Breakdown by topic area as a radar chart or bar chart (use Recharts — already available in artifacts, install it: `npm install recharts`)
- Challenge completion summary: which challenges they attempted, time taken, pass/fail

**AI Collaboration Profile:**
- Prompt quality rating (1–5 scale)
- Verification behavior score (1–5 scale)
- Independence ratio displayed as a percentage bar: "Wrote 45% / Modified AI output 23% / Accepted AI verbatim 32%"
- A narrative summary paragraph (generated by Claude — see scoring section below)

**Code Comprehension Score:**
- Quickfire round accuracy: X/Y correct
- Breakdown by question type (multiple choice vs. free text)
- Average response time
- List of each question, the candidate's answer, correct answer, and time taken

**Communication & Collaboration Profile:**
- MR review quality score
- Number of issues found vs. total seeded issues
- Breakdown by issue category (bugs found, performance issues caught, a11y gaps identified, etc.)
- Sample review comments (show the best and worst ones)

**Behavioral Insights:**
- Timeline visualization showing activity across the assessment (when they were coding vs. chatting with Claude vs. idle)
- Key observations (generated by Claude — see scoring section below)

**For sections that require generated content (narratives, AI analysis), show placeholder text for now like "[AI-generated summary will appear here]". We'll build the generation in step 5.**

### Test
- Navigate to `/dashboard/candidate/[id]` for a completed candidate
- All sections render with real data from the database
- Charts render correctly with Recharts

## 5. Basic Scoring Algorithms

Create the scoring logic in `/lib/scoring/`. These are the V1 heuristics — simple and rule-based. They'll be refined based on design partner feedback.

### Technical Proficiency Score (`/lib/scoring/technical.ts`)

```typescript
export function calculateTechnicalScore(data: {
  challengeResults: { tier: number; completed: boolean; timeUsed: number; timeLimit: number }[];
  quickfireResults: { correct: boolean; difficulty: number }[];
  reviewIssuesFound: number;
  reviewIssuesTotal: number;
}): { overall: number; breakdown: Record<string, number> }
```

Scoring logic:
- Challenge completion: Each completed challenge contributes points weighted by tier (tier 1 = 1 point, tier 5 = 5 points). Max possible = sum of all tiers attempted.
- Time efficiency bonus: If completed in under 60% of time limit, multiply challenge points by 1.2
- Quickfire accuracy: (correct / total) × 10, weighted by difficulty
- MR review: (issues found / issues total) × 10
- Overall = weighted average: challenges 40%, quickfire 35%, review 25%
- Normalize to 1–10 scale

### AI Collaboration Score (`/lib/scoring/collaboration.ts`)

```typescript
export function calculateCollaborationScore(events: Event[]): {
  promptQuality: number;
  verificationScore: number;
  independenceRatio: { selfWritten: number; modified: number; verbatimAccepted: number };
}
```

Scoring logic:
- **Prompt quality (1–5):** Based on average prompt length and specificity. Short vague prompts ("fix this") score 1–2. Prompts with context, specific questions, and code references score 4–5. Use simple heuristics: length > 50 chars, contains code blocks, asks specific questions.
- **Verification score (1–5):** Based on `claude_output_accepted` events. High verbatim acceptance rate (>70%) = 1–2. High modification rate (>50%) = 4–5.
- **Independence ratio:** Calculate from events. Percentage of final code that was hand-written vs. modified from Claude vs. accepted verbatim from Claude.

### Communication Score (`/lib/scoring/communication.ts`)

```typescript
export function calculateCommunicationScore(reviewComments: ReviewComment[]): {
  overall: number;
  clarity: number;
  constructiveness: number;
  specificity: number;
}
```

For MVP, this uses simple heuristics:
- **Clarity:** Average comment length. Too short (<20 chars) = low. Too long (>500 chars) = slightly lower. Sweet spot 50–200 chars = high.
- **Constructiveness:** Does the comment suggest a fix? Check for keywords like "instead", "should", "consider", "try", "fix by". More suggestions = higher score.
- **Specificity:** Does the comment reference specific code? Check for keywords like "line", "function", "variable", code-like tokens. More specific = higher score.
- Overall = average of the three

### Dossier Generation (`/lib/scoring/dossier.ts`)

```typescript
export async function generateDossier(candidateId: string): Promise<void>
```

This function:
1. Fetches all session data, events, submissions, quickfire responses, and review comments for the candidate
2. Runs the three scoring functions above
3. Calls the Claude API to generate narrative sections:
   - Send all the raw data + scores to Claude with a system prompt asking it to write the AI Collaboration Profile narrative and Behavioral Insights summary
   - System prompt should instruct Claude to be objective, specific, and cite actual examples from the candidate's session
4. Saves everything to the `dossiers` table (scores as JSON, profile as JSON, summary as text)

Put the dossier generation system prompt in `/lib/claude/prompts.ts`:

```
You are an expert technical hiring analyst. Given the following data from a candidate's React assessment, write two sections:

1. AI COLLABORATION PROFILE (1 paragraph): Describe how the candidate worked with the AI assistant. Reference specific patterns — did they verify output, modify suggestions, write core logic themselves? What does their prompting style reveal about their development approach?

2. BEHAVIORAL INSIGHTS (1 paragraph): Describe the candidate's working patterns. How did they allocate time? Did they plan before coding or dive in? How did they handle difficulty increases? What does their debugging strategy look like?

Be specific and evidence-based. Reference actual numbers from the data (e.g., "modified 68% of AI output", "completed the tier 3 challenge in 12 of 20 allocated minutes"). Avoid generic statements.

Candidate data:
{candidateData}
```

### Trigger Dossier Generation

- When a candidate completes the assessment (Review → Complete phase transition), trigger `generateDossier` asynchronously
- Don't block the candidate's completion screen — generation can take a few seconds
- On the dossier page, if the dossier hasn't been generated yet, show a "Generating dossier..." loading state with a polling mechanism or just a refresh prompt

### Test
- Complete a full assessment flow (can be done manually or with test data seeded directly)
- Check that the dossier page shows real scores
- Check that the Claude-generated narratives appear after generation completes

## 6. Seed Test Data

Create a seed script at `/scripts/seed.ts` (runnable with `npx tsx scripts/seed.ts`):

- Creates a test organization
- Creates a test user (you'll link this to your actual Supabase auth user)
- Creates a test assessment
- Creates 2–3 test candidates with sessions, events, submissions, and sample data
- At least one candidate should be in 'completed' status with full data across all phases so the dossier page has something to render

This is critical for development — you need to be able to see the dashboard and dossier pages with realistic data without manually running through the full assessment every time.

## What NOT to do in this session
- Don't build the quickfire UI (session 4)
- Don't build the MR review UI (session 4)
- Don't implement the adaptive difficulty engine (session 5)
- Don't build session replay / timeline visualization (session 5)
- Don't integrate Stripe
- Don't build the landing page
- Don't build email sending for invitations
- Don't optimize the scoring algorithms — these are V1 heuristics, they will be wrong, that's fine
