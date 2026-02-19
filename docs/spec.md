**PRODUCT SPECIFICATION**

**ReactAssess**

Adaptive AI-Augmented Technical Assessment Platform

Version 1.0 --- MVP Specification

February 2026

**CONFIDENTIAL**

**1. Executive Summary**

  -----------------------------------------------------------------------
  **ReactAssess** is an adaptive, AI-augmented technical assessment
  platform that evaluates how developers build, understand, and ship
  React code using modern AI tools. Unlike traditional coding assessments
  that test isolated problem-solving in artificial conditions,
  ReactAssess measures the complete modern developer workflow:
  collaborating with AI, verifying output, explaining decisions,
  reviewing code, and adapting under realistic pressure.

  -----------------------------------------------------------------------

**1.1 The Problem**

The hiring process for frontend developers is fundamentally broken.
Current assessment platforms test candidates in conditions that bear no
resemblance to how modern development actually works. Developers use AI
tools daily, yet assessments pretend these tools do not exist, or
actively try to prevent their use. The result is that companies hire
based on an artificial skill (writing code from memory under pressure)
rather than the skill that actually matters (building quality software
efficiently with modern tools).

Simultaneously, hiring managers lack visibility into how candidates
think, communicate, and collaborate. A traditional coding test produces
a single score. It cannot tell you whether a candidate blindly ships
AI-generated code without review, writes incomprehensible PR comments,
or crumbles when requirements change mid-task.

**1.2 The Solution**

ReactAssess flips the paradigm. Instead of restricting AI, we instrument
it. Candidates receive a sandbox environment with Claude integrated
directly into their workflow. They are explicitly told to use AI however
they normally would. The platform then captures rich behavioral data
across a multi-phase assessment that mirrors real work:

1.  **Build Phase:** Solve adaptive React challenges using a sandbox and
    Claude. We track prompting quality, verification behavior, and AI
    collaboration patterns.

2.  **Explain Phase:** Quickfire questions generated from the
    candidate's own code. Timed responses prevent cheating and reveal
    whether they truly understand what they built.

3.  **Review Phase:** Evaluate a merge request with bugs and bad
    patterns. Write review comments. This tests code comprehension,
    communication quality, and judgment.

The output is not a score. It is a comprehensive candidate dossier
covering technical ability, AI collaboration skill, code comprehension,
communication style, and working behavior.

**1.3 Target Market**

-   **Primary:** Engineering teams at mid-to-large companies (100+
    engineers) hiring React/frontend developers at scale.

-   **Secondary:** Technical recruiting agencies and staffing firms
    assessing frontend candidates.

-   **Future:** Expansion to full-stack assessment, then to
    non-technical roles using the conversational AI assessment engine.

**2. User Personas**

**2.1 Hiring Manager (Primary Buyer)**

**Name:** Sarah, Engineering Manager at a Series C fintech startup

Sarah hires 5--10 frontend developers per quarter. She is frustrated
that candidates who ace LeetCode-style assessments often cannot build a
real React component, write a clear PR description, or collaborate
effectively. She wants an assessment that tells her how someone actually
works, not just whether they can invert a binary tree.

**Key needs:** Actionable candidate insights beyond a single score.
Reduced false positives in hiring. Confidence that the assessment
reflects real job requirements.

**2.2 Candidate (Primary User)**

**Name:** Alex, a mid-level React developer with 3 years of experience

Alex uses Claude and Copilot daily and is frustrated by assessments that
force them to write everything from scratch. They want a chance to
demonstrate how productive they actually are with the tools they use
every day. They prefer assessments that feel like real work rather than
algorithmic puzzles.

**Key needs:** A fair, realistic assessment environment. Ability to
showcase modern workflow skills. Clear understanding of what is being
evaluated.

**2.3 Technical Recruiter**

**Name:** Jordan, Senior Technical Recruiter at an enterprise company

Jordan manages high-volume hiring pipelines and needs to screen
candidates efficiently before passing them to engineering teams. They
need clear, shareable reports that help hiring committees make faster
decisions.

**Key needs:** Scalable screening. Easy-to-interpret reports for
non-technical stakeholders. Standardized comparison across candidates.

