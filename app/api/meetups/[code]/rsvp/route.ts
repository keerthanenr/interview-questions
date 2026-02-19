import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getMeetupByShareCode,
  createRsvp,
} from "@/lib/db/queries";
import { geocodeAddress } from "@/lib/geo/geocode";

const rsvpSchema = z.object({
  name: z.string().min(1).max(128),
  email: z.string().email().max(256),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  addressText: z.string().max(512).optional(),
  status: z.enum(["going", "maybe", "declined"]).optional(),
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

    if (meetup.status !== "open") {
      return NextResponse.json(
        { error: "This meetup is no longer accepting RSVPs" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = rsvpSchema.parse(body);

    let { latitude, longitude } = data;
    let addressText = data.addressText;

    // If address provided but no coordinates, geocode it
    if (addressText && (!latitude || !longitude)) {
      try {
        const geocoded = await geocodeAddress(addressText);
        if (geocoded) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
          addressText = geocoded.formattedAddress;
        }
      } catch (geoError) {
        console.error("Geocoding failed:", geoError);
      }
    }

    const rsvp = await createRsvp({
      meetupId: meetup.id,
      name: data.name,
      email: data.email,
      latitude,
      longitude,
      addressText,
      status: data.status,
    });

    return NextResponse.json({ rsvp }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to create RSVP:", error);
    return NextResponse.json(
      { error: "Failed to create RSVP" },
      { status: 500 }
    );
  }
}
