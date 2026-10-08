import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decode } from "@auth/core/jwt";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIES = ["__Secure-authjs.session-token", "authjs.session-token"] as const;

/** 未登录也能访问的页面（内测期整站需要登录） */
const PUBLIC_PAGES = [/^\/login$/, /^\/(h5|app)\/login$/, /^\/beta$/, /^\/((h5|app)\/)?legal\/[^/]+$/];

/** 未登录也能调用的接口。其余接口在路由里仍各自鉴权，这里只是多一道门。 */
const PUBLIC_APIS = [
  /^\/api\/auth\//,
  /^\/api\/register$/,
  /^\/api\/beta\/apply$/,
  /^\/api\/mobile\/login$/,
  /^\/api\/webhooks\//,
];

function isInviteOnly() {
  return process.env.NICHIJOU_INVITE_ONLY?.trim().toLowerCase() !== "false";
}

/**
 * JWT 解得开不代表账号还在（被删的账号 token 仍然有效）。在这里核对一次，
 * 结果缓存 5 分钟，避免每个请求都查库。与 auth.ts 里 jwt 回调的核对间隔一致。
 */
const ACCOUNT_CACHE_MS = 5 * 60_000;
const accountCache = new Map<string, { exists: boolean; at: number }>();

async function accountExists(userId: string): Promise<boolean> {
  const hit = accountCache.get(userId);
  if (hit && Date.now() - hit.at < ACCOUNT_CACHE_MS) return hit.exists;
  const exists = Boolean(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }));
  if (accountCache.size > 5000) accountCache.clear();
  accountCache.set(userId, { exists, at: Date.now() });
  return exists;
}

/** 真正解密校验 JWT —— 只看 cookie 在不在的话，随便塞一个假 cookie 就能绕过 */
async function hasValidSession(request: NextRequest): Promise<boolean> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) return false;
  for (const name of SESSION_COOKIES) {
    const token = request.cookies.get(name)?.value;
    if (!token) continue;
    try {
      // Auth.js 用 cookie 名作为 salt
      const payload = await decode({ token, secret, salt: name });
      const userId = (payload?.id ?? payload?.sub) as string | undefined;
      if (userId) return accountExists(userId);
    } catch {
      // 过期、篡改或密钥更换 → 视为未登录
    }
  }
  return false;
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/uploads/lora/") && !(await hasValidSession(request))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // public/ 下的静态文件（图片、图标、字体等）
  const isStaticFile = /\.[a-z0-9]+$/i.test(pathname) && !pathname.startsWith("/api/");

  if (isInviteOnly() && !isStaticFile) {
    const isApi = pathname.startsWith("/api/");
    const isPublic = (isApi ? PUBLIC_APIS : PUBLIC_PAGES).some((re) => re.test(pathname));

    if (!isPublic && !(await hasValidSession(request))) {
      if (isApi) {
        return withSecurityHeaders(NextResponse.json({ error: "ログインが必要です" }, { status: 401 }));
      }
      const loginPath = pathname.startsWith("/h5") ? "/h5/login" : pathname.startsWith("/app") ? "/app/login" : "/login";
      const url = new URL(loginPath, request.url);
      if (pathname !== "/") url.searchParams.set("callbackUrl", `${pathname}${search}`);
      return withSecurityHeaders(NextResponse.redirect(url));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
