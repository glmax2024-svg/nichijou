import { CharacterProfile } from "@/components/character/character-profile";

export default async function H5CharacterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CharacterProfile slug={slug} basePath="/h5" variant="mobile" />;
}
