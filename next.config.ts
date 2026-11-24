
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qamvwmrhcpqawjhbznzf.supabase.co",
      },
    ],
    formats: ["image/webp"],
    qualities: [75],
  },
  reactCompiler: true,
};

export default nextConfig;
