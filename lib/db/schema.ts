import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";

// ─── organizations ──────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  plan: text("plan", {
    enum: ["starter", "professional", "enterprise"],
  })
    .notNull()
    .default("starter"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── users ──────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  fullName: text("full_name"),
  role: text("role", {
    enum: ["admin", "manager", "recruiter"],
  })
    .notNull()
    .default("manager"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── assessments ────────────────────────────────────────────────────

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  challengePool: text("challenge_pool").array().notNull().default([]),
  settings: jsonb("settings").notNull().default({}),
  status: text("status", {
    enum: ["active", "paused", "archived"],
  })
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── candidates ─────────────────────────────────────────────────────

export const candidates = pgTable("candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  fullName: text("full_name"),
  token: text("token").unique().notNull(),
  status: text("status", {
    enum: ["invited", "in_progress", "completed", "expired"],
  })
    .notNull()
    .default("invited"),
  invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// ─── sessions ───────────────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  currentPhase: text("current_phase", {
    enum: ["build", "explain", "review", "complete"],
  })
    .notNull()
    .default("build"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  metadata: jsonb("metadata").default({}),
});

// ─── events (immutable event log) ───────────────────────────────────

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    sessionTimeIdx: index("idx_events_session_time").on(table.sessionId, table.createdAt),
    sessionTypeIdx: index("idx_events_session_type").on(table.sessionId, table.eventType),
  }),
);

// ─── submissions ────────────────────────────────────────────────────

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  phase: text("phase", {
    enum: ["build", "explain", "review"],
  }).notNull(),
  code: text("code"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── quickfire_responses ────────────────────────────────────────────

export const quickfireResponses = pgTable("quickfire_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  questionIndex: integer("question_index").notNull(),
  question: jsonb("question").notNull(),
  response: text("response"),
  isCorrect: boolean("is_correct"),
  responseTimeMs: integer("response_time_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── review_comments ────────────────────────────────────────────────

export const reviewComments = pgTable("review_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  lineNumber: integer("line_number").notNull(),
  commentText: text("comment_text").notNull(),
  issueCategory: text("issue_category"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── dossiers ───────────────────────────────────────────────────────

export const dossiers = pgTable("dossiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id")
    .unique()
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  scores: jsonb("scores").notNull().default({}),
  profile: jsonb("profile").notNull().default({}),
  summary: text("summary"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow(),
});

// ─── Inferred types ─────────────────────────────────────────────────

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type QuickfireResponse = typeof quickfireResponses.$inferSelect;
export type NewQuickfireResponse = typeof quickfireResponses.$inferInsert;
export type ReviewComment = typeof reviewComments.$inferSelect;
export type NewReviewComment = typeof reviewComments.$inferInsert;
export type Dossier = typeof dossiers.$inferSelect;
export type NewDossier = typeof dossiers.$inferInsert;
