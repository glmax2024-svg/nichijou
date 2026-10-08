import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";
import { consumeRateLimit } from "@/lib/security/rate-limit";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }

  interface User {
    role: UserRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    /** 上次与数据库核对账号状态的时间（毫秒） */
    checkedAt?: number;
  }
}

const ACCOUNT_RECHECK_MS = 5 * 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const limited = consumeRateLimit(`auth:login:${email.toLowerCase()}`, {
          limit: 10,
          windowMs: 15 * 60_000,
        });
        if (!limited.ok) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.checkedAt = Date.now();
        return token;
      }
      // JWT 本身不会因为账号被删或降级而失效：定期回数据库核对一次
      if (token.id && Date.now() - (token.checkedAt ?? 0) > ACCOUNT_RECHECK_MS) {
        const fresh = await prisma.user.findUnique({ where: { id: token.id }, select: { role: true } });
        if (!fresh) return null; // 账号已删除 → 登录态作废
        token.role = fresh.role;
        token.checkedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
