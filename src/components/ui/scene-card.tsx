/** Max attached images for X-style timeline cards. */
export const POST_MEDIA_MAX_HEIGHT = 510;

type SceneCardProps = {
  imageUrl?: string | null;
  maxHeight?: number;
  className?: string;
};

export function SceneCard({
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

  // 没有配图就不渲染：之前会给纯文字动态套一个随机编造的场景（如「夕暮れのカフェ」）
  return null;
}
