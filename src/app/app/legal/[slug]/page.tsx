import { notFound } from "next/navigation";
import { LegalArticlePage } from "@/components/legal/legal-article";
import { isLegalSlug } from "@/lib/legal";

export default async function AppLegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isLegalSlug(slug)) notFound();
  return <LegalArticlePage slug={slug} basePath="/app" />;
}