**3. Product Architecture**

**3.1 Technical Stack**

  ----------------------- ----------------------- -----------------------
  **Layer**               **Technology**          **Rationale**

  Frontend                Next.js 14 + Tailwind   Fast iteration, SSR for
                          CSS                     dashboard pages,
                                                  excellent DX

  Code Sandbox            Sandpack (CodeSandbox   Client-side React
                          OSS)                    bundling, zero server
                                                  compute, live preview

  AI Integration          Anthropic Claude API    Streaming responses,
                          (Sonnet)                high quality code
                                                  generation, cost
                                                  effective

  Database                Supabase (PostgreSQL)   Auth, realtime,
                                                  row-level security,
                                                  fast MVP setup

  Event Store             Supabase + structured   Behavioral event
                          JSON                    logging with timestamps

  Hosting                 Vercel                  Zero-config Next.js
                                                  deployment, edge
                                                  functions, fast
                                                  globally

  Payments                Stripe                  Enterprise invoicing
                                                  and per-assessment
                                                  billing

  Question Engine         Claude API (analysis    Generates targeted
                          mode)                   questions from
                                                  candidate code
  ----------------------- ----------------------- -----------------------

**3.2 System Architecture Overview**

The platform is a standard Next.js application with three main
interfaces: the candidate assessment environment, the hiring manager
dashboard, and the admin panel. All behavioral events are logged to a
structured event store in real time. The adaptive engine runs
server-side, querying the event store to make difficulty adjustment
decisions. Question generation is handled by the Claude API, which
receives the candidate's submitted code and returns targeted questions.

**Key architectural decisions:**

-   **Client-side sandboxing:** Sandpack runs entirely in the browser.
    This means zero server compute cost for candidate coding sessions,
    regardless of scale. The only server costs are API calls to Claude
    and database writes for event logging.

-   **Event sourcing pattern:** Every interaction is stored as an
    immutable event with a timestamp. This allows post-hoc analysis,
    replay functionality, and iterative improvement of behavioral
    scoring models without losing data.

-   **Streaming AI responses:** Claude's responses stream into the chat
    panel in real time, providing a natural conversational experience
    and reducing perceived latency.

**4. Assessment Flow**

The assessment consists of three sequential phases. Each phase tests
different competencies and generates distinct behavioral signals. The
total assessment time is approximately 45--60 minutes.

**4.1 Phase 1: Build (25--35 minutes)**

**Overview**

The candidate receives a React coding challenge and a full development
environment with Claude integrated as an AI assistant. They are
explicitly instructed to use Claude however they normally would in their
daily work. The adaptive engine adjusts challenge difficulty based on
performance.

**Interface layout**

-   **Left panel:** Challenge description with requirements, acceptance
    criteria, and an adaptive progress indicator showing current
    difficulty level.

-   **Center panel:** Sandpack code editor with syntax highlighting,
    auto-complete, and a live preview pane below showing the rendered
    React output.

-   **Right panel:** Claude chat interface. Candidates can ask Claude
    for help, paste errors, request explanations, or ask it to generate
    code. All interactions are logged.

**Adaptive difficulty mechanics**

The MVP uses a rule-based adaptive engine rather than ML. Challenges are
organized into a pool tagged by difficulty tier (1--5) and topic area
(components, state management, hooks, performance, data fetching, forms,
routing).

**Difficulty escalation rules:**

-   If the candidate completes a challenge with passing tests in under
    60% of the allocated time AND code quality score exceeds threshold,
    serve a challenge one tier higher.

-   If the candidate fails to complete within the time limit OR code
    quality is below threshold, serve a challenge at the same tier or
    one tier lower in a different topic area.

-   If the candidate completes with heavy AI reliance (\>70% of code
    from Claude with minimal modification), maintain tier but flag for
    deeper probing in the Explain phase.

