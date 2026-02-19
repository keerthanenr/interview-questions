import { DEFAULT_SEARCH_RADIUS_METERS } from "../constants";

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  priceLevel: number | null;
  photoReference: string | null;
}

/**
 * Search for coffee shops near a given point using Google Places Nearby Search.
 */
export async function searchCoffeeShopsNearby(params: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY not set");

  const radius = params.radiusMeters || DEFAULT_SEARCH_RADIUS_METERS;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${params.latitude},${params.longitude}&radius=${radius}&type=cafe&keyword=coffee&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places API status: ${data.status}`);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Google API response
  return (data.results || []).map((place: any) => ({
    placeId: place.place_id,
    name: place.name,
    address: place.vicinity || place.formatted_address || "",
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    rating: place.rating ?? null,
    priceLevel: place.price_level ?? null,
    photoReference: place.photos?.[0]?.photo_reference ?? null,
  }));
}

/**
 * Build a URL for a Google Place photo.
 */
export function getPlacePhotoUrl(
  photoReference: string,
  maxWidth = 400
): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}

/**
 * Build a Google Maps static map URL showing multiple markers.
 */
export function getStaticMapUrl(params: {
  center: { latitude: number; longitude: number };
  markers: Array<{
    latitude: number;
    longitude: number;
    label?: string;
    color?: string;
  }>;
  width?: number;
  height?: number;
  zoom?: number;
}): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return "";

  const { center, markers, width = 600, height = 400, zoom = 13 } = params;
  let url = `https://maps.googleapis.com/maps/api/staticmap?center=${center.latitude},${center.longitude}&zoom=${zoom}&size=${width}x${height}&scale=2&maptype=roadmap&style=feature:all|element:geometry|color:0x242f3e&style=feature:all|element:labels.text.stroke|color:0x242f3e&style=feature:all|element:labels.text.fill|color:0x746855&style=feature:water|element:geometry|color:0x17263c&key=${apiKey}`;

  for (const marker of markers) {
    const color = marker.color || "red";
    const label = marker.label || "";
    url += `&markers=color:${color}|label:${label}|${marker.latitude},${marker.longitude}`;
  }

  return url;
}
