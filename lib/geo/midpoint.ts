interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Calculate the geographic midpoint (centroid) of multiple coordinates.
 * Uses simple average — accurate enough for city-scale distances.
 */
export function calculateMidpoint(locations: LatLng[]): LatLng {
  if (locations.length === 0) throw new Error("No locations provided");
  if (locations.length === 1) return locations[0];

  const sumLat = locations.reduce((acc, loc) => acc + loc.latitude, 0);
  const sumLng = locations.reduce((acc, loc) => acc + loc.longitude, 0);

  return {
    latitude: sumLat / locations.length,
    longitude: sumLng / locations.length,
  };
}

/**
 * Haversine distance between two points in meters.
 */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);

  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      sinHalfLng *
      sinHalfLng;

  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Standard deviation of distances from a point to each person.
 * Lower = more equidistant = more fair.
 */
export function calculateFairnessScore(
  point: LatLng,
  locations: LatLng[]
): number {
  const distances = locations.map((loc) => haversineDistance(point, loc));
  const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
  const variance =
    distances.reduce((acc, d) => acc + (d - mean) ** 2, 0) / distances.length;
  return Math.sqrt(variance);
}

/**
 * Composite ranking score. Higher = better option.
 *
 * Weights:
 * - Fairness (40%): how equidistant the spot is
 * - Rating (35%): Google rating out of 5
 * - Proximity (25%): how close to the midpoint
 */
export function calculateOverallScore(params: {
  fairnessScore: number;
  rating: number | null;
  distanceFromMidpoint: number;
  maxDistanceFromMidpoint: number;
}): number {
  const { fairnessScore, rating, distanceFromMidpoint, maxDistanceFromMidpoint } =
    params;

  // Normalize fairness: invert so lower stddev = higher score (0-1)
  // Cap at 5000m stddev as "worst case"
  const fairnessNorm = Math.max(0, 1 - fairnessScore / 5000);

  // Normalize rating (0-1), default 3.5 if no rating
  const ratingNorm = (rating ?? 3.5) / 5;

  // Normalize proximity (0-1)
  const maxDist = Math.max(maxDistanceFromMidpoint, 1);
  const proximityNorm = Math.max(0, 1 - distanceFromMidpoint / maxDist);

  return fairnessNorm * 0.4 + ratingNorm * 0.35 + proximityNorm * 0.25;
}
