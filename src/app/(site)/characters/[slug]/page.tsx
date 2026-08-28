import { CharacterProfile } from "@/components/character/character-profile";

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CharacterProfile slug={slug} variant="web" />;
}
