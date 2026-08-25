import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  useMasterRecords,
  useCreateMasterRecord,
  useUpdateMasterRecord,
  useDeleteMasterRecord,
} from "@/hooks/useMasters";

// ─── MASTER ENTITY CATEGORY DEFINITIONS ──────────────────────────────────────

export type MasterCategoryGroup =
  | "ACADEMIC_ORG"
  | "ADMISSIONS_LEADS"
  | "COMMUNICATION_SYSTEM"
  | "INVENTORY"
  | "ACCOUNTING_FEES";

export interface MasterEntity {
  id: string;
  name: string;
  category: MasterCategoryGroup;
  categoryName: string;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  description: string;
  count: number;
  lastUpdated: string;
  status: "ACTIVE" | "INACTIVE";
  columns: { key: string; label: string }[];
}

export const ALL_25_MASTERS: MasterEntity[] = [
  // ─── CATEGORY 1: ACADEMIC & ORGANIZATION (10) ─────────────────────────────
  {
    id: "area",
    name: "Area",
    category: "ACADEMIC_ORG",
    categoryName: "Academic & Organization",
    icon: MapPin,
    iconBgColor: "bg-blue-50 text-blue-600 border-blue-100",
    iconColor: "text-blue-600",
    description: "Manage areas / regions for operations",
    count: 8,
    lastUpdated: "24 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Area Code" },
      { key: "name", label: "Area Name" },
      { key: "city", label: "City" },
      { key: "pincode", label: "PIN Code" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "classroom",
    name: "Class Room",
    category: "ACADEMIC_ORG",
    categoryName: "Academic & Organization",
    icon: School,
    iconBgColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
    iconColor: "text-emerald-600",
    description: "Manage classrooms and locations",
    count: 6,
    lastUpdated: "23 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Room Code" },
      { key: "name", label: "Room Name" },
      { key: "capacity", label: "Capacity" },
      { key: "type", label: "Room Type" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "designation",
    name: "Designation",
    category: "ACADEMIC_ORG",
    categoryName: "Academic & Organization",
    icon: Briefcase,
    iconBgColor: "bg-purple-50 text-purple-600 border-purple-100",
    iconColor: "text-purple-600",
    description: "Manage employee designations",
    count: 7,
    lastUpdated: "22 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Code" },
      { key: "title", label: "Designation Title" },
      { key: "level", label: "Hierarchy Level" },
      { key: "department", label: "Department" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "education",
    name: "Education",
    category: "ACADEMIC_ORG",
    categoryName: "Academic & Organization",
    icon: GraduationCap,
    iconBgColor: "bg-amber-50 text-amber-600 border-amber-100",
    iconColor: "text-amber-600",
    description: "Manage education levels & groups",
    count: 9,
    lastUpdated: "21 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Code" },
      { key: "qualification", label: "Degree / Qualification" },
      { key: "stream", label: "Stream / Field" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "parentinfo",
    name: "Parent Info",
    category: "ACADEMIC_ORG",
    categoryName: "Academic & Organization",
    icon: Users,
    iconBgColor: "bg-teal-50 text-teal-600 border-teal-100",
    iconColor: "text-teal-600",
    description: "Manage parent information types",
    count: 5,
    lastUpdated: "20 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "relation", label: "Relation Type" },
      { key: "occupationGroup", label: "Occupation Group" },
      { key: "incomeBracket", label: "Income Bracket" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "employee",
    name: "Employee",
    category: "ACADEMIC_ORG",
    categoryName: "Academic & Organization",
    icon: UserCheck,
    iconBgColor: "bg-orange-50 text-orange-600 border-orange-100",
    iconColor: "text-orange-600",
    description: "Manage employees and staff",
    count: 5,
    lastUpdated: "24 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "empCode", label: "Emp Code" },
      { key: "name", label: "Staff Name" },
      { key: "role", label: "Role" },
      { key: "branch", label: "Branch" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "holiday",
    name: "Holiday",
    category: "ACADEMIC_ORG",
    categoryName: "Academic & Organization",
    icon: Calendar,
    iconBgColor: "bg-rose-50 text-rose-600 border-rose-100",
    iconColor: "text-rose-600",
    description: "Manage institute holidays",
    count: 5,
    lastUpdated: "19 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "title", label: "Holiday Title" },
      { key: "date", label: "Date" },
      { key: "type", label: "Holiday Type" },
      { key: "description", label: "Details" },
    ],
  },
  {
    id: "timeslot",
    name: "Time Slot",
    category: "ACADEMIC_ORG",
    categoryName: "Academic & Organization",
    icon: Clock,
    iconBgColor: "bg-indigo-50 text-indigo-600 border-indigo-100",
    iconColor: "text-indigo-600",
    description: "Manage time slots for scheduling",
    count: 5,
    lastUpdated: "24 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Slot Code" },
      { key: "startTime", label: "Start Time" },
      { key: "endTime", label: "End Time" },
      { key: "period", label: "Period" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "events",
    name: "Events",
    category: "ACADEMIC_ORG",
    categoryName: "Academic & Organization",
    icon: CalendarCheck,
    iconBgColor: "bg-violet-50 text-violet-600 border-violet-100",
    iconColor: "text-violet-600",
    description: "Manage events and important days",
    count: 4,
    lastUpdated: "18 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "name", label: "Event Name" },
      { key: "date", label: "Event Date" },
      { key: "venue", label: "Venue / Branch" },
      { key: "category", label: "Event Type" },
    ],
  },
  {
    id: "examterm",
    name: "Exam Term",
    category: "ACADEMIC_ORG",
    categoryName: "Academic & Organization",
    icon: FileCheck,
    iconBgColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
    iconColor: "text-emerald-600",
    description: "Manage exam terms and sessions",
    count: 4,
    lastUpdated: "17 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Term Code" },
      { key: "name", label: "Term Name" },
      { key: "academicYear", label: "Academic Year" },
      { key: "status", label: "Status" },
    ],
  },

  // ─── CATEGORY 2: ADMISSIONS & LEADS (6) ───────────────────────────────────
  {
    id: "leadsource",
    name: "Lead Source",
    category: "ADMISSIONS_LEADS",
    categoryName: "Admissions & Leads",
    icon: PhoneCall,
    iconBgColor: "bg-blue-50 text-blue-600 border-blue-100",
    iconColor: "text-blue-600",
    description: "Manage lead sources",
    count: 8,
    lastUpdated: "24 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Source Code" },
      { key: "name", label: "Source Channel" },
      { key: "channelType", label: "Channel Type" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "leadstage",
    name: "Lead Stage",
    category: "ADMISSIONS_LEADS",
    categoryName: "Admissions & Leads",
    icon: Flag,
    iconBgColor: "bg-green-50 text-green-600 border-green-100",
    iconColor: "text-green-600",
    description: "Manage lead stages and pipeline",
    count: 6,
    lastUpdated: "23 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "stageNumber", label: "Order" },
      { key: "name", label: "Stage Name" },
      { key: "description", label: "Pipeline Action" },
      { key: "color", label: "Badge Color" },
    ],
  },
  {
    id: "leadtype",
    name: "Lead Type",
    category: "ADMISSIONS_LEADS",
    categoryName: "Admissions & Leads",
    icon: UserCircle,
    iconBgColor: "bg-purple-50 text-purple-600 border-purple-100",
    iconColor: "text-purple-600",
    description: "Manage types of leads",
    count: 3,
    lastUpdated: "20 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Type Code" },
      { key: "name", label: "Lead Category" },
      { key: "slaHours", label: "Follow-up SLA" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "admissionstatus",
    name: "Admission Status",
    category: "ADMISSIONS_LEADS",
    categoryName: "Admissions & Leads",
    icon: ClipboardList,
    iconBgColor: "bg-amber-50 text-amber-600 border-amber-100",
    iconColor: "text-amber-600",
    description: "Manage admission statuses",
    count: 5,
    lastUpdated: "22 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Status Code" },
      { key: "name", label: "Status Title" },
      { key: "step", label: "Enrollment Step" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "admissionbatch",
    name: "Admission Batch",
    category: "ADMISSIONS_LEADS",
    categoryName: "Admissions & Leads",
    icon: UsersRound,
    iconBgColor: "bg-teal-50 text-teal-600 border-teal-100",
    iconColor: "text-teal-600",
    description: "Manage admission batches",
    count: 5,
    lastUpdated: "24 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "batchCode", label: "Batch Code" },
      { key: "batchName", label: "Batch Name" },
      { key: "capacity", label: "Seat Capacity" },
      { key: "targetIntake", label: "Target Intake" },
    ],
  },
  {
    id: "coursereview",
    name: "Course Review",
    category: "ADMISSIONS_LEADS",
    categoryName: "Admissions & Leads",
    icon: Star,
    iconBgColor: "bg-pink-50 text-pink-600 border-pink-100",
    iconColor: "text-pink-600",
    description: "Manage course reviews",
    count: 5,
    lastUpdated: "21 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "reviewType", label: "Feedback Type" },
      { key: "frequency", label: "Frequency" },
      { key: "ratingScale", label: "Rating Scale" },
      { key: "status", label: "Status" },
    ],
  },

  // ─── CATEGORY 3: COMMUNICATION & SYSTEM (2) ───────────────────────────────
  {
    id: "notificationtemplate",
    name: "Notification Template",
    category: "COMMUNICATION_SYSTEM",
    categoryName: "Communication & System",
    icon: Bell,
    iconBgColor: "bg-blue-50 text-blue-600 border-blue-100",
    iconColor: "text-blue-600",
    description: "Manage notification templates",
    count: 6,
    lastUpdated: "24 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Template Code" },
      { key: "channel", label: "Channel" },
      { key: "trigger", label: "System Trigger" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "assignmenttype",
    name: "Assignment Type",
    category: "COMMUNICATION_SYSTEM",
    categoryName: "Communication & System",
    icon: FileText,
    iconBgColor: "bg-green-50 text-green-600 border-green-100",
    iconColor: "text-green-600",
    description: "Manage assignment types",
    count: 4,
    lastUpdated: "19 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Type Code" },
      { key: "name", label: "Assignment Type" },
      { key: "maxMarks", label: "Standard Max Marks" },
      { key: "status", label: "Status" },
    ],
  },

  // ─── CATEGORY 4: INVENTORY (2) ────────────────────────────────────────────
  {
    id: "inventorycategory",
    name: "Inventory Category",
    category: "INVENTORY",
    categoryName: "Inventory",
    icon: Box,
    iconBgColor: "bg-purple-50 text-purple-600 border-purple-100",
    iconColor: "text-purple-600",
    description: "Manage inventory categories",
    count: 5,
    lastUpdated: "20 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Category Code" },
      { key: "name", label: "Category Name" },
      { key: "department", label: "Custodian Dept" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "inventorysubcategory",
    name: "Inventory Sub Category",
    category: "INVENTORY",
    categoryName: "Inventory",
    icon: Boxes,
    iconBgColor: "bg-orange-50 text-orange-600 border-orange-100",
    iconColor: "text-orange-600",
    description: "Manage inventory subcategories",
    count: 6,
    lastUpdated: "18 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "parentCategory", label: "Parent Category" },
      { key: "code", label: "Sub Category Code" },
      { key: "name", label: "Sub Category Name" },
      { key: "status", label: "Status" },
    ],
  },

  // ─── CATEGORY 5: ACCOUNTING & FEES (5) ────────────────────────────────────
  {
    id: "bankaccounts",
    name: "Bank Accounts",
    category: "ACCOUNTING_FEES",
    categoryName: "Accounting & Fees",
    icon: Landmark,
    iconBgColor: "bg-blue-50 text-blue-600 border-blue-100",
    iconColor: "text-blue-600",
    description: "Manage bank accounts",
    count: 3,
    lastUpdated: "24 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "accountName", label: "Bank Name" },
      { key: "accountNumber", label: "Account No" },
      { key: "ifsc", label: "IFSC Code" },
      { key: "branch", label: "Bank Branch" },
    ],
  },
  {
    id: "feeheads",
    name: "Fee Heads",
    category: "ACCOUNTING_FEES",
    categoryName: "Accounting & Fees",
    icon: IndianRupee,
    iconBgColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
    iconColor: "text-emerald-600",
    description: "Manage fee heads",
    count: 5,
    lastUpdated: "22 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Head Code" },
      { key: "name", label: "Fee Head Title" },
      { key: "type", label: "Fee Type" },
      { key: "gstApplicable", label: "GST Rate" },
    ],
  },
  {
    id: "ledgers",
    name: "Ledgers",
    category: "ACCOUNTING_FEES",
    categoryName: "Accounting & Fees",
    icon: BookMarked,
    iconBgColor: "bg-purple-50 text-purple-600 border-purple-100",
    iconColor: "text-purple-600",
    description: "Manage financial ledgers",
    count: 8,
    lastUpdated: "23 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Ledger Code" },
      { key: "name", label: "Ledger Name" },
      { key: "group", label: "Account Group" },
      { key: "openingBalance", label: "Opening Balance" },
    ],
  },
  {
    id: "paymentmodes",
    name: "Payment Modes",
    category: "ACCOUNTING_FEES",
    categoryName: "Accounting & Fees",
    icon: CreditCard,
    iconBgColor: "bg-amber-50 text-amber-600 border-amber-100",
    iconColor: "text-amber-600",
    description: "Manage payment modes",
    count: 5,
    lastUpdated: "24 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Mode Code" },
      { key: "name", label: "Payment Mode" },
      { key: "processingFee", label: "Gateway Charge" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "concessionheads",
    name: "Concession Heads",
    category: "ACCOUNTING_FEES",
    categoryName: "Accounting & Fees",
    icon: Percent,
    iconBgColor: "bg-teal-50 text-teal-600 border-teal-100",
    iconColor: "text-teal-600",
    description: "Manage concession heads",
    count: 4,
    lastUpdated: "19 Aug 2026",
    status: "ACTIVE",
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Scholarship / Discount" },
      { key: "percentage", label: "Max Discount" },
      { key: "approvalLevel", label: "Approval Required" },
    ],
  },
];

