import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { createMeetup, createRsvp } from "@/lib/db/queries";
import { generateShareCode } from "@/lib/utils";

const createMeetupSchema = z.object({
  creatorName: z.string().min(1).max(128),
  creatorEmail: z.string().email().max(256),
  title: z.string().min(1).max(256),
  description: z.string().max(1000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  addressText: z.string().max(512).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = createMeetupSchema.parse(body);

    const shareCode = generateShareCode();
    const creatorToken = nanoid(32);

    const meetup = await createMeetup({
      creatorName: data.creatorName,
      creatorEmail: data.creatorEmail,
      title: data.title,
      description: data.description,
      shareCode,
      creatorToken,
    });

    // Auto-add creator as first "going" RSVP with their location
    await createRsvp({
      meetupId: meetup.id,
      name: data.creatorName,
      email: data.creatorEmail,
      latitude: data.latitude,
      longitude: data.longitude,
      addressText: data.addressText,
      status: "going",
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareUrl = `${appUrl}/m/${shareCode}`;

    const response = NextResponse.json(
      { meetup, shareCode, shareUrl },
      { status: 201 }
    );

    // Set creator token as httpOnly cookie
    response.cookies.set(`cr_${shareCode}`, creatorToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to create meetup:", error);
    return NextResponse.json(
      { error: "Failed to create meetup" },
      { status: 500 }
    );
  }
}
