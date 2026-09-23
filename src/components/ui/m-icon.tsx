import type { CSSProperties } from "react";
import { ICON_NAMES } from "./icon-names";

const KNOWN_ICONS = new Set<string>(ICON_NAMES);
const warned = new Set<string>();

type MIconProps = {
  name: string;
  className?: string;
  filled?: boolean;
  style?: CSSProperties;
};

export function MIcon({ name, className = "", filled, style }: MIconProps) {
  // 图标字体只含 icon-names.ts 里的图标；不在清单里的会显示成文字
  if (process.env.NODE_ENV !== "production" && !KNOWN_ICONS.has(name) && !warned.has(name)) {
    warned.add(name);
    console.warn(`[MIcon] 图标 "${name}" 不在图标字体里，请运行 npm run icons:sync`);
  }
  return (
    <span
      className={`material-symbols-rounded leading-none select-none ${className}`}
      style={{ ...(filled ? { fontVariationSettings: "'FILL' 1" } : {}), ...style }}
      aria-hidden
    >
      {name}
    </span>
  );
}
