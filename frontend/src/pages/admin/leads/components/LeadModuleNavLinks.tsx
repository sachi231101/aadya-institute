import { Link, useLocation } from "react-router-dom";
import { getPortalBasePath } from "@/utils/portal-path";
import { cn } from "@/utils";

const LINKS: Array<{ label: string; path: string; match: string }> = [
  { label: "All Leads", path: "/leads", match: "leads-all" },
  { label: "Follow-ups", path: "/leads/follow-ups", match: "follow-ups" },
  { label: "Call History", path: "/leads/call-history", match: "call-history" },
  { label: "AI Calling", path: "/leads/ai-calling", match: "ai-calling" },
];

function activeKey(pathname: string): string {
  if (pathname.includes("/leads/follow-ups")) return "follow-ups";
  if (pathname.includes("/leads/call-history")) return "call-history";
  if (pathname.includes("/leads/ai-calling")) return "ai-calling";
  if (
    pathname.endsWith("/leads") ||
    pathname.endsWith("/leads/") ||
    pathname.includes("/leads/all") ||
    pathname.includes("/leads/new") ||
    pathname.includes("/leads/add")
  ) {
    return "leads-all";
  }
  return "";
}

/** Light header cross-links: All Leads ↔ Follow-ups ↔ Call History ↔ AI Calling */
export function LeadModuleNavLinks({ className }: { className?: string }) {
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const current = activeKey(location.pathname);

  return (
    <nav
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
      aria-label="Lead module links"
    >
      {LINKS.map((link, i) => {
        const href = `${basePath}${link.path}`;
        const isActive = current === link.match;
        return (
          <span key={link.match} className="inline-flex items-center gap-1.5">
            {i > 0 ? <span className="text-border">·</span> : null}
            <Link
              to={href}
              className={cn(
                "rounded-md px-1.5 py-0.5 font-medium transition-colors hover:text-foreground hover:bg-muted/60",
                isActive && "text-foreground bg-muted/80"
              )}
            >
              {link.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
