import { prisma } from "@/lib/prisma";
import { DiscoverPageClient } from "@/components/mobile/discover-page-client";
import { isDemoMode } from "@/lib/runtime";

type DiscoverPageProps = {
  basePath: "/h5" | "/app" | "";
  variant?: "mobile" | "web";
};

export async function DiscoverPage({ basePath, variant = "mobile" }: DiscoverPageProps) {
  const characters = await prisma.character.findMany({
    where: { published: true },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      bio: true,
      avatarUrl: true,
      coverUrl: true,
      tags: true,
      _count: { select: { posts: true, subscriptions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DiscoverPageClient
      basePath={basePath}
      variant={variant}
      characters={characters}
      includeDemoCatalog={isDemoMode()}
    />
  );
}
