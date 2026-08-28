type AffinityBarProps = {
  level: number;
  percent: number;
  label?: string;
  compact?: boolean;
};

export function AffinityBar({ level, percent, label, compact }: AffinityBarProps) {
  return (
    <div
      className={`rounded-2xl border border-[rgba(239,116,136,0.14)] ${
        compact ? "p-3" : "p-4"
      }`}
      style={{ background: "linear-gradient(160deg,#fff,#fff4f6)" }}
    >
      <div className="flex items-center justify-between text-[11.5px] font-bold">
        <span className="text-[#e0607a]">
          {label ?? `親密度 Lv.${level}`}
        </span>
        <span className="text-[#b0a099]">{percent}% / 100</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ffe1e6]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#f79aa8] to-[#ef7488]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
