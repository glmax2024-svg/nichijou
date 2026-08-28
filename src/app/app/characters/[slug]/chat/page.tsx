import { CharacterChatPage } from "@/components/chat/character-chat-page";

export default async function AppCharacterChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ skill?: string; post?: string }>;
}) {
  const { slug } = await params;
  const { skill, post } = await searchParams;
  return (
    <CharacterChatPage
      slug={slug}
      basePath="/app"
      variant="mobile"
      activeSkill={skill}
      activePostId={post}
    />
  );
}
