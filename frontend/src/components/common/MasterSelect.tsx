import React, { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { useCreateMasterRecord } from "@/hooks/useMasters";
import { usePermissions } from "@/hooks/usePermissions";
import { getMasterTypeMeta } from "@/constants/master-types";
import {
  getMasterQuickCreateFields,
  MASTER_TOP_LEVEL_KEYS,
} from "@/constants/master-form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMasterOptionLabel, buildTimeslotName, formatTimeToAmPm } from "@/utils/master.utils";

interface MasterSelectProps {
  /** Master entityType key (e.g. "leadsource", "designation", "area") */
  entityType: string;
  /** Selected master record ID */
  value: string;
  /** Called with the selected master record ID */
  onChange: (masterId: string) => void;
  placeholder?: string;
  className?: string;
  includeEmpty?: boolean;
  entityLabel?: string;
  branchId?: string;
  disabled?: boolean;
  /**
   * Show inline "+ Add New". Defaults to true except for numbering series.
   * Hidden automatically when the user lacks master.create.
   */
  allowCreate?: boolean;
}

/**
 * Generic master-data select. Fetches ACTIVE records from Master Module API.
 * Optional "+" creates a new Master record and selects it immediately.
 */
export const MasterSelect: React.FC<MasterSelectProps> = ({
  entityType,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  includeEmpty = true,
  entityLabel,
  branchId,
  disabled = false,
  allowCreate,
}) => {
  const { options, isLoading, isError } = useMasterDropdown(entityType, branchId);
  const { hasPermission } = usePermissions();
  const createMutation = useCreateMasterRecord();

  const meta = getMasterTypeMeta(entityType);
  const label = entityLabel || meta?.name || entityType.replace(/_/g, " ");
  const fields = useMemo(() => getMasterQuickCreateFields(entityType), [entityType]);

  const canCreate =
    (allowCreate ?? entityType.toLowerCase() !== "numberingseries") &&
    hasPermission("master.create") &&
    !disabled;

  const [open, setOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setFormValues({});
    setFormError(null);
  };

  const handleOpen = () => {
    resetForm();
    setOpen(true);
  };

  const handleSave = async () => {
    const isTimeslot = entityType.toLowerCase() === "timeslot";
    const autoName = isTimeslot
      ? buildTimeslotName(formValues.startTime, formValues.endTime)
      : "";

    const values = isTimeslot
      ? { ...formValues, name: autoName }
      : formValues;

    const required = fields.filter((f) => f.required && !f.readOnly);
    for (const field of required) {
      if (!values[field.key]?.trim()) {
        setFormError(`${field.label} is required`);
        return;
      }
    }

    const name =
      values.name?.trim() ||
      values.title?.trim() ||
      autoName ||
      "";
    if (!name) {
      setFormError(isTimeslot ? "Start Time and End Time are required" : "Name is required");
      return;
    }

    const dataObj: Record<string, string> = {};
    for (const field of fields) {
      if (MASTER_TOP_LEVEL_KEYS.has(field.key)) continue;
      const raw = values[field.key]?.trim();
      if (!raw) continue;
      dataObj[field.key] =
        isTimeslot && (field.key === "startTime" || field.key === "endTime")
          ? formatTimeToAmPm(raw)
          : raw;
    }

    try {
      const res = await createMutation.mutateAsync({
        entityType,
        payload: {
          name,
          description: values.description?.trim() || undefined,
          branchId: branchId || undefined,
          status: "ACTIVE",
          data: dataObj,
        },
      });
      const newId = res?.data?.id;
      if (newId) onChange(newId);
      setOpen(false);
      resetForm();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        "Failed to create master record";
      setFormError(message);
    }
  };

  if (isLoading) {
    return (
      <div
        className={`flex items-center gap-2 h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 ${className}`}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading {label}...
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={`flex items-center h-9 px-3 mt-1 bg-red-50 border border-red-200 rounded-xl text-xs text-red-500 ${className}`}
      >
        Failed to load {label}
      </div>
    );
  }

  // Filter classes so parent utility classes don't break input group rounding
  const cleanedSelectClass = className
    .replace(/\bmt-\S+/g, "")
    .replace(/\brounded-\S+/g, "")
    .trim();

  return (
    <>
      {/* Input group: select + add button visually attached */}
      <div className={`flex items-stretch mt-1 ${className.includes("mt-0") ? "!mt-0" : ""}`}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`flex-1 min-w-0 h-10 px-3 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 font-medium outline-none text-xs text-foreground disabled:opacity-50 transition-colors focus:border-primary focus:bg-background ${
            canCreate
              ? "rounded-l-xl rounded-r-none border-r-0"
              : "rounded-xl"
          } ${cleanedSelectClass}`}
        >
          {includeEmpty && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {formatMasterOptionLabel(entityType, opt)}
            </option>
          ))}
          {options.length === 0 && (
            <option value="" disabled>
              No {label} configured — click + to add
            </option>
          )}
        </select>
        {canCreate && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleOpen}
                  className="inline-flex items-center justify-center h-10 px-3 shrink-0
                    border border-slate-200 dark:border-slate-800 border-l-slate-300 dark:border-l-slate-700
                    rounded-r-xl rounded-l-none
                    bg-gradient-to-b from-emerald-50 to-emerald-100/70 dark:from-emerald-950/40 dark:to-emerald-900/40
                    text-emerald-700 dark:text-emerald-400
                    hover:from-emerald-100 hover:to-emerald-200/80 dark:hover:from-emerald-900/60 dark:hover:to-emerald-800/60
                    hover:text-emerald-800 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-600
                    active:from-emerald-200 active:to-emerald-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1
                    transition-all duration-150 ease-in-out cursor-pointer
                    group/add-btn"
                  aria-label={`Add new ${label}`}
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5] transition-transform duration-150 group-hover/add-btn:scale-110" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-semibold shadow-md">
                <p>Add new {label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm(); }}>
        <DialogContent className="sm:max-w-md z-[100]" overlayClassName="z-[90]">
          <DialogHeader>
            <DialogTitle>Add {label}</DialogTitle>
            <DialogDescription>
              Creates a new record in Master Setup and selects it here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {fields.map((field) => {
              const isTimeslot = entityType.toLowerCase() === "timeslot";
              const displayValue =
                field.readOnly && isTimeslot && field.key === "name"
                  ? buildTimeslotName(formValues.startTime, formValues.endTime)
                  : formValues[field.key] || "";

              return (
                <div key={field.key}>
                  <Label className="text-xs">
                    {field.label}
                    {field.required && !field.readOnly ? " *" : ""}
                  </Label>
                  <Input
                    type={field.readOnly ? "text" : field.inputType || "text"}
                    value={displayValue}
                    readOnly={field.readOnly}
                    disabled={field.readOnly}
                    onChange={(e) => {
                      if (field.readOnly) return;
                      const nextValue = e.target.value;
                      setFormValues((prev) => {
                        const next = { ...prev, [field.key]: nextValue };
                        if (
                          isTimeslot &&
                          (field.key === "startTime" || field.key === "endTime")
                        ) {
                          next.name = buildTimeslotName(
                            field.key === "startTime" ? nextValue : next.startTime,
                            field.key === "endTime" ? nextValue : next.endTime
                          );
                        }
                        return next;
                      });
                    }}
                    className={`mt-1 h-9 text-xs ${
                      field.readOnly ? "bg-slate-100 text-slate-700 font-medium" : ""
                    }`}
                    placeholder={
                      field.readOnly && isTimeslot
                        ? "Auto from start & end time"
                        : field.label
                    }
                  />
                </div>
              );
            })}
            {formError && <p className="text-xs text-red-600">{formError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MasterSelect;

