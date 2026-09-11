export function getPortalBasePath(
  pathname: string
): "/admin" | "/center" | "/counselor" | "/faculty" {
  if (pathname.startsWith("/faculty")) return "/faculty";
  if (pathname.startsWith("/counselor")) return "/counselor";
  if (pathname.startsWith("/center")) return "/center";
  return "/admin";
}

export function isFeeNavItemActive(pathname: string, url: string): boolean {
  if (url.endsWith("/fees/invoices") && pathname.includes("/fees/other-invoices")) {
    return true;
  }
  if (url.endsWith("/fees/receipts") && pathname.includes("/fees/payments")) {
    return true;
  }
  return pathname === url || pathname.startsWith(`${url}/`);
}

