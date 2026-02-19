# Session 2: Auth, Assessment Layout & Core Integrations

Read the full product spec in /docs/spec.md if you haven't already — sections 3, 4.1, and 6 are most relevant for this session.

## 1. Supabase Auth Flow

### Auth Setup
- Configure Supabase Auth with two providers: **email/password** and **Google SSO**
- Set up the auth callback route at `/auth/callback/route.ts` to handle the OAuth redirect and exchange the code for a session
- Set up the middleware in `middleware.ts` to:
  - Refresh the Supabase session on every request
  - Protect all `/dashboard/*` routes — redirect to `/login` if no session
  - Leave `/assess/*` routes unprotected (candidates access via token, not auth)
  - Leave `/` (landing page) unprotected

### Login Page (`/app/(auth)/login/page.tsx`)
- Clean, minimal login form with:
  - Email + password fields with a "Sign in" button
  - "Continue with Google" button (Google SSO via Supabase `signInWithOAuth`)
  - Link to sign up (can be a toggle on the same page or a separate `/signup` route — your call)
  - Error handling for invalid credentials, email not confirmed, etc.
- After successful login, redirect to `/dashboard`

### Sign Up Flow
- Email + password sign up via Supabase `signUp`
- On sign up, also create a row in `organizations` (default name to the user's email domain or "My Organization") and a row in `users` linking to that org with role 'admin'
- Use a Supabase database function or a Server Action for this — the org + user creation should be atomic
- After sign up, show a "Check your email to confirm" message (Supabase sends confirmation email automatically)

### Sign Out
- Add a sign out button/action that calls `supabase.auth.signOut()` and redirects to `/login`
- This will live in the dashboard layout header (built in step 3)

### Test
- Signing up creates an org + user record
- Logging in redirects to `/dashboard`
- Hitting `/dashboard` while logged out redirects to `/login`
- `/assess/some-token` is accessible without auth

## 2. Dashboard Layout (`/app/(dashboard)/layout.tsx`)

Create a dashboard shell layout that wraps all `/dashboard/*` pages:

- **Top nav bar** with:
  - App name/logo on the left ("ReactAssess" text is fine for now)
  - User's email or name on the right
  - Sign out button
- **Sidebar** (left) with navigation links:
  - "Assessments" → `/dashboard`
  - "Create Assessment" → `/dashboard/new`
- **Main content area** where child pages render
- Keep it clean and functional — use Tailwind, no component library needed
- Responsive: sidebar collapses to a hamburger menu on mobile

### Dashboard Home (`/app/(dashboard)/dashboard/page.tsx`)
- For now, just show a heading "Your Assessments" and an empty state message: "No assessments yet. Create your first one to get started."
- Add a "Create Assessment" CTA button linking to `/dashboard/new`
- We'll populate this with real data in session 3

## 3. Three-Panel Assessment Layout

This is the core UI for the Build phase (section 4.1 of the spec). Build it at `/components/assessment/AssessmentLayout.tsx`.

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Assessment Header (phase indicator, timer, progress)    │
├──────────────┬──────────────────────┬───────────────────┤
│              │                      │                   │
│  Challenge   │   Code Editor        │   Claude Chat     │
│  Description │   (Sandpack)         │   Panel           │
│              │                      │                   │
│  - Title     │   - Editor top       │   - Message list  │
│  - Reqs      │   - Preview bottom   │   - Input box     │
│  - Criteria  │                      │                   │
│              │                      │                   │
├──────────────┴──────────────────────┴───────────────────┤
│  Footer (submit button, phase navigation)                │
└─────────────────────────────────────────────────────────┘
```

### Requirements
- Three resizable columns using CSS grid or flexbox. Approximate default widths: 20% / 50% / 30%
- Panels should have a minimum width so they don't collapse to nothing
- A drag handle between panels to resize would be ideal, but not required for MVP — fixed proportions are fine
- The header should show:
  - Current phase name ("Build Phase", "Explain Phase", "Review Phase")
  - A phase progress indicator (3 steps: Build → Explain → Review, with current highlighted)
  - A countdown timer (just the UI component — wire it to real data later)
- The footer should show a "Submit & Continue" button (disabled state by default, we'll add logic later)
- The whole layout should be full viewport height (`h-screen`) with no page scroll — each panel scrolls independently
- Mark as `'use client'` — this is inherently interactive

### Left Panel: Challenge Description
- Create `/components/assessment/ChallengePanel.tsx`
- Accepts props: `title`, `description` (markdown string), `requirements` (string array), `difficulty` (1-5), `timeLimit` (minutes)
- Render the description as formatted text (can use a simple markdown renderer or just dangerouslySetInnerHTML with sanitized HTML — keep it simple)
- Show requirements as a checklist (unchecked by default, we won't auto-check them in MVP)
- Show a difficulty badge (e.g., "Tier 3 — Medium")
- For now, hardcode some sample challenge content so we can see it rendering

## 4. Sandpack Integration (Center Panel)

Create `/components/assessment/CodeEditorPanel.tsx`

### Setup
- Use `@codesandbox/sandpack-react` with the `SandpackProvider`, `SandpackCodeEditor`, and `SandpackPreview` components
- Template: React (JavaScript for now — TypeScript template can come later)
- Layout: editor on top, preview on bottom, split ~60/40 vertically within the center panel
- Enable these Sandpack options:
  - `showLineNumbers: true`
  - `showTabs: true` (candidates may need multiple files)
  - `editorHeight` should fill available space
  - `autorun: true` (preview updates as code changes)

### Starter Code
- For now, hardcode a simple starter template so we can verify the integration works:
```javascript
// App.js
import React from 'react';

export default function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Hello ReactAssess</h1>
      <p>Start building here...</p>
    </div>
  );
}
```

### Code Change Tracking
- Use Sandpack's `useSandpack` hook to access the current files/code state
- Create a utility that diffs the current code against the previous snapshot and will eventually log `code_change` events
- Don't wire this to the database yet — just set up the diffing logic and log to console for now
- We'll need to be able to extract the full code state at submission time

### Test
- The Sandpack editor renders in the center panel
- Code changes are reflected in the live preview below
- The editor supports multiple files (tabs)
- No server-side rendering issues (Sandpack is client-only — make sure it's properly wrapped)

## 5. Claude Chat Panel (Right Panel)

Create `/components/assessment/ClaudeChatPanel.tsx`

This is the AI assistant the candidate interacts with during the Build phase. It should feel like a natural chat interface.

### UI
- A scrollable message list showing the conversation history
- Each message shows:
  - Role indicator (user vs. Claude) — can be an icon, name label, or just different background colors
  - Message content (Claude's responses should render markdown — code blocks especially)
  - Timestamp (optional for MVP, but nice to have)
- An input area at the bottom with:
  - A textarea (not single-line input) that grows with content, up to ~4 lines, then scrolls
  - A send button
  - Send on Enter (Shift+Enter for newline)
  - Disabled state while Claude is responding
- Auto-scroll to the bottom when new messages arrive
- Show a typing/streaming indicator while Claude's response is coming in

### Claude API Integration
- Create a Route Handler at `/app/api/chat/route.ts`
- This endpoint:
  - Accepts POST with `{ messages: [...], sessionId: string }`
  - Calls the Anthropic SDK with streaming enabled (`stream: true`)
  - Uses the system prompt below
  - Returns a streaming response to the client
- Use the Anthropic SDK's streaming properly — the response should stream tokens to the chat UI in real time, not wait for the full response

### System Prompt (put in `/lib/claude/prompts.ts`)
```
You are a helpful AI coding assistant integrated into a React development environment. The developer is working on a React coding challenge. 

