import Link from "next/link";
import Image from "next/image";
import { resolveAnimeAvatar, resolveAnimeCover } from "@/lib/character-media";
import { getCreatorPipeline, getCreatorValueProps } from "@/lib/studio-brand";
import { MIcon } from "@/components/ui/m-icon";
import { getRequestLocale } from "@/i18n/server";
import { formatMessage, getDictionary } from "@/i18n";

type StudioCharacter = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  avatarUrl: string;
  coverUrl: string | null;
  subscriptionPrice: number;
  published: boolean;
  loraStatus: string;
  _count: { posts: number; subscriptions: number };
};

type StudioDashboardProps = {
  creator: {
    id: string;
    name: string | null;
    bio: string | null;
  };
  characters: StudioCharacter[];
};

export async function StudioDashboard({ creator, characters }: StudioDashboardProps) {
  const locale = await getRequestLocale();
  const dict = getDictionary(locale);
  const featured = characters[0] ?? null;
  const totalSubs = characters.reduce((s, c) => s + c._count.subscriptions, 0);
  const totalPosts = characters.reduce((s, c) => s + c._count.posts, 0);
  const mrr = characters.reduce(
    (s, c) => s + c._count.subscriptions * c.subscriptionPrice,
    0,
  );
  const pipeline = getCreatorPipeline(dict);
  const valueProps = getCreatorValueProps(dict);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-[rgba(120,72,54,0.07)] bg-white shadow-[0_28px_60px_-38px_rgba(120,72,54,0.5)]">
        <div
          className="border-b border-[rgba(120,72,54,0.07)] px-6 py-6 sm:px-8"
          style={{ background: "linear-gradient(135deg,#fff4f6 0%,#fff 55%,#eef1ff 100%)" }}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#f79aa8] to-[#ef7488] shadow-[0_10px_24px_-12px_rgba(239,116,136,0.75)]">
                <MIcon name="brush" className="text-[30px] text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-black text-[#3a3330]">
                    {creator.name ?? "クリエイター"}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#eef1ff] px-2.5 py-1 text-[11px] font-bold text-[#6b7fd0]">
                    <MIcon name="verified" className="text-[14px]" />
                    Verified Creator
                  </span>
                </div>
                <p className="mt-1 max-w-[520px] text-sm leading-relaxed text-[#8a7a72]">
                  {creator.bio ?? "キャラクターの日常を描き、推しとして育てるクリエイター"}
                </p>
                <Link
                  href={`/creators/${creator.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#ef7488] hover:underline"
                >
                  公開クリエイターページを見る
                  <MIcon name="open_in_new" className="text-[15px]" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: dict.studio.officialChars, value: String(characters.length) },
                { label: dict.studio.totalFans, value: totalSubs.toLocaleString() },
                { label: dict.studio.estMrr, value: `¥${mrr.toLocaleString()}` },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-[14px] border border-[rgba(120,72,54,0.08)] bg-white/80 px-3 py-2.5 text-center"
                >
                  <div className="font-display text-lg font-black text-[#3a3330]">{value}</div>
                  <div className="text-[10px] font-bold text-[#b0a099]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-[rgba(120,72,54,0.07)] px-6 py-5 sm:grid-cols-4 sm:px-8">
          {pipeline.map((step) => (
            <div key={step.step} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fbf4f1]">
                <MIcon name={step.icon} className="text-[18px] text-[#ef7488]" />
              </div>
              <div className="min-w-0 leading-snug">
                <div className="text-[10px] font-bold text-[#b0a099]">{step.step}</div>
                <div className="text-[13px] font-bold text-[#3a3330]">{step.title}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-[#8a7a72]">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 px-6 py-4 sm:px-8">
          {valueProps.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#fbf4f1] px-3 py-1.5 text-[11px] font-bold text-[#5a4f48]"
            >
              <MIcon name={item.icon} className="text-[15px] text-[#ef7488]" />
              {item.label}
              <span className="font-normal text-[#8a7a72]">· {item.desc}</span>
            </span>
          ))}
        </div>
      </section>

      {characters.length === 0 ? (
        <div className="rounded-[28px] border border-[rgba(120,72,54,0.07)] bg-white p-16 text-center shadow-sm">
          <MIcon name="palette" className="mx-auto text-[40px] text-[#ef7488]/40" />
          <p className="mt-4 font-display font-bold text-[#3a3330]">
            {dict.studioEmpty.createFirst}
          </p>
          <p className="mt-2 text-sm text-[#b0a099]">
            {dict.studioEmpty.createFirstHint}
          </p>
          <Link
            href="/studio/characters/new"
            className="btn-primary mt-6 inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm"
          >
            <MIcon name="add" className="text-[18px] text-white" />
            新しいキャラ
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-[24px] border border-[rgba(120,72,54,0.07)] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-[#8a7a72]">Official Characters</span>
              <Link
                href="/studio/characters/new"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fbf4f1] text-[#ef7488] hover:bg-[#fff4f6]"
                aria-label="新しいキャラ"
              >
                <MIcon name="add" className="text-[20px]" />
              </Link>
            </div>
            <div className="space-y-2">
              {characters.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/studio/characters/${c.id}`}
                  className={`flex items-center gap-3 rounded-[18px] p-3 transition ${
                    i === 0
                      ? "border-[1.5px] border-[#ef7488] bg-[#fff4f6] shadow-[0_10px_24px_-18px_rgba(239,116,136,0.5)]"
                      : "border border-[rgba(120,72,54,0.07)] bg-[#fbf4f1] hover:bg-white"
                  }`}
                >
                  <div className="relative h-[46px] w-[46px] shrink-0 overflow-hidden rounded-[15px]">
                    <Image
                      src={resolveAnimeAvatar(c.slug, c.avatarUrl)}
                      alt={c.name}
                      fill
                      className="object-cover object-top"
                      sizes="46px"
                    />
                  </div>
                  <div className="min-w-0 flex-1 leading-snug">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-display text-[15px] font-bold">{c.name}</span>
                      {c.published && (
                        <MIcon name="verified" className="shrink-0 text-[14px] text-[#6b7fd0]" />
                      )}
                    </div>
                    <div className="truncate text-[11px] text-[#8a7a72]">
                      {c._count.posts} 投稿 · {c._count.subscriptions.toLocaleString()} 推し
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </aside>

          {featured && (
            <div className="overflow-hidden rounded-[24px] border border-[rgba(120,72,54,0.07)] bg-white shadow-sm">
              <div className="relative h-[140px]">
                <Image
                  src={resolveAnimeCover(featured.slug, featured.coverUrl)}
                  alt=""
                  fill
                  className="object-cover object-top"
                  sizes="600px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-4 left-5 flex items-end gap-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-[20px] border-[3px] border-white shadow-lg">
                    <Image
                      src={resolveAnimeAvatar(featured.slug, featured.avatarUrl)}
                      alt={featured.name}
                      fill
                      className="object-cover object-top"
                      sizes="64px"
                    />
                  </div>
                  <div className="leading-snug text-white">
                    <div className="font-display text-xl font-black">{featured.name}</div>
                    <div className="text-[12px] text-white/85">{featured.tagline}</div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#eef1ff] px-2.5 py-1 text-[11px] font-bold text-[#6b7fd0]">
                    <MIcon name="verified" className="text-[13px]" />
                    Official by {creator.name}
                  </span>
                  <span className="rounded-full bg-[#eafaf1] px-2.5 py-1 text-[11px] font-bold text-[#3fae76]">
                    LoRA · {featured.loraStatus}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[#5a4f48]">
                  {formatMessage(dict.studio.brandLine, {
                    name: creator.name ?? "クリエイター",
                  })}
                </p>

                <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "投稿", value: `${featured._count.posts} 件` },
                    { label: "推し", value: featured._count.subscriptions.toLocaleString() },
                    { label: "月额", value: `¥${featured.subscriptionPrice.toLocaleString()}` },
                    { label: "总投稿", value: `${totalPosts} 件` },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-[12px] bg-[#fbf4f1] px-3 py-2.5">
                      <dt className="text-[10px] text-[#b0a099]">{label}</dt>
                      <dd className="mt-0.5 font-display text-[15px] font-black text-[#3a3330]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Link
                    href={`/studio/characters/${featured.id}#library`}
                    className="btn-primary inline-flex items-center gap-1.5 rounded-[14px] px-4 py-2.5 text-sm"
                  >
                    <MIcon name="inventory_2" className="text-[18px] text-white" />
                    {dict.studio.doneLora}
                  </Link>
                  <Link
                    href={`/studio/characters/${featured.id}#train`}
                    className="btn-dark inline-flex items-center gap-1.5 rounded-[14px] px-4 py-2.5 text-sm"
                  >
                    <MIcon name="model_training" className="text-[18px] text-white" />
                    LoRA を訓練
                  </Link>
                  <Link
                    href={`/studio/characters/${featured.id}#generate`}
                    className="btn-dark inline-flex items-center gap-1.5 rounded-[14px] px-4 py-2.5 text-sm"
                  >
                    <MIcon name="auto_awesome" className="text-[18px] text-white" />
                    LoRA で生成
                  </Link>
                  <Link
                    href={`/studio/characters/${featured.id}#post`}
                    className="inline-flex items-center gap-1.5 rounded-[14px] border border-[rgba(120,72,54,0.12)] bg-[#fbf4f1] px-4 py-2.5 text-sm font-bold text-[#5a4f48] hover:border-[#ef7488]/25 hover:text-[#ef7488]"
                  >
                    <MIcon name="edit" className="text-[18px]" />
                    日常を投稿
                  </Link>
                  <Link
                    href={`/characters/${featured.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-[14px] border border-[rgba(120,72,54,0.12)] bg-white px-4 py-2.5 text-sm font-bold text-[#5a4f48] hover:border-[#ef7488]/25 hover:text-[#ef7488]"
                  >
                    <MIcon name="public" className="text-[18px]" />
                    公開プロフィール
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
