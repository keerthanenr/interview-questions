import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getMeetupByShareCode,
  getGoingRsvpsWithLocation,
  saveCoffeeOptions,
} from "@/lib/db/queries";
import {
  calculateMidpoint,
  haversineDistance,
  calculateFairnessScore,
  calculateOverallScore,
} from "@/lib/geo/midpoint";
import { searchCoffeeShopsNearby } from "@/lib/geo/places";
import { MAX_COFFEE_OPTIONS } from "@/lib/constants";


export async function POST(
  _request: Request,
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
        { error: "Only the creator can find spots" },
        { status: 403 }
      );
    }

    const rsvpsWithLocation = await getGoingRsvpsWithLocation(meetup.id);

    if (rsvpsWithLocation.length < 2) {
      return NextResponse.json(
        {
          error:
            "Need at least 2 people with shared locations to find coffee spots",
        },
        { status: 400 }
      );
    }

    const locations = rsvpsWithLocation.map((r) => ({
      latitude: r.latitude!,
      longitude: r.longitude!,
    }));

    const midpoint = calculateMidpoint(locations);

    const places = await searchCoffeeShopsNearby({
      latitude: midpoint.latitude,
      longitude: midpoint.longitude,
    });

    if (places.length === 0) {
      return NextResponse.json(
        { error: "No coffee shops found near the midpoint. Try a wider area." },
        { status: 404 }
      );
    }

    // Calculate scores for each place
    const maxDistFromMidpoint = Math.max(
      ...places.map((p) =>
        haversineDistance(midpoint, {
          latitude: p.latitude,
          longitude: p.longitude,
        })
      )
    );

    const scoredOptions = places
      .map((place) => {
        const placeLocation = {
          latitude: place.latitude,
          longitude: place.longitude,
        };

        const distanceScores: Record<string, number> = {};
        for (const rsvp of rsvpsWithLocation) {
          distanceScores[rsvp.id] = Math.round(
            haversineDistance(placeLocation, {
              latitude: rsvp.latitude!,
              longitude: rsvp.longitude!,
            })
          );
        }

        const fairnessScore = calculateFairnessScore(placeLocation, locations);
        const distFromMidpoint = haversineDistance(midpoint, placeLocation);

        const overallScore = calculateOverallScore({
          fairnessScore,
          rating: place.rating,
          distanceFromMidpoint: distFromMidpoint,
          maxDistanceFromMidpoint: maxDistFromMidpoint,
        });

        return {
          googlePlaceId: place.placeId,
          name: place.name,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          rating: place.rating,
          priceLevel: place.priceLevel,
          photoReference: place.photoReference,
          distanceScores,
          fairnessScore: Math.round(fairnessScore),
          overallScore: Math.round(overallScore * 100) / 100,
        };
      })
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, MAX_COFFEE_OPTIONS);

    const savedOptions = await saveCoffeeOptions(meetup.id, scoredOptions);

    return NextResponse.json({
      midpoint,
      coffeeOptions: savedOptions,
      rsvpCount: rsvpsWithLocation.length,
    });
  } catch (error) {
    console.error("Failed to find spots:", error);
    return NextResponse.json(
      { error: "Failed to find coffee spots" },
      { status: 500 }
    );
  }
}
