import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { birthDate: true, ageVerifiedAt: true },
  });

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      role: session.user.role,
      ageVerified: Boolean(profile?.birthDate && profile.ageVerifiedAt),
    },
  });
}
