import React, { useState, useMemo, useCallback } from "react";
import {
  MapPin,
  School,
  Briefcase,
  GraduationCap,
  Users,
  UserCheck,
  Calendar,
  Clock,
  CalendarCheck,
  FileCheck,
  PhoneCall,
  Flag,
  UserCircle,
  ClipboardList,
  UsersRound,
  Star,
  Bell,
  FileText,
  Box,
  Boxes,
  Landmark,
  IndianRupee,
  BookMarked,
  CreditCard,
  Percent,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  Download,
  Info,
  History,
  CheckCircle2,
  LayoutGrid,
  List,
  Eye,
  SlidersHorizontal,
  Layers,
  AlertTriangle,
  Loader2,
  PackageOpen,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Hash,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useMasterRecords,
  useCreateMasterRecord,
  useUpdateMasterRecord,
  useDeleteMasterRecord,
  useMasterEntityCounts,
  useToggleMasterStatus,
  useNumberingSeriesPreview,
} from "@/hooks/useMasters";
import {
  MASTER_ENTITY_TYPES,
  MASTER_CATEGORY_LABELS,
} from "@/constants/master-types";
import {
  computePatternPreview,
  getDefaultPatternForTarget,
  getNextSequenceForPreview,
} from "@/utils/numbering-series";
import {
  MASTER_QUICK_CREATE_FIELDS,
  MASTER_TOP_LEVEL_KEYS,
} from "@/constants/master-form-fields";
import {
  buildTimeslotName,
  formatTimeToAmPm,
  parseAmPmToTimeInput,
} from "@/utils/master.utils";

// ─── MASTER UI CONFIG (columns, icons — merged with master-types registry) ───

export type MasterCategoryGroup =
  | "ACADEMIC_ORG"
  | "ADMISSIONS_LEADS"
  | "ACCOUNTING_FEES"
  | "SYSTEM_AUTOMATION";

export interface MasterEntity {
  id: string;
  name: string;
  category: MasterCategoryGroup;
  categoryName: string;
  usedInPages?: string[];
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  description: string;
  columns: { key: string; label: string; required?: boolean; inputType?: "text" | "time" | "number"; readOnly?: boolean }[];
}

type MasterUiConfig = Pick<
  MasterEntity,
  "icon" | "iconBgColor" | "iconColor" | "description" | "columns"
>;

const MASTER_UI_CONFIG: Record<string, MasterUiConfig> = {
  area: {
    icon: MapPin,
    iconBgColor: "bg-blue-50 text-blue-600 border-blue-100",
    iconColor: "text-blue-600",
    description: "Manage areas / regions for operations",
    columns: [
      { key: "name", label: "Area Name", required: true },
      { key: "city", label: "City" },
      { key: "pincode", label: "PIN Code" },
    ],
  },
  classroom: {
    icon: School,
    iconBgColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
    iconColor: "text-emerald-600",
    description: "Manage classrooms and labs",
    columns: MASTER_QUICK_CREATE_FIELDS.classroom,
  },
  designation: {
    icon: Briefcase,
    iconBgColor: "bg-purple-50 text-purple-600 border-purple-100",
    iconColor: "text-purple-600",
    description: "Manage employee designations",
    columns: [
      { key: "name", label: "Designation Title", required: true },
      { key: "level", label: "Hierarchy Level" },
      { key: "department", label: "Department" },
    ],
  },
  education: {
    icon: GraduationCap,
    iconBgColor: "bg-amber-50 text-amber-600 border-amber-100",
    iconColor: "text-amber-600",
    description: "Manage education levels & groups",
    columns: [
      { key: "name", label: "Degree / Qualification", required: true },
      { key: "stream", label: "Stream / Field" },
    ],
  },
  parentinfo: {
    icon: Users,
    iconBgColor: "bg-teal-50 text-teal-600 border-teal-100",
    iconColor: "text-teal-600",
    description: "Manage parent information types",
    columns: [
      { key: "name", label: "Relation Type", required: true },
      { key: "occupationGroup", label: "Occupation Group" },
      { key: "incomeBracket", label: "Income Bracket" },
    ],
  },
  timeslot: {
    icon: Clock,
    iconBgColor: "bg-indigo-50 text-indigo-600 border-indigo-100",
    iconColor: "text-indigo-600",
    description: "Manage time slots for scheduling",
    columns: MASTER_QUICK_CREATE_FIELDS.timeslot,
  },
  examterm: {
    icon: FileCheck,
    iconBgColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
    iconColor: "text-emerald-600",
    description: "Manage exam terms and sessions",
    columns: [
      { key: "name", label: "Term Name", required: true },
      { key: "academicYear", label: "Academic Year" },
    ],
  },
  leadsource: {
    icon: PhoneCall,
    iconBgColor: "bg-blue-50 text-blue-600 border-blue-100",
    iconColor: "text-blue-600",
    description: "Manage lead sources",
    columns: [
      { key: "name", label: "Source Channel", required: true },
      { key: "channelType", label: "Channel Type" },
    ],
  },
  leadstage: {
    icon: Flag,
    iconBgColor: "bg-green-50 text-green-600 border-green-100",
    iconColor: "text-green-600",
    description: "Manage lead stages and pipeline",
    columns: [
      { key: "name", label: "Stage Name", required: true },
      { key: "description", label: "Pipeline Action" },
      { key: "color", label: "Badge Color" },
    ],
  },
  admissionstatus: {
    icon: ClipboardList,
    iconBgColor: "bg-amber-50 text-amber-600 border-amber-100",
    iconColor: "text-amber-600",
    description: "Manage admission statuses",
    columns: [
      { key: "name", label: "Status Title", required: true },
      { key: "step", label: "Enrollment Step" },
    ],
  },
  bankaccounts: {
    icon: Landmark,
    iconBgColor: "bg-blue-50 text-blue-600 border-blue-100",
    iconColor: "text-blue-600",
    description: "Manage bank accounts",
    columns: [
      { key: "name", label: "Bank Name", required: true },
      { key: "accountNumber", label: "Account No" },
      { key: "ifsc", label: "IFSC Code" },
      { key: "branch", label: "Bank Branch" },
    ],
  },
  feeheads: {
    icon: IndianRupee,
    iconBgColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
    iconColor: "text-emerald-600",
    description: "Manage fee heads",
    columns: [
      { key: "name", label: "Fee Head Title", required: true },
      { key: "type", label: "Fee Type" },
      { key: "gstApplicable", label: "GST Rate" },
    ],
  },
  paymentmodes: {
    icon: CreditCard,
    iconBgColor: "bg-amber-50 text-amber-600 border-amber-100",
    iconColor: "text-amber-600",
    description: "Manage payment modes",
    columns: [
      { key: "name", label: "Payment Mode", required: true },
      { key: "processingFee", label: "Gateway Charge" },
    ],
  },
  concessionheads: {
    icon: Percent,
    iconBgColor: "bg-teal-50 text-teal-600 border-teal-100",
    iconColor: "text-teal-600",
    description: "Manage concession heads",
    columns: [
      { key: "name", label: "Scholarship / Discount", required: true },
      { key: "percentage", label: "Max Discount" },
      { key: "approvalLevel", label: "Approval Required" },
    ],
  },
  numberingseries: {
    icon: Hash,
    iconBgColor: "bg-slate-50 text-slate-600 border-slate-100",
    iconColor: "text-slate-600",
    description: "Auto-generate sequential document numbers",
    columns: [
      { key: "code", label: "Target Document", required: true },
      { key: "name", label: "Series Name", required: true },
      { key: "pattern", label: "Format Pattern" },
      { key: "startNumber", label: "Start No" },
      { key: "currentSequence", label: "Last Issued No" },
      { key: "resetFrequency", label: "Reset Cycle" },
    ],
  },
};

