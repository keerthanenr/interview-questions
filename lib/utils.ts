import { type ClassValue, clsx } from "clsx";
import { nanoid } from "nanoid";
import { twMerge } from "tailwind-merge";
import { CANDIDATE_TOKEN_LENGTH } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateToken(): string {
  return nanoid(CANDIDATE_TOKEN_LENGTH);
}

/**
 * Returns the base URL for the app, using env vars on the server
 * or the request origin as fallback. Never returns localhost in production.
 */
export function getBaseUrl(requestOrigin?: string | null): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (requestOrigin) {
    return requestOrigin;
  }
  return "http://localhost:3000";
}
