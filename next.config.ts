import type { NextConfig } from "next";

const CHARACTER_ASSET_VERSION = "20260709";

function storageImagePatterns(): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    { protocol: "https", hostname: "**.r2.dev", pathname: "/**" },
    { protocol: "https", hostname: "**.r2.cloudflarestorage.com", pathname: "/**" },
  ];

  const publicBase = process.env.S3_PUBLIC_BASE_URL?.trim();
  if (!publicBase) return patterns;

  try {
    const url = new URL(publicBase.includes("://") ? publicBase : `https://${publicBase}`);
    const protocol = url.protocol.replace(":", "") as "http" | "https";
    if (protocol !== "http" && protocol !== "https") return patterns;
    if (!patterns.some((item) => "hostname" in item && item.hostname === url.hostname)) {
      patterns.push({ protocol, hostname: url.hostname, pathname: "/**" });
    }
  } catch {
    // ignore malformed S3_PUBLIC_BASE_URL at build time
  }

  return patterns;
}

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
      ...storageImagePatterns(),
    ],
  },
};

export default nextConfig;