**Behavioral signals captured**

  ----------------------- ----------------------- -----------------------
  **Signal**              **What It Measures**    **How It's Captured**

  Prompt quality          Can they articulate     NLP analysis of prompts
                          needs clearly to AI?    sent to Claude

  Verification behavior   Do they review AI       Diff between Claude
                          output or blindly       output and final code
                          accept?                 

  Iteration pattern       How do they refine      Code change timeline
                          solutions?              with timestamps

  Decomposition           Do they break problems  Number and sequence of
                          into steps?             Claude interactions

  Time allocation         Thinking vs. coding vs. Timestamped activity
                          debugging ratio         phases

  Independence            When do they use AI vs. Ratio of AI-generated
                          code themselves?        to hand-written code
  ----------------------- ----------------------- -----------------------

**4.2 Phase 2: Explain --- Quickfire Round (8--12 minutes)**

**Overview**

After submitting their build solution, the candidate enters a timed
quickfire round. The platform sends their code to the Claude API, which
analyzes the specific implementation and generates targeted questions.
These questions are about the candidate's own code, not generic React
trivia. This makes every quickfire round unique and impossible to
prepare for.

**Anti-cheat mechanism**

The quickfire round is the primary cheat prevention mechanism. Each
question has a 15--20 second response window. This is sufficient time
for someone who understands their code to answer confidently, but
insufficient time to copy the question into an external AI tool, get a
response, interpret it, and formulate an answer. The time pressure is
the security layer.

**Question types**

1.  **Multiple choice (10--12 seconds):** \"What happens if this
    component receives an empty array as props?\" with 4 options. Tests
    quick pattern recognition and understanding.

2.  **Short free text (15--20 seconds):** \"Why did you use useCallback
    on line 34 instead of useMemo?\" Candidate types a brief
    explanation. Graded by Claude for correctness and clarity.

3.  **Consequence prediction (15 seconds):** \"If 10,000 items are added
    to this list, what is the first performance bottleneck?\" Tests
    ability to reason about code they wrote.

4.  **Bug identification (15 seconds):** Platform introduces a subtle
    bug into their code and asks: \"This code now has a bug. What is
    it?\" Tests reading comprehension of their own solution.

**Question generation prompt (sent to Claude API)**

+-----------------------------------------------------------------------+
| *System prompt for question generation:*                              |
|                                                                       |
| \"You are a senior React interviewer. Analyze the following           |
| candidate-submitted React code. Generate 10--15 targeted questions    |
| that test whether the candidate truly understands their               |
| implementation. Questions should cover: why specific hooks were       |
| chosen, what happens under edge cases, performance implications,      |
| alternative approaches they could have taken, and what would break if |
| specific lines were changed. Return questions in JSON format with     |
| type (multiple_choice / free_text), difficulty (1--3),                |
| time_limit_seconds, and for multiple choice, four options with the    |
| correct answer marked.\"                                              |
+-----------------------------------------------------------------------+

**Behavioral signals captured**

-   **Response accuracy:** Do they actually understand their code?

-   **Response speed:** Fast correct answers indicate genuine
    understanding vs. slow correct answers that suggest reasoning
    through unfamiliar code.

-   **Free text quality:** How clearly and precisely do they explain
    technical decisions under time pressure? Feeds into the
    communication profile.

-   **Confidence pattern:** Do they answer quickly on some topics but
    hesitate on others? Reveals specific knowledge gaps.

**4.3 Phase 3: Review --- Merge Request (10--15 minutes)**

**Overview**

The candidate is presented with a pre-built React merge request
containing intentional issues: bugs, anti-patterns, performance
problems, accessibility gaps, and poor code style. They must review the
MR, identify issues, and write review comments explaining what is wrong
and how to fix it.

**Interface**

A diff view (using react-diff-viewer) showing the merge request changes.
The candidate can click on any line to add a review comment, similar to
the GitHub/GitLab PR review experience. A summary text box at the top
allows them to write an overall review assessment.

**MR issue categories (seeded in each review)**

  ----------------------- ------------------------- -----------------------
  **Category**            **Example**               **What It Tests**

  Logic bug               Off-by-one error in       Debugging skill,
                          pagination                attention to detail

  Performance             Creating objects inside   React performance
  anti-pattern            render without            knowledge
                          memoization               

  State management issue  Derived state that should Understanding of React
                          be computed               data flow

  Accessibility gap       Missing aria labels,      Awareness of a11y best
                          non-semantic HTML         practices

  Security concern        Unsanitized user input    Security awareness
                          rendered with             
                          dangerouslySetInnerHTML   

  Code style              Inconsistent naming,      Code quality standards
                          missing error boundaries  
  ----------------------- ------------------------- -----------------------