// Initial records store (populated dynamically from PostgreSQL API)
const INITIAL_RECORDS: Record<string, Record<string, string>[]> = {};

export const MasterSetup: React.FC = () => {
  // View switcher: "GRID" or "CRUD"
  const [viewMode, setViewMode] = useState<"GRID" | "CRUD">("GRID");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("ALL");

  // Active Entity Selection (for modal/records drill-down)
  const [selectedMasterEntity, setSelectedMasterEntity] = useState<MasterEntity | null>(null);
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false);

  // Record CRUD Store
  const [recordsData, setRecordsData] = useState<Record<string, Record<string, string>[]>>(INITIAL_RECORDS);
  const [isAddEditRecordOpen, setIsAddEditRecordOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordFormValues, setRecordFormValues] = useState<Record<string, string>>({});
  const [recordSearchQuery, setRecordSearchQuery] = useState("");

  // History & Toast
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtered Master Entities
  const filteredMasters = useMemo(() => {
    return ALL_25_MASTERS.filter((entity) => {
      // Category filter
      if (selectedModuleFilter !== "ALL" && entity.category !== selectedModuleFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = entity.name.toLowerCase().includes(q);
        const matchDesc = entity.description.toLowerCase().includes(q);
        const matchCat = entity.categoryName.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) {
          return false;
        }
      }

      return true;
    });
  }, [searchQuery, selectedModuleFilter]);

  // Real PostgreSQL Backend API Hooks
  const createMasterMutation = useCreateMasterRecord();
  const updateMasterMutation = useUpdateMasterRecord();
  const deleteMasterMutation = useDeleteMasterRecord();

  // Active Entity Selection query from PostgreSQL
  const { data: entityApiData, isLoading: isEntityLoading } = useMasterRecords(
    selectedMasterEntity?.id
  );

  // Sync real database records into local state for rendering & instant filtering
  React.useEffect(() => {
    if (selectedMasterEntity && entityApiData?.data) {
      const mapped = entityApiData.data.map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code || "",
        description: r.description || "",
        status: r.status === "ACTIVE" ? "Active" : "Inactive",
        ...(r.data || {}),
      }));
      setRecordsData((prev) => ({
        ...prev,
        [selectedMasterEntity.id]: mapped,
      }));
    }
  }, [selectedMasterEntity, entityApiData]);

  // Grouped filtered entities by Category
  const academicMasters = useMemo(() => filteredMasters.filter((m) => m.category === "ACADEMIC_ORG"), [filteredMasters]);
  const admissionsMasters = useMemo(() => filteredMasters.filter((m) => m.category === "ADMISSIONS_LEADS"), [filteredMasters]);
  const communicationMasters = useMemo(() => filteredMasters.filter((m) => m.category === "COMMUNICATION_SYSTEM"), [filteredMasters]);
  const inventoryMasters = useMemo(() => filteredMasters.filter((m) => m.category === "INVENTORY"), [filteredMasters]);
  const accountingMasters = useMemo(() => filteredMasters.filter((m) => m.category === "ACCOUNTING_FEES"), [filteredMasters]);

  // Open records drilldown for an entity
  const handleOpenMasterRecords = (entity: MasterEntity) => {
    setSelectedMasterEntity(entity);
    setRecordSearchQuery("");
    setIsRecordsModalOpen(true);
  };

  // Open Add Record Dialog
  const handleOpenAddRecord = (entity: MasterEntity) => {
    setSelectedMasterEntity(entity);
    setEditingRecordId(null);
    const initialForm: Record<string, string> = {};
    entity.columns.forEach((col) => {
      initialForm[col.key] = "";
    });
    setRecordFormValues(initialForm);
    setIsAddEditRecordOpen(true);
  };

  // Open Edit Record Dialog
  const handleOpenEditRecord = (entity: MasterEntity, rec: Record<string, string>) => {
    setSelectedMasterEntity(entity);
    setEditingRecordId(rec.id);
    setRecordFormValues({ ...rec });
    setIsAddEditRecordOpen(true);
  };

  // Save Add/Edit Record to PostgreSQL Backend
  const handleSaveRecord = async () => {
    if (!selectedMasterEntity) return;
    const entityId = selectedMasterEntity.id;

    const recordName =
      recordFormValues.name ||
      recordFormValues.title ||
      recordFormValues.qualification ||
      recordFormValues.batchName ||
      recordFormValues.reviewType ||
      recordFormValues.role ||
      selectedMasterEntity.name;

    const recordCode =
      recordFormValues.code ||
      recordFormValues.stageNumber ||
      recordFormValues.empCode ||
      recordFormValues.batchCode ||
      recordFormValues.slotCode ||
      undefined;

    const recordDesc = recordFormValues.description || recordFormValues.details || undefined;

    try {
      if (editingRecordId) {
        // Update via PostgreSQL Backend API
        await updateMasterMutation.mutateAsync({
          entityType: entityId,
          id: editingRecordId,
          payload: {
            name: recordName,
            code: recordCode,
            description: recordDesc,
            data: { ...recordFormValues },
          },
        });

        setRecordsData((prev) => ({
          ...prev,
          [entityId]: (prev[entityId] || []).map((r) =>
            r.id === editingRecordId ? { ...recordFormValues, id: editingRecordId } : r
          ),
        }));
        setToastMessage(`✓ Record updated in ${selectedMasterEntity.name} (PostgreSQL).`);
      } else {
        // Create via PostgreSQL Backend API
        const created = await createMasterMutation.mutateAsync({
          entityType: entityId,
          payload: {
            name: recordName,
            code: recordCode,
            description: recordDesc,
            data: { ...recordFormValues },
          },
        });

        const newRec = {
          ...recordFormValues,
          id: created.data.id,
          name: recordName,
          code: recordCode || "",
        };

        setRecordsData((prev) => ({
          ...prev,
          [entityId]: [newRec, ...(prev[entityId] || [])],
        }));
        setToastMessage(`✓ New record saved to ${selectedMasterEntity.name} (PostgreSQL).`);
      }
    } catch (err: any) {
      setToastMessage(`⚠ Failed to save record: ${err?.message || "Server error"}`);
    }

    setIsAddEditRecordOpen(false);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Delete Record from PostgreSQL Backend
  const handleDeleteRecord = async (entityId: string, recId: string) => {
    try {
      await deleteMasterMutation.mutateAsync({
        entityType: entityId,
        id: recId,
      });

      setRecordsData((prev) => ({
        ...prev,
        [entityId]: (prev[entityId] || []).filter((r) => r.id !== recId),
      }));
      setToastMessage(`✓ Record deleted from ${selectedMasterEntity?.name || "master"}.`);
    } catch (err: any) {
      setToastMessage(`⚠ Failed to delete record: ${err?.message || "Server error"}`);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Export CSV
  const handleExportCSV = (entity: MasterEntity) => {
    const list = recordsData[entity.id] || [];
    if (list.length === 0) {
      setToastMessage("⚠ No records to export.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const headers = entity.columns.map((c) => c.label).join(",");
    const rows = list
      .map((r) => entity.columns.map((c) => `"${r[c.key] || ""}"`).join(","))
      .join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aadya_${entity.name.replace(/\s+/g, "_")}_Master.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage(`✓ Exported ${list.length} records for ${entity.name}.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper renderer for entity card in Grid View
  const renderEntityCard = (entity: MasterEntity) => {
    const currentCount = recordsData[entity.id]?.length ?? 0;
    const IconComp = entity.icon;

    return (
      <div
        key={entity.id}
        onClick={() => handleOpenMasterRecords(entity)}
        className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group min-h-[140px]"
      >
        <div>
          {/* Top Icon & Status */}
          <div className="flex items-start justify-between gap-2">
            <div className={`p-2.5 rounded-xl border ${entity.iconBgColor} shrink-0 transition-transform group-hover:scale-105`}>
              <IconComp className="h-5 w-5 stroke-[2.2]" />
            </div>
          </div>

          {/* Name & Description */}
          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm mt-3 tracking-tight group-hover:text-[#1769AA] transition-colors">
            {entity.name}
          </h4>
          <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-0.5 leading-relaxed">
            {entity.description}
          </p>
        </div>

        {/* Bottom Counts and Arrow */}
        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold text-slate-500">
            {currentCount} Records
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#1769AA] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
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
              25 Entities
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "GRID"
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "CRUD"
                ? "bg-[#1769AA] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="h-4 w-4" />
            <span>CRUD View</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-bold shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── 2. SEARCH & MODULE CATEGORY FILTER BAR ───────────────────────── */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search master by name, code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 bg-slate-50 border-slate-200 text-xs font-medium rounded-xl focus:bg-white"
          />
        </div>

        {/* Category Module Filter */}
        <div className="relative min-w-[220px]">
          <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          <select
            value={selectedModuleFilter}
            onChange={(e) => setSelectedModuleFilter(e.target.value)}
            className="w-full h-10 pl-9 pr-8 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1769AA]/30 outline-none appearance-none cursor-pointer"
          >
            <option value="ALL">All Modules (25)</option>
            <option value="ACADEMIC_ORG">Academic & Organization (10)</option>
            <option value="ADMISSIONS_LEADS">Admissions & Leads (6)</option>
            <option value="COMMUNICATION_SYSTEM">Communication & System (2)</option>
            <option value="INVENTORY">Inventory (2)</option>
            <option value="ACCOUNTING_FEES">Accounting & Fees (5)</option>
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
            ▼
          </div>
        </div>
      </div>

      {/* ─── 3. GRID VIEW (5 CATEGORIZED CONTAINERS) ─────────────────────── */}
      {viewMode === "GRID" && (
        <div className="space-y-6">
          {/* CATEGORY 1: ACADEMIC & ORGANIZATION (10) */}
          {(selectedModuleFilter === "ALL" || selectedModuleFilter === "ACADEMIC_ORG") && academicMasters.length > 0 && (
            <Card className="border-slate-200/80 shadow-xs bg-slate-50/40 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight uppercase">
                    Academic & Organization
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Manage academic structure, staff, classrooms and institutional setup.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedModuleFilter("ACADEMIC_ORG")}
                  className="text-xs font-extrabold text-[#1769AA] hover:text-[#125890] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <span>View All (10)</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {academicMasters.map(renderEntityCard)}
              </div>
            </Card>
          )}

          {/* CATEGORY 2: ADMISSIONS & LEADS (6) */}
          {(selectedModuleFilter === "ALL" || selectedModuleFilter === "ADMISSIONS_LEADS") && admissionsMasters.length > 0 && (
            <Card className="border-slate-200/80 shadow-xs bg-slate-50/40 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight uppercase">
                    Admissions & Leads
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure lead management and admission related masters.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedModuleFilter("ADMISSIONS_LEADS")}
                  className="text-xs font-extrabold text-[#1769AA] hover:text-[#125890] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <span>View All (6)</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {admissionsMasters.map(renderEntityCard)}
              </div>
            </Card>
          )}

          {/* ROW 3: CATEGORY 3 (COMMUNICATION & SYSTEM) & CATEGORY 4 (INVENTORY) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CATEGORY 3: COMMUNICATION & SYSTEM (2) */}
            {(selectedModuleFilter === "ALL" || selectedModuleFilter === "COMMUNICATION_SYSTEM") && communicationMasters.length > 0 && (
              <Card className="border-slate-200/80 shadow-xs bg-slate-50/40 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase">
                      Communication & System
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Templates and system-level configurations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedModuleFilter("COMMUNICATION_SYSTEM")}
                    className="text-xs font-bold text-[#1769AA] hover:underline cursor-pointer"
                  >
                    View All (2) →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {communicationMasters.map(renderEntityCard)}
                </div>
              </Card>
            )}

            {/* CATEGORY 4: INVENTORY (2) */}
            {(selectedModuleFilter === "ALL" || selectedModuleFilter === "INVENTORY") && inventoryMasters.length > 0 && (
              <Card className="border-slate-200/80 shadow-xs bg-slate-50/40 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase">
                      Inventory
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Manage inventory and stock related masters.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedModuleFilter("INVENTORY")}
                    className="text-xs font-bold text-[#1769AA] hover:underline cursor-pointer"
                  >
                    View All (2) →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {inventoryMasters.map(renderEntityCard)}
                </div>
              </Card>
            )}
          </div>

          {/* ROW 4: CATEGORY 5: ACCOUNTING & FEES (5) - FULL WIDTH SPACIOUS 5 COLUMNS */}
          {(selectedModuleFilter === "ALL" || selectedModuleFilter === "ACCOUNTING_FEES") && accountingMasters.length > 0 && (
            <Card className="border-slate-200/80 shadow-xs bg-slate-50/40 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight uppercase">
                    Accounting & Fees
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Financial and accounting master configurations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedModuleFilter("ACCOUNTING_FEES")}
                  className="text-xs font-extrabold text-[#1769AA] hover:text-[#125890] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <span>View All (5)</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {accountingMasters.map(renderEntityCard)}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── 4. CRUD VIEW (STRUCTURED CATALOG TABLE) ──────────────────────── */}
      {viewMode === "CRUD" && (
        <Card className="border border-border shadow-xs bg-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[950px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-[11px] font-bold text-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4 pl-5">ENTITY NAME</th>
                  <th className="py-3.5 px-4">CATEGORY</th>
                  <th className="py-3.5 px-4">DESCRIPTION</th>
                  <th className="py-3.5 px-3 text-center">RECORDS</th>
                  <th className="py-3.5 px-3">LAST UPDATED</th>
                  <th className="py-3.5 px-3 text-center">STATUS</th>
                  <th className="py-3.5 px-4 text-center">ACTIONS</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/70 bg-card">
                {filteredMasters.map((item) => {
                  const currentCount = recordsData[item.id]?.length ?? 0;
                  const IconComp = item.icon;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Entity Name */}
                      <td className="py-3.5 px-4 pl-5 font-bold text-slate-900 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl border ${item.iconBgColor} shrink-0`}>
                            <IconComp className="h-4 w-4 stroke-[2.2]" />
                          </div>
                          <span>{item.name}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 align-middle">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.categoryName}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium align-middle max-w-xs truncate">
                        {item.description}
                      </td>

                      {/* Records */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800 align-middle">
                        {currentCount}
                      </td>

                      {/* Last Updated */}
                      <td className="py-3.5 px-3 text-slate-500 font-medium align-middle">
                        {item.lastUpdated}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      </td>

                      {/* Actions */}
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
            <span className="font-extrabold text-slate-900 text-xs block">
              About Master Setup
            </span>
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
        <DialogContent className="sm:max-w-4xl bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
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
                      {recordsData[selectedMasterEntity.id]?.length || 0} Records
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
                      <Plus className="h-3.5 w-3.5" /> + Add Record
                    </Button>
                  </div>
                </div>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  {selectedMasterEntity.description}
                </DialogDescription>
              </DialogHeader>

              {/* Records Filter */}
              <div className="relative my-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder={`Search ${selectedMasterEntity.name.toLowerCase()} records...`}
                  value={recordSearchQuery}
                  onChange={(e) => setRecordSearchQuery(e.target.value)}
                  className="h-9 pl-9 text-xs rounded-xl bg-slate-50"
                />
              </div>

              {/* Records Table */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      {selectedMasterEntity.columns.map((col) => (
                        <th key={col.key} className="py-2.5 px-3">
                          {col.label}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(recordsData[selectedMasterEntity.id] || [])
                      .filter((r) => {
                        if (!recordSearchQuery.trim()) return true;
                        return Object.values(r).some((val) =>
                          val.toLowerCase().includes(recordSearchQuery.toLowerCase())
                        );
                      })
                      .map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          {selectedMasterEntity.columns.map((col) => (
                            <td key={col.key} className="py-2.5 px-3 text-slate-800 font-medium">
                              {rec[col.key] || "—"}
                            </td>
                          ))}
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
                                onClick={() => handleDeleteRecord(selectedMasterEntity.id, rec.id)}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer"
                                title="Delete Record"
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
                  Fill in the details for this master entity record.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 my-3 text-xs">
                {selectedMasterEntity.columns.map((col) => (
                  <div key={col.key} className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">{col.label}</Label>
                    <Input
                      value={recordFormValues[col.key] || ""}
                      onChange={(e) =>
                        setRecordFormValues((prev) => ({
                          ...prev,
                          [col.key]: e.target.value,
                        }))
                      }
                      placeholder={`Enter ${col.label.toLowerCase()}...`}
                      className="h-9 text-xs rounded-xl bg-slate-50"
                    />
                  </div>
                ))}
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
                  className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl"
                >
                  {editingRecordId ? "Save Changes" : "Create Record"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: AUDIT HISTORY MODAL ─────────────────────────────────── */}
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
            <div className="pt-2">
              <span className="font-bold text-slate-800 block">Added 'Vidyanagar' to Area Master</span>
              <span className="text-[11px] text-slate-500">By Aadya Admin • 24 Aug 2026, 11:20 AM</span>
            </div>
            <div className="pt-2">
              <span className="font-bold text-slate-800 block">Updated Time Slot 'SLOT-03' Timings</span>
              <span className="text-[11px] text-slate-500">By Aadya Admin • 23 Aug 2026, 04:15 PM</span>
            </div>
            <div className="pt-2">
              <span className="font-bold text-slate-800 block">Created 'Campus Recruitment' in Events</span>
              <span className="text-[11px] text-slate-500">By Aadya Admin • 22 Aug 2026, 02:40 PM</span>
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
