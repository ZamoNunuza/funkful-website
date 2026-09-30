import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "qamvwmrhcpqawjhbznzf.supabase.co" },
    ],
  },
  reactCompiler: true,
};

export default nextConfig;