**Behavioral signals captured**

-   **Issue detection rate:** What percentage of seeded issues did they
    find? Which categories did they miss?

-   **Comment quality:** Are their review comments constructive,
    specific, and actionable? Or vague and unhelpful?

-   **Communication tone:** Do they explain issues respectfully and
    constructively, or are they blunt and dismissive? This directly
    predicts how they will interact with teammates.

-   **Prioritization:** Do they focus on critical bugs first or get
    distracted by style nitpicks?

-   **Fix suggestions:** Do they just identify problems or also propose
    solutions?

**5. Candidate Dossier (Hiring Manager Output)**

The primary deliverable to the hiring manager is a comprehensive
candidate dossier generated from data captured across all three phases.
This is not a single score. It is a multi-dimensional profile of how the
candidate works.

**5.1 Dossier Sections**

**Technical Proficiency Score**

An overall technical score (1--10) derived from: challenge completion
rate, code quality metrics (correctness, structure, readability),
quickfire accuracy, and MR review issue detection rate. Broken down by
topic area (hooks, state management, performance, accessibility, etc.)
so hiring managers can see specific strengths and gaps.

**AI Collaboration Profile**

A qualitative and quantitative assessment of how the candidate works
with AI tools. Includes: prompt quality rating, verification behavior
score, independence ratio (% of code they wrote vs. accepted from AI),
and a narrative summary describing their AI workflow style.

**Example narrative:** *\"This candidate demonstrated strong AI
collaboration skills. They used Claude primarily for boilerplate
generation and debugging, writing core logic themselves. They modified
68% of Claude's output before accepting it, indicating careful
verification. Their prompts were specific and well-structured, providing
context about the component's purpose before asking for help.\"*

**Code Comprehension Score**

Derived from the quickfire round. Measures whether the candidate
genuinely understands the code they submitted, including AI-generated
portions. Broken down by: correct/incorrect by topic, response time
patterns, and free-text explanation quality.

**Communication and Collaboration Profile**

Derived from MR review comments, quickfire free-text responses, and
Claude interaction style. Assesses clarity of written communication,
constructiveness of feedback, ability to explain technical concepts
concisely, and overall tone. This is framed as collaboration insights
rather than personality assessment to avoid regulatory concerns.

**Behavioral Insights**

A summary of working patterns observed across all phases. Includes:
problem-solving approach (planner vs. diver), time management,
resilience under difficulty increases, debugging strategy, and attention
to detail.

**Session Replay (Premium Feature)**

A condensed replay of key moments from the candidate's session. Hiring
managers can watch a 3--5 minute highlight reel showing how the
candidate approached the hardest challenge, how they interacted with
Claude at critical moments, and how they handled the quickfire round.
This provides an unparalleled window into the candidate's working
process.

**6. MVP Scope and Screens**

The MVP focuses on proving the core assessment loop with the minimum
viable feature set. Features marked as V2 are explicitly deferred.

**6.1 Screens and Routes**

  -------------------------- ----------------------- -----------------------
  **Route**                  **Screen**              **Description**

  /                          Landing page            Product marketing,
                                                     pricing, sign-up CTA

  /login                     Authentication          Supabase auth (email +
                                                     Google SSO)

  /dashboard                 Hiring manager          List of assessments,
                             dashboard               candidates, and results

  /dashboard/new             Create assessment       Select challenge pool,
                                                     configure settings

  /dashboard/candidate/:id   Candidate dossier       Full assessment results
                                                     and behavioral profile

  /assess/:token             Candidate assessment    The three-phase
                                                     assessment experience

  /assess/:token/build       Build phase             Sandpack + Claude +
                                                     challenge

  /assess/:token/explain     Quickfire phase         Timed questions
                                                     generated from their
                                                     code

  /assess/:token/review      MR review phase         Diff viewer with
                                                     comment interface

  /assess/:token/complete    Completion screen       Thank you + next steps
  -------------------------- ----------------------- -----------------------

