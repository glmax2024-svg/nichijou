import type { ScenePreset } from "@/lib/scenes";

/** Max attached images for X-style timeline cards. */
export const POST_MEDIA_MAX_HEIGHT = 510;

type SceneCardProps = {
  scene: ScenePreset;
  imageUrl?: string | null;
  maxHeight?: number;
  className?: string;
};

export function SceneCard({
  scene,
  imageUrl,
  maxHeight = POST_MEDIA_MAX_HEIGHT,
  className = "",
}: SceneCardProps) {
  const shellClass = `relative w-full overflow-hidden rounded-[18px] border border-[rgba(120,72,54,0.08)] ${className}`;

  if (imageUrl) {
    return (
      <div className={`${shellClass} bg-[#f3eeeb]`} style={{ maxHeight }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="mx-auto block h-auto w-full object-contain object-center"
          style={{ maxHeight }}
          loading="lazy"
        />
      </div>
    );
  }

  const fallbackHeight = Math.min(200, maxHeight);

  return (
    <div
      className={shellClass}
      style={{ height: fallbackHeight, maxHeight, background: scene.scene }}
    >
      <div
        className="absolute -right-1 -top-7 h-[82px] w-[82px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${scene.sceneAccent}, transparent 70%)`,
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
      <div className="absolute bottom-3 left-4 font-display text-[13px] font-bold text-white/95 drop-shadow">
        {scene.sceneLabel}
      </div>
    </div>
  );
}
