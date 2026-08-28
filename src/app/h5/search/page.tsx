import { SearchPage } from "@/components/search/search-page";

export default async function H5SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  return <SearchPage basePath="/h5" q={q} tag={tag} />;
}