**6.2 MVP Feature Breakdown**

**Must have (Week 1--4)**

-   Three-panel assessment layout (challenge / editor / Claude chat)

-   Sandpack integration with live React preview

-   Claude chat panel with streaming responses via Anthropic API

-   3--5 handcrafted React challenges at varying difficulty levels

-   Code submission and Claude-powered question generation

-   Quickfire UI with countdown timer and mixed question types

-   Basic MR review interface with diff view and inline comments

-   Comprehensive event logging for all candidate interactions

-   Hiring manager dashboard with candidate list and basic dossier view

-   Email-based assessment invitation flow

-   Supabase auth for hiring managers

**Nice to have (Week 5--6)**

-   Adaptive difficulty engine (rule-based)

-   Richer behavioral scoring model

-   Session replay / timeline visualization

-   PDF export of candidate dossier

-   Multiple challenge pools by seniority level

**Deferred to V2**

-   ML-based adaptive engine

-   Full communication/collaboration profiling

-   Team analytics and cross-candidate comparison

-   ATS integrations (Greenhouse, Lever, Ashby)

-   Custom challenge builder for enterprise clients

-   Non-React assessment tracks (Vue, Angular, full-stack)

-   Candidate-facing prep product (B2C)

**7. Data Model (Core Tables)**

The following represents the core Supabase/PostgreSQL schema for the
MVP.

  ----------------------- --------------------------- -----------------------
  **Table**               **Key Fields**              **Purpose**

  organizations           id, name, plan,             Company accounts
                          stripe_customer_id          

  users                   id, org_id, email, role     Hiring team members
                          (admin/manager/recruiter)   

  assessments             id, org_id, title,          Assessment
                          challenge_pool,             configurations
                          settings_json               

  candidates              id, assessment_id, email,   Invited candidates
                          token, status, invited_at   

  sessions                id, candidate_id,           Assessment sessions
                          started_at, completed_at,   
                          phase                       

  events                  id, session_id, type,       Behavioral event log
                          payload_json, timestamp     (immutable)

  submissions             id, session_id, phase,      Code submissions per
                          code, metadata_json         phase

  quickfire_responses     id, session_id,             Quickfire answers
                          question_json, response,    
                          correct, time_ms            

  review_comments         id, session_id,             MR review comments
                          line_number, comment_text,  
                          issue_found                 

  dossiers                id, candidate_id,           Generated candidate
                          scores_json, profile_json,  profiles
                          generated_at                
  ----------------------- --------------------------- -----------------------

**Event types logged**

  ------------------------ ------------------------- -----------------------
  **Event Type**           **Payload**               **Phase**

  prompt_sent              prompt_text, timestamp    Build

  claude_response          response_text,            Build
                           tokens_used               

  code_change              diff, timestamp           Build

  claude_output_accepted   original, modified,       Build
                           acceptance_type           
                           (full/partial/rejected)   

  challenge_started        challenge_id,             Build
                           difficulty_tier           

  challenge_submitted      code, test_results,       Build
                           time_elapsed              

  quickfire_answered       question_id, response,    Explain
                           time_ms, correct          

  review_comment_added     line_number,              Review
                           comment_text,             
                           issue_category            

  phase_transition         from_phase, to_phase,     All
                           timestamp                 
  ------------------------ ------------------------- -----------------------

**8. Initial Challenge Pool**

The MVP ships with 5 handcrafted challenges across three difficulty
tiers. Each challenge includes: a description with requirements, starter
code in the Sandpack template, automated test cases, a rubric for code
quality evaluation, and metadata for the adaptive engine.

