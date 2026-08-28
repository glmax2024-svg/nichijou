import { FeedPage } from "@/components/feed/feed-page";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <FeedPage variant="web" feedTab={tab} />;
}
