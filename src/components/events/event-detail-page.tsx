import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEventForViewer } from "@/lib/events";
import { eventTheme } from "@/lib/event-themes";
import { MIcon } from "@/components/ui/m-icon";

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export async function EventDetailPage({ id, basePath }: { id: string; basePath: "" | "/h5" | "/app" }) {
  const session = await auth();
  const event = await getEventForViewer(id, session?.user?.role === "ADMIN");
  if (!event) notFound();

  const theme = eventTheme(event.theme);
  const ended = new Date(event.endsAt) <= new Date();
  const external = event.linkHref?.startsWith("https://");

  return (
    <div className="min-h-full bg-[#fbf4f1]">
      <div className="mx-auto max-w-[640px] px-4 py-6">
        <Link href={basePath || "/"} className="inline-flex items-center gap-1 text-[13px] font-bold text-[#8a7a72]">
          <MIcon name="arrow_back" className="text-[18px]" />
          ホーム
        </Link>

        <div className="mt-3 overflow-hidden rounded-[24px] bg-white shadow-[0_24px_60px_-40px_rgba(120,72,54,0.5)]">
          <div className="relative h-44" style={{ background: theme.background }}>
            {event.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div
              className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold"
              style={{ color: theme.accent }}
            >
              <MIcon name="celebration" className="text-[14px]" />
              {event.badge}
            </div>
          </div>
          <div className="p-6">
            <h1 className="font-display text-[24px] font-black text-[#3a3330]">{event.title}</h1>
            {event.subtitle && <p className="mt-1 text-[14px] text-[#8a7a72]">{event.subtitle}</p>}
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#fbf4f1] px-3 py-1.5 text-[12px] font-bold text-[#8a7a72]">
              <MIcon name="schedule" className="text-[15px]" />
              {dateFormat.format(new Date(event.startsAt))} 〜 {dateFormat.format(new Date(event.endsAt))}
              {ended && " · 終了しました"}
            </p>
            {event.description && (
              <div className="mt-5 whitespace-pre-wrap text-[14.5px] leading-[1.9] text-[#463d38]">{event.description}</div>
            )}
            {event.linkHref && !ended && (
              <Link
                href={event.linkHref}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="btn-primary mt-6 flex w-full items-center justify-center rounded-[15px] py-3 text-[15px]"
              >
                {event.ctaLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
