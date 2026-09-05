export function getPortalBasePath(
  pathname: string
): "/admin" | "/center" | "/counselor" | "/faculty" {
  if (pathname.startsWith("/faculty")) return "/faculty";
  if (pathname.startsWith("/counselor")) return "/counselor";
  if (pathname.startsWith("/center")) return "/center";
  return "/admin";
}
