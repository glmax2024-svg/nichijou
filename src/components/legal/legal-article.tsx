import { MobilePageHeader } from "@/components/mobile/mobile-page-header";
import { legalSections, legalTitle, type LegalSlug } from "@/lib/legal";

export function LegalArticlePage({
  slug,
  basePath,
}: {
  slug: LegalSlug;
  basePath: "" | "/h5" | "/app";
}) {
  const title = legalTitle(slug);
  const sections = legalSections(slug);
  const backHref = basePath ? `${basePath}/help` : "/help";

  return (
    <div className="min-h-full bg-[#fbf4f1]">
      <MobilePageHeader title={title} backHref={backHref} />
      <article className="mx-auto max-w-[720px] px-[18px] py-6">
        <p className="text-[12px] text-[#b0a099]">最終更新：2026年8月28日</p>
        <div className="mt-4 space-y-5">
          {sections.map((section) => (
            <section
              key={section.heading}
              className="rounded-[18px] border border-[rgba(120,72,54,0.06)] bg-white px-4 py-4"
            >
              <h2 className="font-display text-[14px] font-bold text-[#3a3330]">{section.heading}</h2>
              {section.body.map((paragraph, index) => (
                <p key={index} className="mt-2 text-[13px] leading-relaxed text-[#5c524c]">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
