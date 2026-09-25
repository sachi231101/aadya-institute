import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2, ChevronRight, Lock, LogOut } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuthStore } from "@/store/auth.store";
import { useOrganization } from "@/hooks/useOrganizationContext";
import {
  DEFAULT_ORG_NAME,
  resolveOrganizationLogo,
} from "@/utils/organization-display";
import { InstallAppButton } from "@/components/common/InstallAppButton";
import { CENTER_PORTAL_NAV, buildCenterNavPermissionKeys } from "@/constants/center-portal-nav";
import {
  canAccessNavUrl,
  isBaselineOnlyPermissions,
} from "@/constants/nav-permissions";
import { canReadCenterItem } from "@/constants/center-item-permissions";
import { useBranch } from "@/hooks/useBranches";
import { isFeeNavItemActive } from "@/utils/portal-path";

const NAV_KEY_MAP = buildCenterNavPermissionKeys();

export function CenterSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { organization } = useOrganization();
  const orgName = organization?.name || DEFAULT_ORG_NAME;
  const orgLogo = resolveOrganizationLogo(organization?.branding.logoUrl);
  const { data: branchResponse } = useBranch(user?.branchId ?? undefined);

  const managerName = user?.name || "Center Manager";
  const branchName = branchResponse?.data?.name || "Your Branch";

  const filteredNavItems = React.useMemo(() => {
    if (user?.roles?.includes("ADMIN")) {
      return CENTER_PORTAL_NAV;
    }

    const grantedPermissions = user?.permissions;
    const grantedModules = user?.modulePermissions;
    const isAdmin = false;

    const canSeeUrl = (url: string): boolean => {
      const itemKey = NAV_KEY_MAP[url];
      if (grantedPermissions?.length && !isBaselineOnlyPermissions(grantedPermissions)) {
        if (itemKey) return canReadCenterItem(grantedPermissions, itemKey);
        return canAccessNavUrl(url, grantedPermissions, grantedModules, NAV_KEY_MAP, isAdmin);
      }
      if (grantedModules?.length) {
        return canAccessNavUrl(url, grantedPermissions, grantedModules, NAV_KEY_MAP, isAdmin);
      }
      return false;
    };

    return CENTER_PORTAL_NAV.map((item) => {
      if (!item.items?.length) return item;
      const visibleItems = item.items.filter((sub) => canSeeUrl(sub.url));
      return { ...item, items: visibleItems };
    }).filter((item) => {
      if (!item.moduleKey) return true;
      if (item.items && item.items.length === 0) return false;
      if (item.items?.length) {
        return item.items.some((sub) => canSeeUrl(sub.url));
      }
      return canSeeUrl(item.url);
    });
  }, [user]);

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/50 bg-bg-secondary">
      <SidebarHeader className="h-12 border-b border-[#334155] bg-[#172033] text-white px-3 flex flex-row items-center">
        <Link
          to="/center/dashboard"
          className="flex items-center justify-between gap-2 px-1 py-0.5 rounded-lg hover:bg-white/5 transition-colors w-full group-data-[collapsible=icon]:justify-center"
          title={orgName}
        >
          <img
            src={orgLogo}
            alt={orgName}
            className="h-6.5 w-auto max-w-[125px] object-contain shrink-0 drop-shadow-[0_0_1px_rgba(255,255,255,0.35)] group-data-[collapsible=icon]:max-w-[26px] group-data-[collapsible=icon]:object-left"
          />
          <span className="text-[10px] text-amber-300 font-bold tracking-wider bg-white/10 border border-white/20 px-2 py-0.5 rounded-full shrink-0 group-data-[collapsible=icon]:hidden">
            MANAGER
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {filteredNavItems.map((item) => {
              const isItemActive = location.pathname === item.url;
              const isGroupActive = item.items?.some((sub) =>
                isFeeNavItemActive(location.pathname, sub.url)
              );

              if (!item.items) {
                if (item.isAi) {
                  return (
                    <SidebarMenuItem key={item.title} className="mb-2">
                      <SidebarMenuButton
                        asChild
                        isActive={isItemActive}
                        tooltip={item.title}
                        className="bg-gradient-to-r from-[#2563EB]/10 to-[#F39A16]/10 border border-[#2563EB]/20 hover:from-[#2563EB]/15 hover:to-[#F39A16]/15"
                      >
                        <Link to={item.url} className="flex items-center gap-2.5 w-full">
                          <item.icon className="h-4 w-4 shrink-0 text-[#2563EB]" />
                          <span className="truncate font-semibold text-[#2563EB]">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isItemActive} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2.5 w-full">
                        <item.icon className={`h-4 w-4 shrink-0 ${isItemActive ? "text-primary font-semibold" : "text-muted-foreground"}`} />
                        <span className="truncate min-w-0 flex-1 text-[13.5px] font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }

              return (
                <Collapsible key={item.title} asChild defaultOpen={isGroupActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={isGroupActive} className="w-full justify-between">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <item.icon className={`h-4 w-4 shrink-0 ${isGroupActive ? "text-primary font-semibold" : "text-muted-foreground"}`} />
                          <span className="truncate min-w-0 flex-1 text-[13.5px] font-medium">{item.title}</span>
                        </div>
                        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="my-1 ml-3.5 pl-2.5 border-l border-border/60 gap-0.5">
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isFeeNavItemActive(location.pathname, subItem.url)}
                              className="h-8 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all data-[active=true]:bg-blue-50/90 dark:data-[active=true]:bg-blue-950/50 data-[active=true]:text-[#2563EB] dark:data-[active=true]:text-sky-400 data-[active=true]:font-semibold"
                            >
                              <Link to={subItem.url} className="truncate min-w-0 flex-1">
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-2.5 bg-bg-secondary empty:hidden">
        <InstallAppButton variant="sidebar" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
