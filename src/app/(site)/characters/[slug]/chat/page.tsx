import { CharacterChatPage } from "@/components/chat/character-chat-page";

export default async function SiteCharacterChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ skill?: string; post?: string }>;
}) {
  const { slug } = await params;
  const { skill, post } = await searchParams;
  return (
    <CharacterChatPage slug={slug} variant="web" activeSkill={skill} activePostId={post} />
  );
}
