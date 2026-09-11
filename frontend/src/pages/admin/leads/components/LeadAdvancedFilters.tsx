import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MasterSelect } from "@/components/common/MasterSelect";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import type { LeadQueryParams } from "@/services/leads.api";

export interface LeadAdvancedFilterValues {
  source?: string;
  sourceMasterId?: string;
  status?: string;
  priority?: string;
  scoreBand?: LeadQueryParams["scoreBand"];
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
  unassigned?: boolean;
  overdueFollowUps?: boolean;
}

interface LeadAdvancedFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: LeadAdvancedFilterValues;
  onChange: (values: LeadAdvancedFilterValues) => void;
  onApply: () => void;
  onClear: () => void;
}

const STATUS_OPTIONS = ["ACTIVE", "CONVERTED", "LOST", "ARCHIVED"];

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH"];

export function LeadAdvancedFilters({
  open,
  onOpenChange,
  values,
  onChange,
  onApply,
  onClear,
}: LeadAdvancedFiltersProps) {
  const { options: sourceOptions } = useMasterDropdown("leadsource");
  const set = <K extends keyof LeadAdvancedFilterValues>(
    key: K,
    value: LeadAdvancedFilterValues[K]
  ) => onChange({ ...values, [key]: value });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Advanced Filters
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div>
            <Label className="text-xs">Source</Label>
            <MasterSelect
              entityType="leadsource"
              value={values.sourceMasterId || ""}
              allowCreate={false}
              onChange={(id) => {
                if (!id) {
                  onChange({ ...values, sourceMasterId: undefined, source: undefined });
                  return;
                }
                const opt = sourceOptions.find((o) => o.value === id);
                onChange({
                  ...values,
                  sourceMasterId: id,
                  source:
                    opt?.code ||
                    opt?.label?.toUpperCase().replace(/\s+/g, "_") ||
                    undefined,
                });
              }}
              placeholder="Any source"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Status</Label>
            <select
              value={values.status || ""}
              onChange={(e) => set("status", e.target.value || undefined)}
              className="mt-1 w-full h-10 px-3 border border-border rounded-md text-sm bg-background"
            >
              <option value="">Any status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Priority</Label>
            <select
              value={values.priority || ""}
              onChange={(e) => set("priority", e.target.value || undefined)}
              className="mt-1 w-full h-10 px-3 border border-border rounded-md text-sm bg-background"
            >
              <option value="">Any priority</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Score band</Label>
            <select
              value={values.scoreBand || ""}
              onChange={(e) =>
                set(
                  "scoreBand",
                  (e.target.value || undefined) as LeadAdvancedFilterValues["scoreBand"]
                )
              }
              className="mt-1 w-full h-10 px-3 border border-border rounded-md text-sm bg-background"
            >
              <option value="">Any band</option>
              <option value="hot">Hot (≥70)</option>
              <option value="warm">Warm (40–69)</option>
              <option value="cold">Cold (1–39)</option>
              <option value="unscored">Unscored</option>
            </select>
          </div>

          <div>
            <Label className="text-xs">Tag</Label>
            <Input
              value={values.tag || ""}
              onChange={(e) => set("tag", e.target.value || undefined)}
              placeholder="e.g. NEET, callback"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Created from</Label>
              <Input
                type="date"
                value={values.dateFrom || ""}
                onChange={(e) => set("dateFrom", e.target.value || undefined)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Created to</Label>
              <Input
                type="date"
                value={values.dateTo || ""}
                onChange={(e) => set("dateTo", e.target.value || undefined)}
                className="mt-1"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(values.unassigned)}
              onChange={(e) => set("unassigned", e.target.checked || undefined)}
              className="h-4 w-4 rounded border-border"
            />
            Unassigned only
          </label>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(values.overdueFollowUps)}
              onChange={(e) => set("overdueFollowUps", e.target.checked || undefined)}
              className="h-4 w-4 rounded border-border"
            />
            Overdue follow-ups
          </label>
        </div>

        <SheetFooter className="mt-8 gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClear} className="gap-1">
            <X className="h-4 w-4" />
            Clear
          </Button>
          <Button
            type="button"
            className="bg-[#2563EB] text-white"
            onClick={() => {
              onApply();
              onOpenChange(false);
            }}
          >
            Apply filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function countActiveAdvancedFilters(values: LeadAdvancedFilterValues): number {
  let n = 0;
  if (values.source || values.sourceMasterId) n += 1;
  if (values.status) n += 1;
  if (values.priority) n += 1;
  if (values.scoreBand) n += 1;
  if (values.tag) n += 1;
  if (values.dateFrom) n += 1;
  if (values.dateTo) n += 1;
  if (values.unassigned) n += 1;
  if (values.overdueFollowUps) n += 1;
  return n;
}
