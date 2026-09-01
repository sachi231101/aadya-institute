export function getPortalBasePath(pathname: string): "/admin" | "/center" | "/counselor" {
  if (pathname.startsWith("/counselor")) return "/counselor";
  if (pathname.startsWith("/center")) return "/center";
  return "/admin";
}
