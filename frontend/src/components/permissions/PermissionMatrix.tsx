import React, { useEffect, useState } from "react";
import {
  Bot,
  Target,
  UserCheck,
  GraduationCap,
  Users,
  BookOpen,
  FolderOpen,
  Calendar,
  ClipboardList,
  FileText,
  CreditCard,
  Award,
  BarChart3,
  MessageSquare,
  Briefcase,
  Building2,
  Loader2,
  ShieldCheck,
  Eye,
  Pencil,
  ChevronDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/services/users.api";
import type {
  PermissionModuleDefinition,
  PermissionRoleScope,
  ItemAccessState,
} from "@/utils/permission-utils";
import {
  createFullAccessState,
  createEmptyAccessState,
} from "@/utils/permission-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface PermissionMatrixProps {
  role: PermissionRoleScope;
  value: Record<string, ItemAccessState>;
  onChange: (next: Record<string, ItemAccessState>) => void;
  disabled?: boolean;
  /** Prefer parent-fetched catalog so Grant all / Save use the same item keys. */
  catalog?: PermissionModuleDefinition[];
}

/** Icons aligned with admin ERP sidebar (app-sidebar.tsx). */
const ERP_MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  lead_management: Bot,
  admission_management: Target,
  counsellor_management: UserCheck,
  student_management: GraduationCap,
  faculty_management: Users,
  course_management: BookOpen,
  batch_management: FolderOpen,
  class_schedule: Calendar,
  assignment_management: ClipboardList,
  examination_management: FileText,
  fee_management: CreditCard,
  target_incentive: Award,
  report_management: BarChart3,
  communication: MessageSquare,
  placement_management: Briefcase,
  administration: Building2,
};

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  role,
  value,
  onChange,
  disabled = false,
  catalog: catalogProp,
}) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["permission-catalog", role],
    queryFn: () => usersApi.getPermissionCatalog(role),
    enabled: !catalogProp || catalogProp.length === 0,
  });

  const catalog: PermissionModuleDefinition[] =
    catalogProp && catalogProp.length > 0 ? catalogProp : (data?.data ?? []);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  const loading = (!catalogProp || catalogProp.length === 0) && isLoading;

  useEffect(() => {
    setOpenModules({});
  }, [role]);

  // Seed open state once per module when catalog arrives (open if already granted)
  useEffect(() => {
    if (catalog.length === 0) return;
    setOpenModules((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const mod of catalog) {
        if (next[mod.key] === undefined) {
          next[mod.key] = mod.items.some((i) => value[i.key]?.show);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // Only when catalog identity changes — do not re-collapse on every value update
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [catalog]);

  const setItemAccess = (itemKey: string, patch: Partial<ItemAccessState>) => {
    const current = value[itemKey] ?? { show: false, editable: false };
    const next = { ...current, ...patch };
    if (!next.show) next.editable = false;
    if (next.editable) next.show = true;
    onChange({ ...value, [itemKey]: next });
  };

  const selectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || catalog.length === 0) return;
    onChange(createFullAccessState(catalog));
    // Expand every module so Read/Edit checkboxes are visible
    const open: Record<string, boolean> = {};
    for (const mod of catalog) open[mod.key] = true;
    setOpenModules(open);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || catalog.length === 0) return;
    onChange(createEmptyAccessState(catalog));
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
        Loading ERP permission modules…
      </div>
    );
  }

  if ((isError && (!catalogProp || catalogProp.length === 0)) || catalog.length === 0) {
    return (
      <p className="text-sm text-red-600 py-4">
        Failed to load permission catalog. Please refresh and try again.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
          <span>
            ERP modules · <strong>Read</strong> = view only · <strong>Edit</strong> = view, add, update, and all actions · New users start with none enabled (baseline only)
          </span>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAll} disabled={disabled}>
            Grant all
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={clearAll} disabled={disabled}>
            Clear all
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
        {catalog.map((mod) => {
          const Icon = ERP_MODULE_ICONS[mod.key];
          const enabledCount = mod.items.filter((i) => value[i.key]?.show).length;
          const isOpen = openModules[mod.key] ?? false;
          return (
            <Collapsible
              key={mod.key}
              open={isOpen}
              onOpenChange={(open) =>
                setOpenModules((prev) => ({ ...prev, [mod.key]: open }))
              }
            >
              <CollapsibleTrigger
                type="button"
                className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-muted/30 text-left bg-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {Icon && (
                    <div className="h-9 w-9 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center shrink-0">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground">{mod.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {enabledCount}/{mod.items.length} enabled
                  </Badge>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-3 bg-slate-50/50 space-y-1">
                  <div className="grid grid-cols-[1fr_72px_72px] gap-2 px-2 py-2 text-[10px] font-bold uppercase text-muted-foreground border-b border-border/30">
                    <span>Submodule / Item</span>
                    <span className="text-center flex items-center justify-center gap-1">
                      <Eye className="w-3 h-3" /> Read
                    </span>
                    <span className="text-center flex items-center justify-center gap-1">
                      <Pencil className="w-3 h-3" /> Edit
                    </span>
                  </div>
                  {mod.items.map((item) => {
                    const access = value[item.key] ?? { show: false, editable: false };
                    const canEdit = (item.writePermissions?.length ?? 0) > 0;
                    return (
                      <div
                        key={item.key}
                        className={`grid grid-cols-[1fr_72px_72px] gap-2 items-center px-2 py-2.5 rounded-lg border ${
                          access.show ? "bg-blue-50/60 border-blue-100" : "bg-white border-transparent"
                        }`}
                      >
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                        <label className="flex justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={access.show}
                            disabled={disabled}
                            onChange={(e) => setItemAccess(item.key, { show: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                          />
                        </label>
                        <label className="flex justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={access.editable}
                            disabled={disabled || !canEdit}
                            onChange={(e) => setItemAccess(item.key, { editable: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] disabled:opacity-40"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};
