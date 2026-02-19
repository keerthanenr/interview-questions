import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  getMeetupByShareCode,
  updateMeetupStatus,
  getCoffeeOptionByPlaceId,
} from "@/lib/db/queries";


const pickSchema = z.object({
  placeId: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const meetup = await getMeetupByShareCode(code);

    if (!meetup) {
      return NextResponse.json({ error: "Meetup not found" }, { status: 404 });
    }

    // Verify creator
    const cookieStore = await cookies();
    const creatorCookie = cookieStore.get(`cr_${code}`);
    if (creatorCookie?.value !== meetup.creatorToken) {
      return NextResponse.json(
        { error: "Only the creator can pick a spot" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = pickSchema.parse(body);

    // Verify the place is one of the options
    const option = await getCoffeeOptionByPlaceId(meetup.id, data.placeId);
    if (!option) {
      return NextResponse.json(
        { error: "This coffee shop is not in the options list" },
        { status: 400 }
      );
    }

    await updateMeetupStatus(meetup.id, "decided", data.placeId);

    return NextResponse.json({
      success: true,
      chosenOption: option,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to pick spot:", error);
    return NextResponse.json(
      { error: "Failed to pick spot" },
      { status: 500 }
    );
  }
}
