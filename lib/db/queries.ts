import "server-only";

import { and, eq, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  coffeeOptions,
  meetups,
  rsvps,
  type CoffeeOption,
  type Meetup,
  type Rsvp,
} from "./schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

export { db };

// --- MEETUP QUERIES ---

export async function createMeetup(data: {
  creatorName: string;
  creatorEmail: string;
  title: string;
  description?: string;
  shareCode: string;
  creatorToken: string;
}): Promise<Meetup> {
  const [meetup] = await db
    .insert(meetups)
    .values({
      creatorName: data.creatorName,
      creatorEmail: data.creatorEmail,
      title: data.title,
      description: data.description || null,
      shareCode: data.shareCode,
      creatorToken: data.creatorToken,
    })
    .returning();

  return meetup;
}

export async function getMeetupByShareCode(
  shareCode: string
): Promise<Meetup | undefined> {
  const [meetup] = await db
    .select()
    .from(meetups)
    .where(eq(meetups.shareCode, shareCode))
    .limit(1);

  return meetup;
}

export async function updateMeetupStatus(
  meetupId: string,
  status: "open" | "decided" | "cancelled",
  chosenPlaceId?: string
): Promise<void> {
  await db
    .update(meetups)
    .set({
      status,
      chosenPlaceId: chosenPlaceId || null,
      updatedAt: new Date(),
    })
    .where(eq(meetups.id, meetupId));
}

// --- RSVP QUERIES ---

export async function createRsvp(data: {
  meetupId: string;
  name: string;
  email: string;
  latitude?: number;
  longitude?: number;
  addressText?: string;
  status?: "going" | "maybe" | "declined";
}): Promise<Rsvp> {
  const [rsvp] = await db
    .insert(rsvps)
    .values({
      meetupId: data.meetupId,
      name: data.name,
      email: data.email,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      addressText: data.addressText || null,
      status: data.status || "going",
    })
    .returning();

  return rsvp;
}

export async function getRsvpsByMeetupId(meetupId: string): Promise<Rsvp[]> {
  return db.select().from(rsvps).where(eq(rsvps.meetupId, meetupId));
}

export async function getGoingRsvpsWithLocation(
  meetupId: string
): Promise<Rsvp[]> {
  return db
    .select()
    .from(rsvps)
    .where(
      and(
        eq(rsvps.meetupId, meetupId),
        eq(rsvps.status, "going"),
        isNotNull(rsvps.latitude),
        isNotNull(rsvps.longitude)
      )
    );
}

// --- COFFEE OPTION QUERIES ---

export async function saveCoffeeOptions(
  meetupId: string,
  options: Array<{
    googlePlaceId: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    rating: number | null;
    priceLevel: number | null;
    photoReference: string | null;
    distanceScores: Record<string, number> | null;
    fairnessScore: number | null;
    overallScore: number | null;
  }>
): Promise<CoffeeOption[]> {
  // Clear existing options for this meetup
  await db
    .delete(coffeeOptions)
    .where(eq(coffeeOptions.meetupId, meetupId));

  if (options.length === 0) return [];

  return db
    .insert(coffeeOptions)
    .values(
      options.map((opt) => ({
        meetupId,
        googlePlaceId: opt.googlePlaceId,
        name: opt.name,
        address: opt.address,
        latitude: opt.latitude,
        longitude: opt.longitude,
        rating: opt.rating,
        priceLevel: opt.priceLevel,
        photoReference: opt.photoReference,
        distanceScores: opt.distanceScores,
        fairnessScore: opt.fairnessScore,
        overallScore: opt.overallScore,
      }))
    )
    .returning();
}

export async function getCoffeeOptionsByMeetupId(
  meetupId: string
): Promise<CoffeeOption[]> {
  return db
    .select()
    .from(coffeeOptions)
    .where(eq(coffeeOptions.meetupId, meetupId));
}

export async function getCoffeeOptionByPlaceId(
  meetupId: string,
  googlePlaceId: string
): Promise<CoffeeOption | undefined> {
  const [option] = await db
    .select()
    .from(coffeeOptions)
    .where(
      and(
        eq(coffeeOptions.meetupId, meetupId),
        eq(coffeeOptions.googlePlaceId, googlePlaceId)
      )
    )
    .limit(1);

  return option;
}
