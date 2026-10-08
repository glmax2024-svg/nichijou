import { prisma } from "@/lib/prisma";
import { DiscoverPageClient } from "@/components/mobile/discover-page-client";

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
      gender: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // 「聊过的人数」：给这个角色发过消息的不同用户数
  const chatters = await prisma.message.groupBy({
    by: ["characterId", "userId"],
    where: { role: "user", characterId: { in: characters.map((c) => c.id) } },
  });
  const chatUsers = new Map<string, number>();
  for (const row of chatters) chatUsers.set(row.characterId, (chatUsers.get(row.characterId) ?? 0) + 1);

  return (
    <DiscoverPageClient
      basePath={basePath}
      variant={variant}
      characters={characters.map((c) => ({ ...c, chatUsers: chatUsers.get(c.id) ?? 0 }))}
    />
  );
}
