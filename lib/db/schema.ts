import type { InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  real,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const meetupStatusEnum = pgEnum("meetup_status", [
  "open",
  "decided",
  "cancelled",
]);

export const rsvpStatusEnum = pgEnum("rsvp_status", [
  "going",
  "maybe",
  "declined",
]);

export const meetups = pgTable("meetups", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  creatorName: varchar("creator_name", { length: 128 }).notNull(),
  creatorEmail: varchar("creator_email", { length: 256 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  status: meetupStatusEnum("status").default("open").notNull(),
  chosenPlaceId: varchar("chosen_place_id", { length: 512 }),
  shareCode: varchar("share_code", { length: 16 }).notNull().unique(),
  creatorToken: varchar("creator_token", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Meetup = InferSelectModel<typeof meetups>;

export const rsvps = pgTable("rsvps", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  meetupId: uuid("meetup_id")
    .notNull()
    .references(() => meetups.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 256 }).notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  addressText: varchar("address_text", { length: 512 }),
  status: rsvpStatusEnum("status").default("going").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Rsvp = InferSelectModel<typeof rsvps>;

export const coffeeOptions = pgTable("coffee_options", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  meetupId: uuid("meetup_id")
    .notNull()
    .references(() => meetups.id, { onDelete: "cascade" }),
  googlePlaceId: varchar("google_place_id", { length: 512 }).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  address: varchar("address", { length: 512 }).notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  rating: real("rating"),
  priceLevel: real("price_level"),
  photoReference: varchar("photo_reference", { length: 1024 }),
  distanceScores: jsonb("distance_scores"),
  fairnessScore: real("fairness_score"),
  overallScore: real("overall_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CoffeeOption = InferSelectModel<typeof coffeeOptions>;
