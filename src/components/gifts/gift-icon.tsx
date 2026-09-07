type GiftVisual = {
  emoji: string;
  iconUrl?: string | null;
  accentColor?: string;
};

export function GiftIcon({
  gift,
  size = 40,
  className = "",
}: {
  gift: GiftVisual;
  size?: number;
  className?: string;
}) {
  const bg = gift.accentColor || "#ffe1e6";
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-[14px] ${className}`}
      style={{ width: size, height: size, background: bg }}
    >
      {gift.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={gift.iconUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.48) }}>{gift.emoji}</span>
      )}
    </span>
  );
}
