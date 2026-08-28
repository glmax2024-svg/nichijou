import { SearchPage } from "@/components/search/search-page";

export default async function AppSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  return <SearchPage basePath="/app" q={q} tag={tag} />;
}
