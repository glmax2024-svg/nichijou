import Link from "next/link";
import { MIcon } from "@/components/ui/m-icon";
import { eventTheme, type PublicEvent } from "@/lib/event-themes";

/** 首页活动横幅；有多个进行中的活动时横向滑动 */
export function EventBanners({
  events,
  basePath,
  compact,
}: {
  events: PublicEvent[];
  basePath: string;
  compact?: boolean;
}) {
  if (events.length === 0) return null;
  return (
    <div
      className={`flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] ${
        compact ? "mx-4 mb-2 mt-2" : "mx-[22px] mb-1 mt-2"
      }`}
    >
      {events.map((event) => (
        <EventBanner key={event.id} event={event} basePath={basePath} compact={compact} single={events.length === 1} />
      ))}
    </div>
  );
}

function EventBanner({
  event,
  basePath,
  compact,
  single,
}: {
  event: PublicEvent;
  basePath: string;
  compact?: boolean;
  single: boolean;
}) {
  const theme = eventTheme(event.theme);
  const detailHref = `${basePath}/events/${event.id}`;
  const href = event.linkHref ?? detailHref;
  const external = href.startsWith("https://");

  return (
    <div
      className={`relative shrink-0 snap-start overflow-hidden rounded-[18px] ${compact ? "h-20" : "h-24"} ${
        single ? "w-full" : "w-[88%]"
      }`}
      style={{ background: theme.background }}
    >
      {event.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.imageUrl} alt="" className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-90 [mask-image:linear-gradient(90deg,transparent,#000_45%)]" />
      )}
      <div className="relative flex h-full items-center justify-between gap-3 px-5">
        <Link href={detailHref} className="min-w-0">
          <div
            className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[10.5px] font-bold"
            style={{ color: theme.accent }}
          >
            <MIcon name="celebration" className="text-[14px]" />
            {event.badge}
          </div>
          <div className="mt-1.5 truncate font-display text-lg font-black" style={{ color: theme.ink }}>
            {event.title}
          </div>
          {!compact && event.subtitle && (
            <div className="truncate text-[11.5px] opacity-80" style={{ color: theme.ink }}>
              {event.subtitle}
            </div>
          )}
        </Link>
        <Link
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="shrink-0 rounded-full bg-white px-4 py-2 font-display text-xs font-bold"
          style={{ color: theme.accent }}
        >
          {event.ctaLabel}
        </Link>
      </div>
    </div>
  );
}
