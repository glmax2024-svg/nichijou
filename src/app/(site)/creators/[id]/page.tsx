import { CreatorPublicPage } from "@/components/creator/creator-public-page";

export default async function SiteCreatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CreatorPublicPage creatorId={id} />;
}
