import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "qamvwmrhcpqawjhbznzf.supabase.co" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  reactCompiler: true,
};

export default nextConfig;
