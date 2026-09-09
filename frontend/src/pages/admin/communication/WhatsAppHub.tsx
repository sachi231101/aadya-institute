import { NavLink, Outlet, useLocation } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { cn } from "@/utils";

const TABS = [
  { label: "Automations", segment: "automations", suffix: /\/automations\/?$/ },
  { label: "Templates", segment: "templates", suffix: /\/templates\/?$/ },
  { label: "History", segment: "history", suffix: /\/history\/?$/ },
] as const;

/**
 * WhatsApp section shell — one Communication → WhatsApp nav entry,
 * with Automations / Templates / History as in-section tabs.
 */
export function WhatsAppHub() {
  const { pathname } = useLocation();
  const base = pathname.replace(/\/(automations|templates|history)\/?$/, "") || pathname;

  return (
    <PageContainer className="animate-in fade-in duration-300 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">WhatsApp</h2>
        <p className="text-sm text-muted-foreground mt-1">
          System automations, templates, and delivery history.
        </p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-border pb-px">
        {TABS.map((tab) => (
          <NavLink
            key={tab.segment}
            to={`${base}/${tab.segment}`}
            className={({ isActive }) =>
              cn(
                "px-3 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors",
                isActive || tab.suffix.test(pathname)
                  ? "border-[#2563EB] text-[#2563EB]"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </PageContainer>
  );
}
