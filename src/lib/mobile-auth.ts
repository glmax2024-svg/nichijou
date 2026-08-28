import { encode } from "@auth/core/jwt";
import type { UserRole } from "@prisma/client";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export type MobileSessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
};

function useSecureCookies() {
  const url = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  return url.startsWith("https://");
}

/** Cookie name doubles as the JWT salt in Auth.js. */
export function sessionCookieName() {
  return useSecureCookies()
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}

export async function encodeSessionToken(user: MobileSessionUser) {
  const salt = sessionCookieName();
  const now = Math.floor(Date.now() / 1000);
  return encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.image,
      role: user.role,
      iat: now,
      exp: now + SESSION_MAX_AGE,
    },
    secret: getAuthSecret(),
    salt,
    maxAge: SESSION_MAX_AGE,
  });
}

export function sessionCookieHeader(token: string) {
  const name = sessionCookieName();
  const secure = useSecureCookies();
  const parts = [
    `${name}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookieHeader() {
  const name = sessionCookieName();
  const secure = useSecureCookies();
  const parts = [`${name}=`, "Path=/", "Max-Age=0", "HttpOnly", "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
