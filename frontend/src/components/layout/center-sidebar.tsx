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
import { InstallAppButton } from "@/components/common/InstallAppButton";
import { CENTER_PORTAL_NAV, buildCenterNavPermissionKeys } from "@/constants/center-portal-nav";
import {
  canAccessNavUrl,
  isBaselineOnlyPermissions,
} from "@/constants/nav-permissions";
import { canReadCenterItem } from "@/constants/center-item-permissions";
import { useBranch } from "@/hooks/useBranches";

const NAV_KEY_MAP = buildCenterNavPermissionKeys();

export function CenterSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/center/dashboard">
                <img src="/aadya-logo.png" alt="Aadya Institute" className="h-7 w-auto object-contain" />
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-text-primary">Aadya Portal</span>
                  <span className="text-xs text-amber-600 font-bold">CENTER MANAGER</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {filteredNavItems.map((item) => {
              const isItemActive = location.pathname === item.url;
              const isGroupActive = item.items?.some(
                (sub) => location.pathname === sub.url || location.pathname.startsWith(`${sub.url}/`)
              );

              if (!item.items) {
                if (item.isAi) {
                  return (
                    <SidebarMenuItem key={item.title} className="mb-2">
                      <SidebarMenuButton
                        asChild
                        isActive={isItemActive}
                        tooltip={item.title}
                        className="bg-gradient-to-r from-[#1769AA]/10 to-[#F39A16]/10 border border-[#1769AA]/20 hover:from-[#1769AA]/15 hover:to-[#F39A16]/15"
                      >
                        <Link to={item.url} className="flex items-center gap-2.5 w-full">
                          <item.icon className="h-4 w-4 shrink-0 text-[#1769AA]" />
                          <span className="truncate font-semibold text-[#1769AA]">{item.title}</span>
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
                        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="my-1 ml-3.5 pl-2.5 border-l border-border/60 gap-0.5">
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname === subItem.url || location.pathname.startsWith(`${subItem.url}/`)}
                              className="h-8 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all data-[active=true]:bg-blue-50/90 dark:data-[active=true]:bg-blue-950/50 data-[active=true]:text-[#1769AA] dark:data-[active=true]:text-sky-400 data-[active=true]:font-semibold"
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

      <SidebarFooter className="border-t border-border/50 p-2 space-y-2">
        <div className="px-1">
          <InstallAppButton variant="sidebar" />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/40">
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <span className="text-xs font-bold truncate text-text-primary">{managerName}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-amber-600">Center Manager</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-[#1D4ED8] flex items-center justify-center shrink-0">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Assigned Center</span>
                <Lock className="h-2.5 w-2.5 text-slate-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 block truncate">{branchName}</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
