import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalArticlePage } from "@/components/legal/legal-article";
import { isLegalSlug, legalTitle, LEGAL_SLUGS } from "@/lib/legal";

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isLegalSlug(slug)) return {};
  return { title: `${legalTitle(slug)} — 日常 Nichijou` };
}

export default async function SiteLegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isLegalSlug(slug)) notFound();
  return <LegalArticlePage slug={slug} basePath="" />;
}
