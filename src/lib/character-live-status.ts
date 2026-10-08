/**
 * 角色「此刻在做什么」。
 *
 * 原先这里写死了葵、澪两个演示角色的作息文案，其他角色一律回退到葵的女高中生作息。
 * 现在没有真实数据时不显示；角色状态的真实来源在后续版本接入。
 */

export type DayPeriod = "night" | "morning" | "school" | "afternoon" | "evening";

export type LiveStatus = {
  id: string;
  title: string;
  caption: string;
  detail: string;
  timeIcon: "dark_mode" | "light_mode" | "wb_twilight" | "school";
  aiPrompt: string;
};

export type DailyMediaItem = {
  id: string;
  type: "image" | "video";
  url: string;
  posterUrl?: string;
  label: string;
};

/** Bucket by Japan Standard Time of day. */
export function getDayPeriod(hourJst: number): DayPeriod {
  if (hourJst >= 21 || hourJst < 6) return "night";
  if (hourJst < 9) return "morning";
  if (hourJst < 15) return "school";
  if (hourJst < 18) return "afternoon";
  return "evening";
}

export function getJstHour(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
}

export function getAmbientGradient(period: DayPeriod): string {
  switch (period) {
    case "night":
      return "linear-gradient(165deg,#2a2438 0%,#4a3d5c 38%,#6b5a7a 100%)";
    case "morning":
      return "linear-gradient(165deg,#ffe8df 0%,#fde0d4 42%,#f9ece7 100%)";
    case "school":
      return "linear-gradient(165deg,#e8f0ff 0%,#f5eeea 45%,#fff6e6 100%)";
    case "afternoon":
      return "linear-gradient(165deg,#fff0e0 0%,#fde8d0 42%,#f9ece7 100%)";
    case "evening":
      return "linear-gradient(165deg,#ffd8c8 0%,#f0c8e0 42%,#e8d8f0 100%)";
  }
}
