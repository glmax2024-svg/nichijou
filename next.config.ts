import type { NextConfig } from "next";

const CHARACTER_ASSET_VERSION = "20260709";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/engines"],
  // Cap build workers so large-CPU hosts (e.g. AutoDL) don't OOM on "Collecting page data"
  experimental: {
    cpus: Number(process.env.NEXT_BUILD_CPUS || 2),
  },
  images: {
    localPatterns: [
      {
        pathname: "/characters/**",
        search: `?v=${CHARACTER_ASSET_VERSION}`,
      },
      {
        pathname: "/characters/**",
        search: "",
      },
      {
        pathname: "/uploads/**",
        search: "",
      },
      {
        pathname: "/discover/**",
        search: "",
      },
    ],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "cdn.coverr.co" },
    ],
  },
};

export default nextConfig;