**8.1 Challenge List**

  ----------------- ----------------- ----------------- -----------------
  **Tier**          **Challenge**     **Key Concepts    **Time Limit**
                                      Tested**          

  1 (Easy)          Interactive Todo  useState, event   15 min
                    List              handling, list    
                                      rendering,        
                                      conditional       
                                      styling           

  2 (Medium)        Data Fetching     useEffect,        20 min
                    Dashboard         async/await,      
                                      loading/error     
                                      states, data      
                                      transformation    

  3 (Medium)        Form with         Controlled        20 min
                    Validation        components,       
                                      custom hooks,     
                                      form state, error 
                                      messaging         

  4 (Hard)          Virtualized       Performance       25 min
                    Infinite Scroll   optimization,     
                                      intersection      
                                      observer,         
                                      pagination,       
                                      memoization       

  5 (Hard)          Real-time         useReducer,       25 min
                    Collaborative     context API,      
                    Counter           optimistic        
                                      updates, state    
                                      synchronization   
  ----------------- ----------------- ----------------- -----------------

Each challenge is designed so that Claude can help solve it, but the
optimal solution requires human judgment about architecture, edge cases,
and UX decisions that AI alone will not handle perfectly. This ensures
the assessment differentiates between candidates who use AI thoughtfully
and those who defer all thinking to it.

**9. Pricing Model**

**9.1 MVP Pricing**

  ----------------- ----------------- -------------------- -----------------
  **Plan**          **Price**         **Includes**         **Target**

  Starter           £50/month         10                   Small teams,
                                      assessments/month,   validation
                                      basic dossier, email 
                                      support              

  Professional      £200/month        50                   Growing eng teams
                                      assessments/month,   
                                      full dossier,        
                                      session replay,      
                                      priority support     

  Enterprise        Custom            Unlimited            Large
                                      assessments, custom  organizations
                                      challenges, ATS      
                                      integration,         
                                      dedicated CSM        
  ----------------- ----------------- -------------------- -----------------

Pricing is per-organization, not per-seat. All team members within an
organization can access the platform. Assessment counts are based on
completed assessments (started but abandoned sessions do not count).

**9.2 Unit Economics (Estimated)**

-   **Claude API cost per assessment:** Approximately £0.50--£1.50
    depending on candidate interaction volume (Build phase chat +
    question generation + free-text grading).

-   **Infrastructure cost per assessment:** Approximately £0.05--£0.10
    (Sandpack is client-side, so primary costs are database writes and
    Vercel function invocations).

-   **Target gross margin:** 75%+ at Professional tier.

**10. Go-to-Market Strategy**

**10.1 Phase 1: Design Partners (Month 1--2)**

Identify 5--10 engineering managers at companies actively hiring React
developers. Offer free access to the MVP in exchange for detailed
feedback and the ability to correlate assessment results with eventual
hire performance. These design partners validate the product, generate
case studies, and become the first paying customers.

**10.2 Phase 2: Content-Led Growth (Month 2--4)**

Publish thought leadership on the future of technical hiring with AI.
Topics include: why traditional coding assessments are obsolete, what AI
collaboration skills look like, how behavioral signals predict job
performance. This builds credibility and generates inbound interest from
forward-thinking engineering leaders.

**10.3 Phase 3: Product-Led Expansion (Month 4+)**

Launch a free candidate-facing prep product that lets developers
practice AI-augmented React challenges. This serves as a growth engine
(developers recommend the platform to their companies), a data flywheel
(more sessions improve the behavioral scoring model), and a future B2C
revenue stream.

**11. Key Risks and Mitigations**

  ----------------------- ----------------------- -----------------------
  **Risk**                **Impact**              **Mitigation**

  Incumbents copy the     High                    Speed to market + depth
  concept                                         of behavioral model
                                                  creates data moat.
                                                  Incumbents have
                                                  architectural debt that
                                                  makes deep
                                                  instrumentation harder
                                                  to add.

  Anthropic API pricing   Medium                  Abstract AI provider.
  increases                                       Design system to swap
                                                  Claude for alternative
                                                  models. Negotiate
                                                  volume pricing early.

  Candidate privacy       Medium                  Full transparency about
  concerns                                        what is tracked. GDPR
                                                  compliance from day
                                                  one. Frame as
                                                  collaboration insights,
                                                  not surveillance.

  Behavioral signals do   High                    Design partner program
  not predict job                                 specifically structured
  performance                                     to validate
                                                  correlation. Iterate
                                                  scoring model based on
                                                  real outcomes data.

  EU AI Act compliance    Medium                  Classify as high-risk
  for hiring tools                                AI system. Implement
                                                  required transparency,
                                                  human oversight, and
                                                  bias monitoring from
                                                  launch.

  LLM nondeterminism      Medium                  Seed Claude with
  creates unfair                                  consistent system
  comparisons                                     prompts. Evaluate
                                                  candidates on their
                                                  process, not on
                                                  Claude's output
                                                  quality.
  ----------------------- ----------------------- -----------------------

