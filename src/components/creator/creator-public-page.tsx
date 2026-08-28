import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveAnimeAvatar, resolveAnimeCover } from "@/lib/character-media";
import { getCreatorPipeline } from "@/lib/studio-brand";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { MIcon } from "@/components/ui/m-icon";
import { getRequestLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n";

type CreatorPublicPageProps = {
  creatorId: string;
};

export async function CreatorPublicPage({ creatorId }: CreatorPublicPageProps) {
  const locale = await getRequestLocale();
  const dict = getDictionary(locale);
  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: {
      id: true,
      name: true,
      bio: true,
      role: true,
      characters: {
        where: { published: true },
        orderBy: { createdAt: "asc" },
        select: {
          slug: true,
          name: true,
          tagline: true,
          avatarUrl: true,
          coverUrl: true,
          subscriptionPrice: true,
          _count: { select: { subscriptions: true, posts: true } },
        },
      },
    },
  });

  if (!creator || (creator.role !== "CREATOR" && creator.role !== "ADMIN")) {
    notFound();
  }

  const totalSubs = creator.characters.reduce((s, c) => s + c._count.subscriptions, 0);
  const pipeline = getCreatorPipeline(dict);

  return (
    <div className="relative min-h-[calc(100vh-64px)]">
      <AmbientBg />
      <div className="relative z-10 mx-auto max-w-[880px] px-4 py-10">
        <section className="overflow-hidden rounded-[28px] border border-[rgba(120,72,54,0.07)] bg-white shadow-[0_28px_60px_-38px_rgba(120,72,54,0.5)]">
          <div
            className="px-6 py-8 sm:px-8"
            style={{ background: "linear-gradient(135deg,#fff4f6 0%,#fff 60%,#eef1ff 100%)" }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#f79aa8] to-[#ef7488] shadow-lg">
                <MIcon name="brush" className="text-[34px] text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-[28px] font-black text-[#3a3330]">
                    {creator.name ?? "クリエイター"}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#eef1ff] px-2.5 py-1 text-[11px] font-bold text-[#6b7fd0]">
                    <MIcon name="verified" className="text-[14px]" />
                    Verified Creator
                  </span>
                </div>
                <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-[#8a7a72]">
                  {creator.bio ?? "Official Character を育てるクリエイター"}
                </p>
                <p className="mt-3 text-[12px] font-bold text-[#5a4f48]">
                  {creator.characters.length} Official Characters ·{" "}
                  {totalSubs.toLocaleString()} {dict.studio.totalFans}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[rgba(120,72,54,0.07)] px-6 py-5 sm:px-8">
            <h2 className="text-xs font-bold text-[#8a7a72]">{dict.creator.brandChain}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {pipeline.map((step) => (
                <div
                  key={step.step}
                  className="flex items-start gap-3 rounded-[14px] bg-[#fbf4f1] px-3.5 py-3"
                >
                  <MIcon name={step.icon} className="mt-0.5 shrink-0 text-[18px] text-[#ef7488]" />
                  <div>
                    <div className="text-[13px] font-bold text-[#3a3330]">{step.title}</div>
                    <div className="mt-0.5 text-[11px] leading-relaxed text-[#8a7a72]">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-4 font-display text-lg font-black text-[#3a3330]">
            Official Characters
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {creator.characters.map((c) => (
              <Link
                key={c.slug}
                href={`/characters/${c.slug}`}
                className="group overflow-hidden rounded-[22px] border border-[rgba(120,72,54,0.08)] bg-white shadow-sm transition hover:border-[#ef7488]/25 hover:shadow-md"
              >
                <div className="relative h-[100px]">
                  <Image
                    src={resolveAnimeCover(c.slug, c.coverUrl)}
                    alt=""
                    fill
                    className="object-cover object-top transition group-hover:scale-[1.02]"
                    sizes="400px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                </div>
                <div className="relative -mt-8 flex items-end gap-3 px-4 pb-4">
                  <div className="relative h-14 w-14 overflow-hidden rounded-[16px] border-[3px] border-white shadow-md">
                    <Image
                      src={resolveAnimeAvatar(c.slug, c.avatarUrl)}
                      alt={c.name}
                      fill
                      className="object-cover object-top"
                      sizes="56px"
                    />
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="font-display text-[17px] font-black text-[#3a3330]">{c.name}</div>
                    <div className="truncate text-[11px] text-[#8a7a72]">{c.tagline}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-[rgba(120,72,54,0.06)] px-4 py-3 text-[11px] font-bold text-[#8a7a72]">
                  <span>{c._count.posts} 投稿</span>
                  <span>{c._count.subscriptions.toLocaleString()} 推し</span>
                  <span className="text-[#ef7488]">¥{c.subscriptionPrice.toLocaleString()}/月</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
