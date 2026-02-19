import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getMeetupByShareCode,
  getRsvpsByMeetupId,
  getCoffeeOptionsByMeetupId,
} from "@/lib/db/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const meetup = await getMeetupByShareCode(code);

    if (!meetup) {
      return NextResponse.json({ error: "Meetup not found" }, { status: 404 });
    }

    const [rsvpList, coffeeOptionsList] = await Promise.all([
      getRsvpsByMeetupId(meetup.id),
      getCoffeeOptionsByMeetupId(meetup.id),
    ]);

    // Check if the current user is the creator
    const cookieStore = await cookies();
    const creatorCookie = cookieStore.get(`cr_${code}`);
    const isCreator = creatorCookie?.value === meetup.creatorToken;

    // Don't expose the creator token
    const { creatorToken: _, ...safeMeetup } = meetup;

    return NextResponse.json({
      meetup: safeMeetup,
      rsvps: rsvpList,
      coffeeOptions: coffeeOptionsList,
      isCreator,
    });
  } catch (error) {
    console.error("Failed to get meetup:", error);
    return NextResponse.json(
      { error: "Failed to get meetup" },
      { status: 500 }
    );
  }
}