Your role:
- Help them build React components, debug issues, and explain concepts
- Respond with clear, well-structured code when asked
- If they paste an error, help them diagnose and fix it
- Be concise — they're working under a time limit
- Use React best practices (hooks, functional components, proper state management)
- If they ask you to write a full solution, provide it — but encourage them to understand and modify it rather than copying blindly

You can see the challenge they're working on but you should let them drive the approach. If they ask for help, give it. If they ask you to write everything, do it — the assessment platform will capture that behavioral signal separately.

Do not mention that this is an assessment or that their interactions are being logged.
```

### Event Logging (Prep)
- When the user sends a message, log to console: `{ event_type: 'prompt_sent', payload: { prompt_text, timestamp } }`
- When Claude responds, log to console: `{ event_type: 'claude_response', payload: { response_text, tokens_used, timestamp } }`
- We'll wire these to the actual event store in session 3 — for now console logging is fine

### Test
- Type a message and see it appear in the chat
- Claude's response streams in token by token
- Code blocks in Claude's responses are syntax highlighted
- The chat scrolls to new messages
- The input is disabled while streaming and re-enables when done
- Multiple back-and-forth messages work correctly

## 6. Wire the Assessment Layout to the Build Route

Update `/app/assess/[token]/build/page.tsx`:
- Import and render the `AssessmentLayout` with all three panels
- For now, don't look up the token in the database — just render the layout with hardcoded sample data
- The page should be fully functional: you can see the challenge, edit code in Sandpack, and chat with Claude

## 7. Basic Candidate Landing Page

Update `/app/assess/[token]/page.tsx`:
- A simple welcome/instructions page:
  - "Welcome to your ReactAssess assessment"
  - Brief explanation of the three phases (Build, Explain, Review) and approximate timing
  - "What to expect" section explaining that Claude is available and they should use it
  - A "Start Assessment" button that navigates to `/assess/[token]/build`
- Keep it clean and reassuring — candidates will be nervous

## What NOT to do in this session
- Don't build the quickfire/explain phase UI (session 4)
- Don't build the MR review phase UI (session 4)
- Don't build the candidate dossier view (session 3)
- Don't implement the adaptive difficulty engine
- Don't implement real event logging to the database (session 3)
- Don't create real challenge content beyond the hardcoded sample
- Don't implement code submission or phase transitions with real logic
- Don't set up assessment creation or candidate invitation flows (session 3)
