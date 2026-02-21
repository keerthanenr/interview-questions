# ReactAssess Platform Audit

> Generated 2026-02-21 — Comprehensive audit of the current codebase state.

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15.5.9, React 19, TypeScript 5.6.3 |
| **Database** | PostgreSQL via Drizzle ORM 0.34.0 |
| **Auth** | Supabase Auth + SSR (`@supabase/ssr` 0.8.0) |
| **AI** | Anthropic Claude (`@anthropic-ai/sdk` 0.78.0), model `claude-sonnet-4-20250514` |
| **Payments** | Stripe (v20.3.1 backend, v8.7.0 frontend) |
| **Styling** | Tailwind CSS 4.1.13, shadcn/ui (Radix primitives), Framer Motion |
| **Fonts** | Space Grotesk (display), IBM Plex Sans (body) |
| **Hosting** | Vercel (configured with file tracing) |
| **Package manager** | pnpm 9.12.3 |
| **Linter** | Biome 2.2.2 (Ultracite preset) |

---

## 2. Code Editor / Sandbox

**Sandpack** (`@codesandbox/sandpack-react` v2.20.0) — CodeSandbox's browser-based bundler/sandbox. Not Monaco or CodeMirror. Located in `components/assessment/CodeEditorPanel.tsx`.

---

## 3. Live Preview

**Yes.** The `CodeEditorPanel` provides a full split-screen IDE:

- **Left:** `SandpackCodeEditor` with line numbers, tabs, syntax highlighting
- **Right:** `SandpackPreview` with live auto-rendering as code changes
- **Bottom tabs:** Console output, a simulated terminal, and a Claude chat panel
- Configured with `template="react"`, `autorun: true`, `autoReload: true`

---

## 4. Assessment Flow

Three-phase sequential workflow — not just "write code, submit":

### Phase 1: Build (`/assess/[token]/build`)
- Candidate solves **3 adaptive coding challenges** in the Sandpack editor
- Claude is available as a pair programmer
- Challenges escalate/de-escalate difficulty based on performance via an adaptive engine
- Each challenge is timed (15–20 min), build phase capped at 30 min total

### Phase 2: Explain (`/assess/[token]/explain`)
- Claude generates **10 targeted questions** from the candidate's submitted code
- Mix of multiple-choice, free-text, consequence, and bug-identification questions
- Responses are timed and graded by Claude
- ~12 min total

### Phase 3: Review (`/assess/[token]/review`)
- Candidate reviews a pre-built merge request (`react-dashboard-mr.json`) containing **6 seeded bugs** (logic, performance, state, a11y, XSS, style)
- They leave inline comments; system auto-categorizes comments against seeded issues
- ~15 min total

### Post-Assessment
- Completion page triggers dossier generation (fire-and-forget)

---

## 5. Test Cases

Test cases exist as **descriptive requirements** in challenge JSON files (e.g., `data/challenges/todo-list.json`):

```json
"testCases": [
  "Renders an input field and an add button",
  "Adding a todo displays it in the list",
  "Toggling a todo shows it as completed with strikethrough"
]
```

These are **not executable tests**. There is no Jest, Vitest, or any test runner in the project. No `"test"` script in `package.json`. When a candidate types `npm test` in the simulated terminal, they get:

> "No test runner configured in this sandbox."

---

## 6. Test Runner — What's Missing

There is **no automated test execution**. Code evaluation is entirely heuristic + AI-based:

- **Code Quality Scoring** (`lib/adaptive/quality.ts`) — regex pattern matching for challenge-specific keywords (`useState`, `.map()`, `useEffect`, etc.), code structure analysis, length checks, syntax balance. Returns a 0–1 score.
- **AI Reliance Scoring** (`lib/adaptive/reliance.ts`) — tracks how much Claude-generated code the candidate accepted verbatim. Flags high reliance (>0.7).
- **Claude Grading** — grades freeform quickfire responses via API.
- **Review Auto-Categorization** — matches comment line numbers against seeded issue ranges.

The platform is **process-driven** (evaluating *how* candidates solve problems) rather than **solution-verification** (running tests to check correctness). If the goal is to actually execute test cases against candidate code, that's the biggest infrastructure gap.

---

## 7. AI Integration

**Fully integrated.** Claude is used in four ways:

| Use Case | Entry Point |
|----------|-------------|
| **Pair programming** during Build phase | Streaming chat via `POST /api/chat` |
| **Question generation** from submitted code | `lib/claude/client.ts` → `generateQuestions()` |
| **Response grading** for freeform answers | `lib/claude/client.ts` → `gradeResponse()` |
| **Dossier generation** for candidate evaluations | `lib/scoring/dossier.ts` |

System prompts defined in `lib/claude/prompts.ts` with specific personas for each context.

---

## 8. Chat Panel

**Fully built.** `components/assessment/ClaudeChatPanel.tsx` includes:

- Real-time streaming of Claude responses
- Markdown rendering with code block support
- Auto-expanding textarea input (Enter to send, Shift+Enter for newline)
- Code extraction from Claude responses with similarity tracking
- Integration with the editor to detect when Claude-suggested code is accepted/modified/rejected (full >0.9, partial 0.2–0.9, rejected <0.2)
- Rendered as a bottom tab in the code editor panel

---

## 9. Auth and User Accounts

**Fully set up** via Supabase Auth:

- Email/password sign-up and login
- Google OAuth
- Auth pages at `/login` and `/signup`
- OAuth callback handler at `/auth/callback` (auto-creates org + user records)
- Middleware refreshes sessions on every request and protects dashboard routes
- User roles: `admin`, `manager`, `recruiter`

