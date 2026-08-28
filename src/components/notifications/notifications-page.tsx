import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loginPath } from "@/lib/login-path";
import { getNotifications } from "@/lib/notifications";
import { MobilePageHeader } from "@/components/mobile/mobile-page-header";
import { MIcon } from "@/components/ui/m-icon";
import { AmbientBg } from "@/components/ui/ambient-bg";

type NotificationsPageProps = {
  basePath: "" | "/h5" | "/app";
  variant?: "mobile" | "web";
};

export async function NotificationsPage({
  basePath,
  variant = "mobile",
}: NotificationsPageProps) {
  const session = await auth();
  const notificationsPath = basePath ? `${basePath}/notifications` : "/notifications";

  if (!session?.user) {
    if (basePath) redirect(loginPath(basePath, notificationsPath));
    redirect(`/login?callbackUrl=${encodeURIComponent(notificationsPath)}`);
  }

  const items = await getNotifications(session.user.id, basePath);
  const unread = items.filter((n) => n.unread).length;

  const list = (
    <ul className={variant === "web" ? "divide-y divide-[rgba(120,72,54,0.06)]" : ""}>
      {items.map((n) => (
        <li key={n.id}>
          <Link
            href={n.href}
            className={`flex gap-3 transition hover:bg-[#fffaf8] ${
              variant === "web" ? "px-5 py-4" : "border-b border-[rgba(120,72,54,0.05)] px-[18px] py-3.5"
            } ${n.unread ? "bg-[#fffaf8]" : ""}`}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: `${n.iconColor}18` }}
            >
              <MIcon name={n.icon} className="text-[22px]" style={{ color: n.iconColor }} />
            </div>
            <div className="min-w-0 flex-1 leading-snug">
              <div className="flex items-start justify-between gap-2">
                <span className={`text-[13.5px] ${n.unread ? "font-bold text-[#3a3330]" : "text-[#5a4f48]"}`}>
                  {n.title}
                </span>
                {n.time && <span className="shrink-0 text-[11px] text-[#b0a099]">{n.time}</span>}
              </div>
              <p className="mt-0.5 line-clamp-2 text-[12.5px] text-[#8a7a72]">{n.body}</p>
            </div>
            {n.unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ef7488]" />}
          </Link>
        </li>
      ))}
    </ul>
  );

  if (variant === "web") {
    return (
      <div className="relative min-h-[calc(100vh-60px)]">
        <AmbientBg />
        <div className="relative z-10 mx-auto max-w-[640px] px-4 py-8">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="font-display text-[22px] font-black">通知</h1>
            {unread > 0 && (
              <span className="rounded-full bg-[#ffeef1] px-3 py-1 text-xs font-bold text-[#e0607a]">
                {unread} 件未読
              </span>
            )}
          </div>
          <div className="overflow-hidden rounded-[22px] border border-[rgba(120,72,54,0.07)] bg-white shadow-[0_14px_34px_-24px_rgba(120,72,54,0.5)]">
            {list}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#fbf4f1]">
      <MobilePageHeader
        title="通知"
        backHref={basePath || "/"}
      />
      {unread > 0 && (
        <div className="px-[18px] pb-2 pt-1">
          <span className="rounded-full bg-[#ffeef1] px-3 py-1 text-[11px] font-bold text-[#e0607a]">
            {unread} 件未読
          </span>
        </div>
      )}
      <div className="bg-white">{list}</div>
    </div>
  );
}
