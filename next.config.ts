import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/assess/[token]/review": ["./data/review-scenarios/**/*"],
    "/api/assess/review/submit": ["./data/review-scenarios/**/*"],
    "/api/assess/questions/generate": ["./data/fallback-questions.json"],
  },
};

export default nextConfig;
