import type { CSSProperties } from "react";

type MIconProps = {
  name: string;
  className?: string;
  filled?: boolean;
  style?: CSSProperties;
};

export function MIcon({ name, className = "", filled, style }: MIconProps) {
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