**12. Success Metrics**

**12.1 Product Metrics**

-   **Assessment completion rate:** Target \>80%. Measures whether the
    experience is engaging and appropriately timed.

-   **Candidate satisfaction score:** Post-assessment survey. Target
    \>4.0/5.0. Key question: \"Did this assessment reflect how you
    actually work?\"

-   **Hiring manager NPS:** Target \>40 within 3 months. Measures
    whether the dossier provides actionable value.

-   **Dossier-to-interview conversion:** What percentage of dossiers
    lead to a next-round interview? Higher is better (indicates the
    dossier provides clear signal).

**12.2 Business Metrics**

-   **Design partners signed:** Target 5 in month 1.

-   **Paying customers:** Target 15--20 by month 3.

-   **Monthly recurring revenue:** Target £5,000 MRR by month 4.

-   **Assessment volume:** Target 200+ completed assessments by month 3
    (provides sufficient data to begin validating behavioral model).

**13. MVP Sprint Plan**

**Week 1: Core Shell**

-   Initialize Next.js project with Tailwind CSS and Supabase

-   Implement auth flow (email + Google SSO via Supabase)

-   Build the three-panel assessment layout

-   Integrate Sandpack with React template and live preview

-   Wire up Claude chat panel with Anthropic API streaming

-   Create first challenge (Interactive Todo List)

-   Deploy to Vercel

**Week 2: Assessment Flow**

-   Build challenge delivery and submission system

-   Implement code submission to Claude API for question generation

-   Build quickfire UI with countdown timer

-   Implement mixed question types (multiple choice + free text)

-   Build MR review interface with diff view and inline comments

-   Create 2 additional challenges (Data Fetching Dashboard, Form with
    Validation)

-   Implement phase transitions (Build → Explain → Review → Complete)

**Week 3: Data and Dashboard**

-   Implement comprehensive event logging across all phases

-   Build hiring manager dashboard with candidate list

-   Create candidate dossier view with scores and behavioral summary

-   Build assessment invitation flow (generate unique tokens, send
    emails)

-   Implement basic scoring algorithms for technical proficiency and AI
    collaboration

-   Create 2 additional challenges (Virtualized Infinite Scroll,
    Collaborative Counter)

**Week 4: Polish and Launch**

-   End-to-end testing of full assessment flow

-   Responsive design pass on all screens

-   Error handling and edge cases (network failures, session timeouts,
    etc.)

-   Landing page with product positioning and pricing

-   Stripe integration for payment

-   Documentation for design partners

-   Outreach to first 5 design partners

**14. Open Questions**

The following decisions need to be resolved during or shortly after MVP
development:

1.  Should candidates know their difficulty level is being adjusted, or
    should adaptive mechanics be invisible?

2.  What is the right balance of multiple choice vs. free text in the
    quickfire round? Need to test both extremes with design partners.

3.  How should we handle candidates who do not use Claude at all during
    the Build phase? Is that a valid signal or do we need to require
    minimum AI interaction?

4.  What is the minimum viable behavioral scoring model? Start with
    simple heuristics and iterate, or invest in a more sophisticated
    model before launch?

5.  Should the MR review phase use the candidate's own code (modified
    with bugs) or a separate pre-built codebase? Using their own code is
    more personalized but adds complexity.

6.  How do we handle time zone and scheduling for assessments? Async
    (take anytime within a window) vs. scheduled (specific start time)?

7.  What is the right product name? ReactAssess is a working title.
    Needs to be broader if we plan to expand beyond React.

*End of Specification*

**Ready to build. Let's go.**