const buildMasterEntities = (): MasterEntity[] =>
  MASTER_ENTITY_TYPES.map((meta) => {
    const ui = MASTER_UI_CONFIG[meta.id];
    if (!ui) {
      throw new Error(`Missing UI config for master entity: ${meta.id}`);
    }
    return {
      ...meta,
      category: meta.category as MasterCategoryGroup,
      ...ui,
    };
  });

const ALL_MASTERS = buildMasterEntities();

const CATEGORY_COUNTS = MASTER_ENTITY_TYPES.reduce(
  (acc, m) => {
    acc[m.category] = (acc[m.category] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>
);

const formatDate = (isoStr: string | null | undefined) => {
  if (!isoStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(isoStr));
  } catch {
    return "—";
  }
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const NumberingSeriesPreviewCell: React.FC<{ target: string }> = ({ target }) => {
  const { data, isLoading, isError } = useNumberingSeriesPreview(target);

  if (isLoading) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />;
  }

  if (isError || !data?.data?.preview) {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  return (
    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
      {data.data.preview}
    </span>
  );
};

export const MasterSetup: React.FC = () => {
  // View switcher: "GRID" or "CRUD"
  const [viewMode, setViewMode] = useState<"GRID" | "CRUD">("GRID");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("ALL");

  // Active Entity Selection (for modal/records drill-down)
  const [selectedMasterEntity, setSelectedMasterEntity] = useState<MasterEntity | null>(null);
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false);

  // Record CRUD
  const [isAddEditRecordOpen, setIsAddEditRecordOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingCurrentSequence, setEditingCurrentSequence] = useState(0);
  const [recordFormValues, setRecordFormValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [recordSearchQuery, setRecordSearchQuery] = useState("");
  const [recordStatusFilter, setRecordStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [recordPage, setRecordPage] = useState(1);
  const RECORDS_PER_PAGE = 20;

  // Confirmation Dialog
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "toggle"; entityId: string; recordId: string; recordName: string } | null>(null);

  // History & Toast
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // ─── HOOKS ──────────────────────────────────────────────────────────────────

  // Real entity counts from PostgreSQL
  const { data: entityCountsData, isLoading: isCountsLoading } = useMasterEntityCounts();

  // Mutations
  const createMasterMutation = useCreateMasterRecord();
  const updateMasterMutation = useUpdateMasterRecord();
  const deleteMasterMutation = useDeleteMasterRecord();
  const toggleStatusMutation = useToggleMasterStatus();

  // Active Entity Selection query from PostgreSQL (with pagination & filters)
  const entityQueryParams = useMemo(() => {
    const params: Record<string, any> = {
      page: recordPage,
      limit: RECORDS_PER_PAGE,
    };
    if (recordSearchQuery.trim()) params.search = recordSearchQuery.trim();
    if (recordStatusFilter !== "ALL") params.status = recordStatusFilter;
    return params;
  }, [recordPage, recordSearchQuery, recordStatusFilter]);

  const { data: entityApiData, isLoading: isEntityLoading, isError: isEntityError, error: entityError } = useMasterRecords(
    isRecordsModalOpen ? selectedMasterEntity?.id : undefined,
    entityQueryParams
  );

  // Build a lookup of counts by entity type
  const countsMap = useMemo(() => {
    const map: Record<string, { count: number; lastUpdated: string | null }> = {};
    if (entityCountsData?.data) {
      for (const item of entityCountsData.data) {
        map[item.entityType] = { count: item.count, lastUpdated: item.lastUpdated };
      }
    }
    return map;
  }, [entityCountsData]);

  // Filtered Master Entities
  const filteredMasters = useMemo(() => {
    return ALL_MASTERS.filter((entity) => {
      if (selectedModuleFilter !== "ALL" && entity.category !== selectedModuleFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = entity.name.toLowerCase().includes(q);
        const matchDesc = entity.description.toLowerCase().includes(q);
        const matchCat = entity.categoryName.toLowerCase().includes(q);
        const matchUsage = entity.usedInPages?.some((page) =>
          page.toLowerCase().includes(q)
        );
        if (!matchName && !matchDesc && !matchCat && !matchUsage) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, selectedModuleFilter]);

  // Grouped entities by category (grid default view)
  const academicMasters = useMemo(() => filteredMasters.filter((m) => m.category === "ACADEMIC_ORG"), [filteredMasters]);
  const admissionsMasters = useMemo(() => filteredMasters.filter((m) => m.category === "ADMISSIONS_LEADS"), [filteredMasters]);
  const accountingMasters = useMemo(() => filteredMasters.filter((m) => m.category === "ACCOUNTING_FEES"), [filteredMasters]);
  const systemMasters = useMemo(() => filteredMasters.filter((m) => m.category === "SYSTEM_AUTOMATION"), [filteredMasters]);

  const formPreviewTarget = recordFormValues.code || "ADMISSION";
  const { data: liveFormPreviewData } = useNumberingSeriesPreview(
    selectedMasterEntity?.id === "numberingseries" && editingRecordId ? formPreviewTarget : "",
    undefined
  );

  const formPreviewSequence = editingRecordId
    ? liveFormPreviewData?.data?.nextSequence ??
      getNextSequenceForPreview(
        editingCurrentSequence,
        Number(recordFormValues.startNumber) || 1,
        false
      )
    : Number(recordFormValues.startNumber) || 1;

  const formPatternPreview = computePatternPreview(
    recordFormValues.pattern || getDefaultPatternForTarget(formPreviewTarget),
    formPreviewSequence
  );

  // ─── TOAST HELPER ───────────────────────────────────────────────────────────

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // ─── HANDLERS ───────────────────────────────────────────────────────────────

  // Open records drilldown for an entity
  const handleOpenMasterRecords = (entity: MasterEntity) => {
    setSelectedMasterEntity(entity);
    setRecordSearchQuery("");
    setRecordStatusFilter("ALL");
    setRecordPage(1);
    setIsRecordsModalOpen(true);
  };

  // Open Add Record Dialog
  const handleOpenAddRecord = (entity: MasterEntity) => {
    setSelectedMasterEntity(entity);
    setEditingRecordId(null);
    setEditingCurrentSequence(0);
    const initialForm: Record<string, string> = {};
    entity.columns.forEach((col) => {
      initialForm[col.key] = "";
    });
    if (entity.id === "numberingseries") {
      initialForm.code = "ADMISSION";
      initialForm.name = "Admission Number Series";
      initialForm.pattern = "AADYA/{YEAR}/{SEQ:4}";
      initialForm.startNumber = "1";
      initialForm.resetFrequency = "YEARLY";
    }
    setRecordFormValues(initialForm);
    setFormErrors({});
    setIsAddEditRecordOpen(true);
  };

  // Open Edit Record Dialog
  const handleOpenEditRecord = (entity: MasterEntity, rec: any) => {
    setSelectedMasterEntity(entity);
    setEditingRecordId(rec.id);
    setEditingCurrentSequence(Number(rec.data?.currentSequence) || 0);
    const formVals: Record<string, string> = {};
    entity.columns.forEach((col) => {
      formVals[col.key] = rec.data?.[col.key] ?? rec[col.key] ?? "";
    });
    // Ensure name is populated
    formVals.name = formVals.name || rec.name || "";
    formVals.description = formVals.description || rec.description || "";
    if (entity.id === "numberingseries") {
      formVals.code = rec.code || rec.data?.target || "ADMISSION";
      formVals.pattern = rec.data?.pattern || formVals.pattern || "AADYA/{YEAR}/{SEQ:4}";
      formVals.startNumber = String(rec.data?.startNumber ?? "1");
      formVals.resetFrequency = rec.data?.resetFrequency || "YEARLY";
      formVals.currentSequence = String(rec.data?.currentSequence ?? "0");
    }
    if (entity.id === "timeslot") {
      formVals.startTime = parseAmPmToTimeInput(
        rec.data?.startTime || formVals.startTime || ""
      );
      formVals.endTime = parseAmPmToTimeInput(
        rec.data?.endTime || formVals.endTime || ""
      );
      formVals.name =
        buildTimeslotName(formVals.startTime, formVals.endTime) ||
        formVals.name ||
        rec.name ||
        "";
    }
    setRecordFormValues(formVals);
    setFormErrors({});
    setIsAddEditRecordOpen(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!selectedMasterEntity) return false;
    const errors: Record<string, string> = {};
    const isTimeslot = selectedMasterEntity.id === "timeslot";
    const autoName = isTimeslot
      ? buildTimeslotName(recordFormValues.startTime, recordFormValues.endTime)
      : "";

    for (const col of selectedMasterEntity.columns) {
      if (col.readOnly) continue;
      if (col.required && !recordFormValues[col.key]?.trim()) {
        errors[col.key] = `${col.label} is required`;
      }
    }

    // Name is always required (auto for timeslot)
    if (!(autoName || recordFormValues.name?.trim())) {
      errors.name = isTimeslot
        ? "Start Time and End Time are required"
        : "Name is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Add/Edit Record to PostgreSQL Backend
  const handleSaveRecord = async () => {
    if (!selectedMasterEntity) return;
    if (!validateForm()) return;

    const entityId = selectedMasterEntity.id;
    const isTimeslot = entityId === "timeslot";
    const autoTimeslotName = isTimeslot
      ? buildTimeslotName(recordFormValues.startTime, recordFormValues.endTime)
      : "";

    const recordName =
      autoTimeslotName ||
      recordFormValues.name?.trim() ||
      recordFormValues.title?.trim() ||
      recordFormValues.qualification?.trim() ||
      selectedMasterEntity.name;

    const recordCode =
      entityId === "numberingseries"
        ? recordFormValues.code?.trim() || undefined
        : undefined;
    const recordDesc = recordFormValues.description?.trim() || undefined;

    // Nested `data` only — top-level keys (name/code/description) stay on MasterRecord
    const dataObj: Record<string, any> = {};
    selectedMasterEntity.columns.forEach((col) => {
      if (MASTER_TOP_LEVEL_KEYS.has(col.key) && entityId !== "numberingseries") return;
      if (col.key === "code" && entityId !== "numberingseries") return;
      if (recordFormValues[col.key]?.trim()) {
        const raw = recordFormValues[col.key].trim();
        dataObj[col.key] =
          isTimeslot && (col.key === "startTime" || col.key === "endTime")
            ? formatTimeToAmPm(raw)
            : raw;
      }
    });

    if (entityId === "numberingseries") {
      dataObj.target = recordCode || "ADMISSION";
      dataObj.pattern = recordFormValues.pattern || getDefaultPatternForTarget(recordCode);
      dataObj.startNumber = Number(recordFormValues.startNumber) || 1;
      dataObj.resetFrequency = recordFormValues.resetFrequency || "YEARLY";
      dataObj.currentSequence = editingRecordId ? editingCurrentSequence : 0;
    }

    try {
      if (editingRecordId) {
        await updateMasterMutation.mutateAsync({
          entityType: entityId,
          id: editingRecordId,
          payload: {
            name: recordName,
            ...(entityId === "numberingseries" ? { code: recordCode } : {}),
            description: recordDesc,
            data: dataObj,
          },
        });
        showToast(`Record updated in ${selectedMasterEntity.name} successfully.`);
      } else {
        await createMasterMutation.mutateAsync({
          entityType: entityId,
          payload: {
            name: recordName,
            ...(entityId === "numberingseries" ? { code: recordCode } : {}),
            description: recordDesc,
            data: dataObj,
          },
        });
        showToast(`New record created in ${selectedMasterEntity.name} successfully.`);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Server error";
      showToast(`Failed to save record: ${errorMsg}`, "error");
      return; // Don't close dialog on error
    }

    setIsAddEditRecordOpen(false);
  };

  // Open confirmation dialog for delete/deactivate
  const handleRequestDelete = (entityId: string, recordId: string, recordName: string) => {
    setConfirmAction({ type: "delete", entityId, recordId, recordName });
    setIsConfirmDialogOpen(true);
  };

  // Confirm delete (soft delete = deactivate)
  const handleConfirmDelete = async () => {
    if (!confirmAction) return;
    try {
      await deleteMasterMutation.mutateAsync({
        entityType: confirmAction.entityId,
        id: confirmAction.recordId,
      });
      showToast(`"${confirmAction.recordName}" has been deactivated.`);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Server error";
      showToast(`Failed to deactivate: ${errorMsg}`, "error");
    }
    setIsConfirmDialogOpen(false);
    setConfirmAction(null);
  };

  // Toggle status
  const handleToggleStatus = async (entityId: string, recordId: string, recordName: string) => {
    try {
      const result = await toggleStatusMutation.mutateAsync({
        entityType: entityId,
        id: recordId,
      });
      const newStatus = result.data.status;
      showToast(`"${recordName}" ${newStatus === "ACTIVE" ? "activated" : "deactivated"} successfully.`);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Server error";
      showToast(`Failed to toggle status: ${errorMsg}`, "error");
    }
  };

  // Export CSV
  const handleExportCSV = (entity: MasterEntity) => {
    const records = entityApiData?.data || [];
    if (records.length === 0) {
      showToast("No records to export.", "error");
      return;
    }

    const isNumberingSeries = entity.id === "numberingseries";
    const extraCols = entity.columns.filter((c) => c.key !== "name" && c.key !== "code");
    const headers = [
      "Name",
      ...(isNumberingSeries ? ["Target Document"] : []),
      "Status",
      ...extraCols.map((c) => c.label),
    ].join(",");
    const rows = records
      .map((r: any) => {
        const vals = [
          `"${r.name || ""}"`,
          ...(isNumberingSeries ? [`"${r.code || ""}"`] : []),
          `"${r.status || ""}"`,
          ...extraCols.map((c) => `"${r.data?.[c.key] || ""}"`),
        ];
        return vals.join(",");
      })
      .join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aadya_${entity.name.replace(/\s+/g, "_")}_Master.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${records.length} records for ${entity.name}.`);
  };

  // ─── RENDER HELPERS ─────────────────────────────────────────────────────────

  const renderEntityCard = (entity: MasterEntity) => {
    const countInfo = countsMap[entity.id];
    const currentCount = countInfo?.count ?? 0;
    const IconComp = entity.icon;
    const usageCount = entity.usedInPages?.length ?? 0;

    return (
      <div
        key={entity.id}
        onClick={() => handleOpenMasterRecords(entity)}
        className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group min-h-[140px]"
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className={`p-2.5 rounded-xl border ${entity.iconBgColor} shrink-0 transition-transform group-hover:scale-105`}>
              <IconComp className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col items-end gap-1">
              {usageCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] font-bold bg-blue-50 text-[#1769AA] border-blue-100"
                  title={entity.usedInPages?.join(", ")}
                >
                  Used in {usageCount} {usageCount === 1 ? "page" : "pages"}
                </Badge>
              )}
            </div>
          </div>
          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm mt-3 tracking-tight group-hover:text-[#1769AA] transition-colors">
            {entity.name}
          </h4>
          <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-0.5 leading-relaxed">
            {entity.description}
          </p>
        </div>
        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold text-slate-500">
            {isCountsLoading ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> ...</span>
            ) : (
              `${currentCount} Records`
            )}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#1769AA] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    );
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const isActive = status === "ACTIVE";
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${isActive
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-slate-100 text-slate-500 border border-slate-200"
        }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  // Category section renderer
  const renderCategorySection = (
    title: string,
    description: string,
    masters: MasterEntity[],
    filterKey: string,
    gridCols: string = "lg:grid-cols-5"
  ) => {
    if (masters.length === 0) return null;
    return (
      <Card className="border-slate-200/80 shadow-xs bg-slate-50/40 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight uppercase">
              {title}
            </h2>
            <p className="text-xs text-slate-500 font-medium">{description}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedModuleFilter(filterKey)}
            className="text-xs font-extrabold text-[#1769AA] hover:text-[#125890] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>View All ({masters.length})</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${gridCols} gap-3.5`}>
          {masters.map((entity) => renderEntityCard(entity))}
        </div>
      </Card>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 space-y-6 text-slate-800 font-sans w-full max-w-[1720px] mx-auto pb-20 animate-in fade-in duration-200">
      {/* ─── 1. COMPACT PAGE HEADER & VIEW SWITCHER ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100 shadow-2xs">
              <Layers className="h-5 w-5 stroke-[2.4]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Master Setup
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-[#1769AA] border border-blue-200">
              {MASTER_ENTITY_TYPES.length} Modules
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Configure and manage all master data used across the institute. Changes here will reflect throughout the system.
          </p>
        </div>

        {/* Segmented View Switcher */}
        <div className="inline-flex p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 shadow-2xs shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("GRID")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === "GRID"
                ? "bg-[#1769AA] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Grid View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("CRUD")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === "CRUD"
                ? "bg-[#1769AA] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <List className="h-4 w-4" />
            <span>CRUD View</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold shadow-2xs ${toastMessage.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"
          }`}>
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ─── 2. SEARCH & MODULE CATEGORY FILTER BAR ───────────────────────── */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search master by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 bg-slate-50 border-slate-200 text-xs font-medium rounded-xl focus:bg-white"
          />
        </div>
        <div className="relative min-w-[220px]">
          <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          <select
            value={selectedModuleFilter}
            onChange={(e) => setSelectedModuleFilter(e.target.value)}
            className="w-full h-10 pl-9 pr-8 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1769AA]/30 outline-none appearance-none cursor-pointer"
          >
            <option value="ALL">All Modules ({MASTER_ENTITY_TYPES.length})</option>
            <option value="ACADEMIC_ORG">{MASTER_CATEGORY_LABELS.ACADEMIC_ORG} ({CATEGORY_COUNTS.ACADEMIC_ORG ?? 0})</option>
            <option value="ADMISSIONS_LEADS">{MASTER_CATEGORY_LABELS.ADMISSIONS_LEADS} ({CATEGORY_COUNTS.ADMISSIONS_LEADS ?? 0})</option>
            <option value="ACCOUNTING_FEES">{MASTER_CATEGORY_LABELS.ACCOUNTING_FEES} ({CATEGORY_COUNTS.ACCOUNTING_FEES ?? 0})</option>
            <option value="SYSTEM_AUTOMATION">{MASTER_CATEGORY_LABELS.SYSTEM_AUTOMATION} ({CATEGORY_COUNTS.SYSTEM_AUTOMATION ?? 0})</option>
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
        </div>
      </div>

      {/* ─── 3. GRID VIEW ─────────────────────────────────────────────────── */}
      {viewMode === "GRID" && (
        <div className="space-y-6">
          {(selectedModuleFilter === "ALL" || selectedModuleFilter === "ACADEMIC_ORG") &&
            renderCategorySection("Academic & Organization", "Manage academic structure, staff, classrooms and institutional setup.", academicMasters, "ACADEMIC_ORG")}

          {(selectedModuleFilter === "ALL" || selectedModuleFilter === "ADMISSIONS_LEADS") &&
            renderCategorySection("Admissions & Leads", "Configure lead management and admission related masters.", admissionsMasters, "ADMISSIONS_LEADS", "lg:grid-cols-3")}

          {(selectedModuleFilter === "ALL" || selectedModuleFilter === "ACCOUNTING_FEES") &&
            renderCategorySection("Accounting & Fees", "Financial and accounting master configurations.", accountingMasters, "ACCOUNTING_FEES")}

          {(selectedModuleFilter === "ALL" || selectedModuleFilter === "SYSTEM_AUTOMATION") &&
            renderCategorySection("System & Automation", "Auto-generated document numbering and system-wide automation settings.", systemMasters, "SYSTEM_AUTOMATION", "lg:grid-cols-2")}
        </div>
      )}

      {/* ─── 4. CRUD VIEW ─────────────────────────────────────────────────── */}
      {viewMode === "CRUD" && (
        <Card className="border border-border shadow-xs bg-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[950px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-[11px] font-bold text-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4 pl-5">ENTITY NAME</th>
                  <th className="py-3.5 px-4">CATEGORY</th>
                  <th className="py-3.5 px-4">DESCRIPTION</th>
                  <th className="py-3.5 px-4">USAGE</th>
                  <th className="py-3.5 px-3 text-center">RECORDS</th>
                  <th className="py-3.5 px-3">LAST UPDATED</th>
                  <th className="py-3.5 px-3 text-center">STATUS</th>
                  <th className="py-3.5 px-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70 bg-card">
                {filteredMasters.map((item) => {
                  const countInfo = countsMap[item.id];
                  const currentCount = countInfo?.count ?? 0;
                  const lastUpdated = countInfo?.lastUpdated;
                  const IconComp = item.icon;
                  const usageCount = item.usedInPages?.length ?? 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 pl-5 font-bold text-slate-900 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl border ${item.iconBgColor} shrink-0`}>
                            <IconComp className="h-4 w-4 stroke-[2.2]" />
                          </div>
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.categoryName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium align-middle max-w-xs truncate">
                        {item.description}
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        {usageCount > 0 ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-bold bg-blue-50 text-[#1769AA] border-blue-100"
                            title={item.usedInPages?.join(", ")}
                          >
                            {usageCount} {usageCount === 1 ? "page" : "pages"}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800 align-middle">
                        {isCountsLoading ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : currentCount}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 font-medium align-middle">
                        {formatDate(lastUpdated)}
                      </td>
                      <td className="py-3.5 px-3 text-center align-middle">
                        <StatusBadge status="ACTIVE" />
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenMasterRecords(item)}
                            className="h-8 px-2.5 text-[11px] font-bold text-[#1769AA] border-blue-200 bg-blue-50/50 hover:bg-blue-100 rounded-lg gap-1 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAddRecord(item)}
                            className="h-8 px-2.5 text-[11px] font-bold text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 rounded-lg gap-1 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── 5. BOTTOM INFORMATION PANEL ─────────────────────────────────── */}
      <Card className="border-slate-200/80 shadow-xs bg-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-[#1769AA] shrink-0">
            <Info className="h-4 w-4 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-xs block">About Master Setup</span>
            <p className="text-[11px] text-slate-500 font-medium">
              Masters are the foundation of your ERP system. Changes here will apply across all modules.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsHistoryModalOpen(true)}
          className="h-9 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl gap-2 shrink-0 cursor-pointer"
        >
          <History className="h-3.5 w-3.5 text-slate-500" />
          <span>View Change History</span>
        </Button>
      </Card>

      {/* ─── MODAL 1: DRILL-DOWN ENTITY RECORDS CRUD VIEW ──────────────────── */}
      <Dialog open={isRecordsModalOpen} onOpenChange={setIsRecordsModalOpen}>
        <DialogContent className="sm:max-w-5xl bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          {selectedMasterEntity && (
            <>
              <DialogHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border ${selectedMasterEntity.iconBgColor}`}>
                      <selectedMasterEntity.icon className="h-4 w-4" />
                    </div>
                    <DialogTitle className="text-xl font-black text-slate-900">
                      {selectedMasterEntity.name} Master
                    </DialogTitle>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-[#1769AA]">
                      {entityApiData?.meta?.total ?? 0} Records
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportCSV(selectedMasterEntity)}
                      className="h-8 text-xs font-bold border-slate-200 rounded-xl gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" /> Export CSV
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenAddRecord(selectedMasterEntity)}
                      className="h-8 text-xs font-bold bg-[#1769AA] hover:bg-[#125890] text-white rounded-xl gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Record
                    </Button>
                  </div>
                </div>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  {selectedMasterEntity.description}
                </DialogDescription>
              </DialogHeader>

              {/* Records Filter Bar */}
              <div className="flex items-center gap-2 my-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder={`Search ${selectedMasterEntity.name.toLowerCase()} records...`}
                    value={recordSearchQuery}
                    onChange={(e) => { setRecordSearchQuery(e.target.value); setRecordPage(1); }}
                    className="h-9 pl-9 text-xs rounded-xl bg-slate-50"
                  />
                </div>
                <select
                  value={recordStatusFilter}
                  onChange={(e) => { setRecordStatusFilter(e.target.value as any); setRecordPage(1); }}
                  className="h-9 px-3 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none cursor-pointer min-w-[100px]"
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {/* Records Table */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden min-h-[200px]">
                {isEntityLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-3" />
                    <span className="text-xs font-bold">Loading records...</span>
                  </div>
                ) : isEntityError ? (
                  <div className="flex flex-col items-center justify-center py-16 text-rose-400">
                    <AlertTriangle className="h-8 w-8 mb-3" />
                    <span className="text-xs font-bold text-rose-600">
                      Failed to load records: {(entityError as Error)?.message || "Unknown error"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecordPage(1)}
                      className="mt-3 text-xs"
                    >
                      Retry
                    </Button>
                  </div>
                ) : !entityApiData?.data || entityApiData.data.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <PackageOpen className="h-10 w-10 mb-3 text-slate-300" />
                    <span className="text-sm font-bold text-slate-500">No records found</span>
                    <p className="text-xs text-slate-400 mt-1">Add your first {selectedMasterEntity.name} record to get started.</p>
                    <Button
                      size="sm"
                      onClick={() => handleOpenAddRecord(selectedMasterEntity)}
                      className="mt-4 bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add First Record
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-[380px] overflow-y-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Name</th>
                          {selectedMasterEntity.id === "numberingseries" && (
                            <th className="py-2.5 px-3">Target Document</th>
                          )}
                          {selectedMasterEntity.columns
                            .filter((c) => c.key !== "name" && c.key !== "code")
                            .map((col) => (
                              <th key={col.key} className="py-2.5 px-3">{col.label}</th>
                            ))}
                          {selectedMasterEntity.id === "numberingseries" && (
                            <th className="py-2.5 px-3 text-blue-700">Next Number Preview</th>
                          )}
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {entityApiData.data.map((rec: any) => (
                          <tr key={rec.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-slate-800 font-semibold">{rec.name || "—"}</td>
                            {selectedMasterEntity.id === "numberingseries" && (
                              <td className="py-2.5 px-3 text-slate-600 font-medium">{rec.code || "—"}</td>
                            )}
                            {selectedMasterEntity.columns
                              .filter((c) => c.key !== "name" && c.key !== "code")
                              .map((col) => (
                                <td key={col.key} className="py-2.5 px-3 text-slate-600 font-medium">
                                  {selectedMasterEntity.id === "timeslot" &&
                                  (col.key === "startTime" || col.key === "endTime")
                                    ? formatTimeToAmPm(String(rec.data?.[col.key] || "")) || "—"
                                    : rec.data?.[col.key] || "—"}
                                </td>
                              ))}
                            {selectedMasterEntity.id === "numberingseries" && (
                              <td className="py-2.5 px-3">
                                <NumberingSeriesPreviewCell target={rec.code || rec.data?.target || "ADMISSION"} />
                              </td>
                            )}
                            <td className="py-2.5 px-3 text-center">
                              <StatusBadge status={rec.status} />
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditRecord(selectedMasterEntity, rec)}
                                  className="p-1 hover:bg-blue-50 text-blue-600 rounded-lg cursor-pointer"
                                  title="Edit Record"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(selectedMasterEntity.id, rec.id, rec.name)}
                                  className={`p-1 rounded-lg cursor-pointer ${rec.status === "ACTIVE"
                                      ? "hover:bg-amber-50 text-amber-600"
                                      : "hover:bg-emerald-50 text-emerald-600"
                                    }`}
                                  title={rec.status === "ACTIVE" ? "Deactivate" : "Activate"}
                                >
                                  {rec.status === "ACTIVE" ? (
                                    <ToggleRight className="h-4 w-4" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRequestDelete(selectedMasterEntity.id, rec.id, rec.name)}
                                  className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer"
                                  title="Deactivate Record"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {entityApiData?.meta && entityApiData.meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-slate-500 font-medium">
                    Showing page {entityApiData.meta.page} of {entityApiData.meta.totalPages} ({entityApiData.meta.total} total records)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={recordPage <= 1}
                      onClick={() => setRecordPage((p) => Math.max(1, p - 1))}
                      className="h-7 px-2 text-xs rounded-lg"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={recordPage >= entityApiData.meta.totalPages}
                      onClick={() => setRecordPage((p) => p + 1)}
                      className="h-7 px-2 text-xs rounded-lg"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter className="mt-3">
                <Button
                  variant="outline"
                  onClick={() => setIsRecordsModalOpen(false)}
                  className="text-xs font-bold rounded-xl"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: ADD / EDIT RECORD DIALOG ─────────────────────────────── */}
      <Dialog open={isAddEditRecordOpen} onOpenChange={setIsAddEditRecordOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          {selectedMasterEntity && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-black text-slate-900">
                  {editingRecordId ? "Edit Record" : "Add New Record"} — {selectedMasterEntity.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Fill in the details for this master entity record. Fields marked with * are required.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 my-3 text-xs">
                {selectedMasterEntity.columns.map((col) => {
                  const isNumberingSeries = selectedMasterEntity.id === "numberingseries";

                  if (isNumberingSeries && col.key === "code") {
                    return (
                      <div key={col.key} className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700">
                          {col.label} <span className="text-rose-500">*</span>
                        </Label>
                        <select
                          value={recordFormValues[col.key] || "ADMISSION"}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRecordFormValues((prev) => ({
                              ...prev,
                              [col.key]: val,
                              name: prev.name || `${val.charAt(0) + val.slice(1).toLowerCase()} Series`,
                            }));
                          }}
                          className="w-full h-9 px-3 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        >
                          <option value="ADMISSION">ADMISSION (Student Admission Number)</option>
                          <option value="STUDENT">STUDENT (Student Code / Roll No)</option>
                          <option value="EMPLOYEE">EMPLOYEE (Faculty / Staff Employee Code)</option>
                          <option value="RECEIPT">RECEIPT (Fee Payment Receipt Number)</option>
                          <option value="ENQUIRY">ENQUIRY (Enquiry Number)</option>
                          <option value="APPLICATION">APPLICATION (Application Number)</option>
                        </select>
                      </div>
                    );
                  }

                  if (isNumberingSeries && col.key === "resetFrequency") {
                    return (
                      <div key={col.key} className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700">
                          {col.label}
                        </Label>
                        <select
                          value={recordFormValues[col.key] || "YEARLY"}
                          onChange={(e) => {
                            setRecordFormValues((prev) => ({
                              ...prev,
                              [col.key]: e.target.value,
                            }));
                          }}
                          className="w-full h-9 px-3 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        >
                          <option value="YEARLY">YEARLY (Resets counter every Jan 1st)</option>
                          <option value="MONTHLY">MONTHLY (Resets counter every 1st of month)</option>
                          <option value="NEVER">NEVER (Continuous sequential numbering)</option>
                        </select>
                      </div>
                    );
                  }

                  if (isNumberingSeries && col.key === "pattern") {
                    const insertTag = (tag: string) => {
                      const current = recordFormValues.pattern || "";
                      setRecordFormValues((prev) => ({
                        ...prev,
                        pattern: current + tag,
                      }));
                    };

                    return (
                      <div key={col.key} className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-slate-700">
                          {col.label} <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          value={recordFormValues[col.key] || ""}
                          onChange={(e) => {
                            setRecordFormValues((prev) => ({
                              ...prev,
                              [col.key]: e.target.value,
                            }));
                          }}
                          placeholder="e.g. AADYA/{YEAR}/{SEQ:4}"
                          className="h-9 font-mono text-xs rounded-xl bg-slate-50"
                        />
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          <span className="text-[10px] text-slate-500 font-medium">Insert tag:</span>
                          {["{YEAR}", "{YY}", "{MONTH}", "{BRANCH}", "{SEQ:4}"].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => insertTag(tag)}
                              className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md border border-blue-200 cursor-pointer"
                            >
                              +{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (isNumberingSeries && col.key === "currentSequence") {
                    return (
                      <div key={col.key} className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700">
                          {col.label}
                        </Label>
                        <Input
                          value={editingRecordId ? String(editingCurrentSequence) : "0"}
                          readOnly
                          disabled
                          className="h-9 text-xs rounded-xl bg-slate-100 font-mono"
                        />
                        <p className="text-[10px] text-slate-500">
                          Counter increments automatically when documents are created.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div key={col.key} className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700">
                        {col.label}
                        {(col.required || col.key === "name") && !col.readOnly && (
                          <span className="text-rose-500 ml-0.5">*</span>
                        )}
                      </Label>
                      <Input
                        type={col.readOnly ? "text" : col.inputType || "text"}
                        value={
                          col.readOnly &&
                          selectedMasterEntity.id === "timeslot" &&
                          col.key === "name"
                            ? buildTimeslotName(
                                recordFormValues.startTime,
                                recordFormValues.endTime
                              )
                            : recordFormValues[col.key] || ""
                        }
                        readOnly={col.readOnly}
                        disabled={col.readOnly}
                        onChange={(e) => {
                          if (col.readOnly) return;
                          const nextValue = e.target.value;
                          setRecordFormValues((prev) => {
                            const next = { ...prev, [col.key]: nextValue };
                            if (
                              selectedMasterEntity.id === "timeslot" &&
                              (col.key === "startTime" || col.key === "endTime")
                            ) {
                              next.name = buildTimeslotName(
                                col.key === "startTime" ? nextValue : next.startTime,
                                col.key === "endTime" ? nextValue : next.endTime
                              );
                            }
                            return next;
                          });
                          // Clear error when user types
                          if (formErrors[col.key]) {
                            setFormErrors((prev) => {
                              const next = { ...prev };
                              delete next[col.key];
                              return next;
                            });
                          }
                        }}
                        placeholder={
                          col.readOnly && selectedMasterEntity.id === "timeslot"
                            ? "Auto from start & end time"
                            : `Enter ${col.label.toLowerCase()}...`
                        }
                        className={`h-9 text-xs rounded-xl ${
                          col.readOnly
                            ? "bg-slate-100 text-slate-700 font-medium"
                            : "bg-slate-50"
                        } ${formErrors[col.key] ? "border-rose-400 focus:ring-rose-300" : ""}`}
                      />
                      {formErrors[col.key] && (
                        <p className="text-[10px] text-rose-500 font-bold">{formErrors[col.key]}</p>
                      )}
                    </div>
                  );
                })}

                {/* Live Preview for numbering series */}
                {selectedMasterEntity.id === "numberingseries" && (
                  <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/80 rounded-2xl space-y-2 mt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Live Pattern Preview
                      </span>
                      <Badge className="bg-blue-600 text-white text-[9px] font-mono">LIVE SAMPLE</Badge>
                    </div>
                    <div className="font-mono text-sm font-black text-blue-700 bg-white px-3.5 py-2 rounded-xl border border-blue-200 shadow-2xs">
                      {formPatternPreview}
                    </div>
                    {editingRecordId && liveFormPreviewData?.data && (
                      <p className="text-[10px] text-blue-700/80">
                        Live counter: last issued #{liveFormPreviewData.data.currentSequence}, next will be #{liveFormPreviewData.data.nextSequence}
                      </p>
                    )}
                    <p className="text-[10px] text-blue-600/80 leading-relaxed">
                      Generated sequentially on creating new {recordFormValues.code || "records"} in Aadya Institute.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddEditRecordOpen(false)}
                  className="text-xs font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveRecord}
                  disabled={createMasterMutation.isPending || updateMasterMutation.isPending}
                  className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl gap-1.5"
                >
                  {(createMasterMutation.isPending || updateMasterMutation.isPending) && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {editingRecordId ? "Save Changes" : "Create Record"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: CONFIRMATION DIALOG ──────────────────────────────────── */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-sm bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Deactivation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-2">
              Are you sure you want to deactivate <strong>"{confirmAction?.recordName}"</strong>?
              This record will be marked as inactive and will no longer appear in new selections across the application.
              Existing references will remain intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => { setIsConfirmDialogOpen(false); setConfirmAction(null); }}
              className="text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleteMasterMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl gap-1.5"
            >
              {deleteMasterMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: AUDIT HISTORY MODAL ─────────────────────────────────── */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Master Setup Audit Log
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Recent master record modifications made by administrators.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 my-3 divide-y divide-slate-100 text-xs">
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <History className="h-8 w-8 mb-3 text-slate-300" />
              <span className="text-sm font-bold text-slate-500">Audit history</span>
              <p className="text-xs text-slate-400 mt-1">All master data changes are tracked in the Activity Log.</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsHistoryModalOpen(false)}
              className="text-xs font-bold rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