---

## 10. Hiring Manager Dashboard

**Yes — the platform is primarily recruiter-facing** with a candidate assessment flow:

- **Dashboard** at `/dashboard` — assessment management, candidate tracking with status badges
- **Candidate detail** at `/dashboard/candidate/[id]`:
  - Technical proficiency scores with breakdowns
  - AI collaboration profile (prompt quality, verification, independence ratio)
  - Code comprehension metrics
  - Communication scores
  - Behavioral insights (code changes, AI interactions, acceptances)
  - Session replay (gated behind Professional billing tier — **not yet built**)
- **Billing** at `/dashboard/billing` for subscription management
- **Invite management** — `InviteCandidateButton` and `CopyLinkButton` components

---

## 11. Behavioral Data Logging

**Comprehensive event logging already in place:**

- **Event system:** `lib/events/logger.ts` + `POST /api/assess/events` — immutable insert-only `events` table
- **Events tracked:**
  - `prompt_sent` — candidate prompt to Claude
  - `claude_response` — Claude's response with model info and timing
  - `code_change` — code modifications
  - `claude_output_accepted` — AI code acceptance (full/partial/rejected)
  - `challenge_started` / `challenge_submitted`
  - `quickfire_answered`
  - `review_comment_added`
  - `phase_transition`
- **Response times** captured in `quickfire_responses` table
- **No ambient monitoring** — no keystroke-level tracking or idle detection; all action-based

---

## 12. What's Done vs What's Missing

### Closest to Done

| Feature | Status |
|---------|--------|
| Build Phase / Code Editor | Fully wired — Sandpack, live preview, Claude chat, adaptive challenges, event logging |
| Auth + Dashboard | Login/signup, role-based access, candidate detail pages, scoring breakdowns |
| Review Phase | Seeded-bug MR scenario with auto-categorization |
| Explain Phase (Quickfire) | Claude-generated questions, timed responses, grading |
| Event Logging | Comprehensive behavioral tracking |
| Billing | Stripe integration with webhooks |
| Landing Page | Full marketing site with animations and pricing |
| Challenge Pool | 5 handcrafted challenges across tiers 1–5 |

### Biggest Gaps

| Gap | Details |
|-----|---------|
| **No test runner** | Test cases are descriptive strings, not executable assertions. No mechanism to validate code correctness beyond heuristic pattern matching. |
| **No `node_modules`** | Dependencies haven't been installed — project hasn't been run locally. |
| **Heuristic scoring** | `quickCodeQualityScore` is regex-based; could be fooled. No AST analysis or actual code execution. |
| **Session replay** | Referenced in dashboard UI (gated behind Professional plan) but not implemented. |
| **Privacy/Terms** | Placeholder routes, no content. |
| **Custom challenge builder** | Not implemented (Enterprise feature). |
| **ATS integrations** | Not implemented (Enterprise feature). |
| **ML-based adaptive engine** | Current engine is rule-based; spec says ML is V2. |

---

## Database Schema

| Table | Key Columns |
|-------|-------------|
| `organizations` | id, name, plan (starter/professional/enterprise), stripe_customer_id |
| `users` | id, org_id, email, full_name, role |
| `assessments` | id, org_id, title, challenge_pool[], settings, status |
| `candidates` | id, assessment_id, email, full_name, token (unique), status, timestamps |
| `sessions` | id, candidate_id, current_phase, metadata, timestamps |
| `events` | id, session_id, event_type, payload (JSONB), created_at |
| `submissions` | id, session_id, phase, code, metadata |
| `quickfire_responses` | id, session_id, question_index, question (JSONB), response, is_correct, response_time_ms |
| `review_comments` | id, session_id, file_path, line_number, comment_text, issue_category |
| `dossiers` | id, candidate_id (unique), scores (JSONB), profile (JSONB), summary, generated_at |

---

## Key File Locations

```
app/
├── (auth)/login, signup          # Auth pages
├── (dashboard)/dashboard/        # Hiring manager dashboard
├── assess/[token]/               # Candidate assessment flow (build, explain, review, complete)
├── api/assess/                   # Assessment API routes
├── api/chat/                     # Claude streaming endpoint
├── api/stripe/                   # Billing endpoints

components/
├── assessment/                   # CodeEditorPanel, ClaudeChatPanel, QuickfireRound, MRReviewPanel
├── dashboard/                    # Dashboard shell, invite, billing, dossier charts
├── ui/                           # shadcn/ui base components

lib/
├── adaptive/                     # engine.ts, quality.ts, reliance.ts
├── claude/                       # client.ts, prompts.ts
├── db/                           # schema.ts, queries
├── events/                       # logger.ts
├── scoring/                      # technical.ts, collaboration.ts, communication.ts, dossier.ts
├── sessions/                     # manager.ts
├── stripe/                       # config.ts

data/
├── challenges/                   # 5 challenge JSON files
├── review-scenarios/             # react-dashboard-mr.json
├── fallback-questions.json
```

---

## Summary

This is a **near-complete MVP** of an AI-augmented assessment platform. The core assessment experience (build → explain → review) is fully implemented with proper data capture, dossier generation, and billing integration. The adaptive engine is rule-based and functional; the scoring is heuristic-based and ready for refinement.

The single biggest gap is the **lack of a real test runner** — test cases are inert requirement descriptions, not executable assertions. Everything else is enterprise/V2 scope (session replay, custom challenge builder, ATS integrations, ML-based adaptation).
