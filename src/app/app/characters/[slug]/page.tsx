import { CharacterProfile } from "@/components/character/character-profile";

export default async function AppCharacterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CharacterProfile slug={slug} basePath="/app" variant="mobile" />;
}
