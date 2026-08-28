import { SearchPage } from "@/components/search/search-page";

export default async function SiteSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  return <SearchPage basePath="" q={q} tag={tag} variant="web" />;
}
