export function loginPath(basePath = "", callbackUrl?: string) {
  const target = callbackUrl ?? (basePath || "/");
  const root = basePath === "/h5" ? "/h5/login" : basePath === "/app" ? "/app/login" : "/login";
  return `${root}?callbackUrl=${encodeURIComponent(target)}`;
}

export function isMobileAppPath(path: string) {
  return path.startsWith("/h5") || path.startsWith("/app");
}
