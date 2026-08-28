const MOCK_GIFTS = [
  { icon: "🌸", bg: "#ffe1e6", n: 24 },
  { icon: "☕", bg: "#eaf1fb", n: 12 },
  { icon: "🎂", bg: "#fff2e0", n: 3 },
  { icon: "💐", bg: "#f2ecff", n: 8 },
  { icon: "⭐", bg: "#eafaf1", n: 41 },
];

export function GiftShelf() {
  return (
    <div className="rounded-2xl border border-[rgba(120,72,54,0.07)] bg-[#fbf4f1] p-3.5">
      <div className="mb-2 text-[11.5px] font-bold text-[#8a7a72]">贈られたギフト棚</div>
      <div className="flex flex-wrap gap-2.5">
        {MOCK_GIFTS.map((g) => (
          <div key={g.icon} className="flex w-[52px] flex-col items-center gap-1">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-[14px] text-[22px]"
              style={{ background: g.bg }}
            >
              {g.icon}
            </div>
            <span className="text-[9.5px] text-[#b0a099]">×{g.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
