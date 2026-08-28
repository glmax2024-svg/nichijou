import { NextResponse } from "next/server";
import {
  DISCOVER_ANIME_CATALOG,
  DISCOVER_CATEGORIES,
  DISCOVER_GENDERS,
} from "@/lib/discover-catalog";
import { isDemoMode } from "@/lib/runtime";

export async function GET() {
  return NextResponse.json({
    items: isDemoMode() ? DISCOVER_ANIME_CATALOG : [],
    categories: DISCOVER_CATEGORIES,
    genders: DISCOVER_GENDERS,
    demo: isDemoMode(),
  });
}
