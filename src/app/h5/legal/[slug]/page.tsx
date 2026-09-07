import { notFound } from "next/navigation";
import { LegalArticlePage } from "@/components/legal/legal-article";
import { isLegalSlug } from "@/lib/legal";

export default async function H5LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isLegalSlug(slug)) notFound();
  return <LegalArticlePage slug={slug} basePath="/h5" />;
}
