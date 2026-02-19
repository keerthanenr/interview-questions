import { NextResponse } from "next/server";
import { z } from "zod";
import { geocodeAddress } from "@/lib/geo/geocode";

const geocodeSchema = z.object({
  address: z.string().min(1).max(512),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = geocodeSchema.parse(body);

    const result = await geocodeAddress(data.address);

    if (!result) {
      return NextResponse.json(
        { error: "Could not find that address" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Geocoding failed:", error);
    return NextResponse.json(
      { error: "Geocoding failed" },
      { status: 500 }
    );
  }
}
