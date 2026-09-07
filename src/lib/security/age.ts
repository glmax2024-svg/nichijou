import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 成年年齢（民法、2022年4月以降）。有料サービス・契約は18歳以上。 */
export const MIN_SERVICE_AGE = 18;

const JST_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function calendarParts(date: Date): { y: number; m: number; d: number } {
  const [y, m, d] = JST_DATE.format(date).split("-").map(Number);
  return { y, m, d };
}

export function ageInJapan(birthDate: Date, now = new Date()): number {
  const birth = calendarParts(birthDate);
  const today = calendarParts(now);
  let age = today.y - birth.y;
  if (today.m < birth.m || (today.m === birth.m && today.d < birth.d)) {
    age -= 1;
  }
  return age;
}

export function parseBirthDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  if (utc.getTime() > Date.now()) return null;
  return utc;
}

export function isAdultBirthDate(birthDate: Date, now = new Date()): boolean {
  return ageInJapan(birthDate, now) >= MIN_SERVICE_AGE;
}

export function ageRequiredResponse() {
  return NextResponse.json(
    {
      error: "18歳以上であることの確認が必要です",
      code: "AGE_REQUIRED",
    },
    { status: 403 },
  );
}

export function underageResponse() {
  return NextResponse.json(
    {
      error: "18歳未満の方はご利用いただけません",
      code: "UNDERAGE",
    },
    { status: 403 },
  );
}

export async function enforceAdultUser(userId: string): Promise<NextResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { birthDate: true },
  });
  if (!user?.birthDate) return ageRequiredResponse();
  if (!isAdultBirthDate(user.birthDate)) return underageResponse();
  return null;
}
