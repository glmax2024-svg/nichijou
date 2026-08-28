import { MIcon } from "@/components/ui/m-icon";

export function EventBanner({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[#ffd9e0] via-[#ffc9d6] to-[#d9c7f0] ${
        compact ? "mx-4 mb-2 mt-2 h-20" : "mx-[22px] mb-1 mt-2 h-24"
      }`}
    >
      <span className="petal absolute left-[12%] -top-1.5" style={{ animationDelay: "0s" }} />
      <span
        className="petal absolute left-[34%] -top-1.5 h-2 w-2"
        style={{ animationDelay: "1s" }}
      />
      <span
        className="petal absolute left-[58%] -top-1.5"
        style={{ animationDelay: "0.5s" }}
      />
      <span
        className="petal absolute left-[78%] -top-1.5 h-2.5 w-2.5"
        style={{ animationDelay: "1.6s" }}
      />
      <div className="relative flex h-full items-center justify-between px-5">
        <div>
          <div className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[10.5px] font-bold text-[#c0417a]">
            <MIcon name="celebration" className="text-[14px]" />
            期間限定イベント
          </div>
          <div className="mt-1.5 font-display text-lg font-black text-[#5a2a3a] sm:mt-1.5 sm:text-lg">
            七夕まつり · 短冊に願いを
          </div>
        </div>
        <button
          type="button"
          className="rounded-full bg-white px-4 py-2 font-display text-xs font-bold text-[#e0607a]"
        >
          参加する
        </button>
      </div>
    </div>
  );
}
