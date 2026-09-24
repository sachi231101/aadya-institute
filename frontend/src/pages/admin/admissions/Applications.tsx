import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useApplications,
  useApplicationById,
  useApplicationActivities,
  useCreateApplication,
  useUpdateApplication,
  useAddApplicationActivity,
} from "../../../hooks/useAdmissions";
import { useCreateApplicationFromLead } from "../../../hooks/useLeads";
import { useCourses } from "../../../hooks/useCourses";
import { useBranches } from "../../../hooks/useBranches";
import { useAuthStore } from "@/store/auth.store";
import {
  mapApplicationFromApi,
  type ApplicationListItem,
} from "../../../utils/map-application";
import { PermissionGate, ReadOnlyBanner } from "@/components/permissions/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { Plus, CheckCircle2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ApplicationsToolbar } from "./components/ApplicationsToolbar";
import { ApplicationsTable } from "./components/ApplicationsTable";
import { ApplicationDetailsSheet } from "./components/ApplicationDetailsSheet";
import {
  ApplicationCreateDialog,
  type LeadPrefill,
} from "./components/ApplicationCreateDialog";
import type { ApplicationCreateFormValues } from "./application-create.schema";

const PAGE_SIZE = 20;

function rolePrefixFromPath(pathname: string) {
  if (pathname.startsWith("/counselor")) return "/counselor";
  if (pathname.startsWith("/center")) return "/center";
  return "/admin";
}

export const Applications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { canEditItem } = usePermissions();
  const canEditApplications = canEditItem("admissions.applications");
  const rolePrefix = rolePrefixFromPath(location.pathname);
  const isAdmin = user?.roles?.includes("ADMIN");
  const requireBranch = !!isAdmin && !user?.branchId;

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [feeFilter, setFeeFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [leadPrefill, setLeadPrefill] = useState<LeadPrefill | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Deep-link: open detail after lead creates application
  useEffect(() => {
    const state = location.state as {
      applicationId?: string;
      lead?: LeadPrefill;
      leadId?: string;
    } | null;
    if (!state) return;

    if (state.applicationId) {
      setSelectedAppId(state.applicationId);
      setIsDetailsOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    if (state.lead || state.leadId) {
      if (state.lead) {
        setLeadPrefill(state.lead);
        setIsCreateOpen(true);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const listParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      feeStatus: feeFilter === "ALL" ? undefined : feeFilter,
      courseId: courseFilter === "ALL" ? undefined : courseFilter,
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [debouncedSearch, feeFilter, courseFilter, currentPage]
  );

  const { data: dbApplicationsRes, isLoading: isLoadingApplications } =
    useApplications(listParams);
  const { data: selectedAppRes, isLoading: isLoadingDetails } = useApplicationById(
    selectedAppId || ""
  );
  const { data: activitiesRes } = useApplicationActivities(selectedAppId || "");
  const { courses } = useCourses();
  const { data: branchesRes } = useBranches(isAdmin ? { limit: 100 } : undefined);

  const createApplicationMutation = useCreateApplication();
  const createFromLeadMutation = useCreateApplicationFromLead();
  const updateApplicationMutation = useUpdateApplication();
  const addNoteMutation = useAddApplicationActivity();

  const applicationsList = useMemo(() => {
    const rawList = dbApplicationsRes?.data || [];
    return rawList.map((app) =>
      mapApplicationFromApi(app as Parameters<typeof mapApplicationFromApi>[0])
    );
  }, [dbApplicationsRes]);

  const meta = dbApplicationsRes?.meta;
  const total = meta?.total ?? applicationsList.length;

  const selectedApplication = useMemo(() => {
    if (selectedAppRes?.data) {
      return mapApplicationFromApi(
        selectedAppRes.data as Parameters<typeof mapApplicationFromApi>[0]
      );
    }
    if (selectedAppId) {
      return applicationsList.find((a) => a.id === selectedAppId) ?? null;
    }
    return null;
  }, [selectedAppRes, selectedAppId, applicationsList]);

  const activities = activitiesRes?.data || selectedAppRes?.data?.activities || [];

  const feePendingCount = applicationsList.filter((a) => a.feeStatus === "NOT_PAID").length;
  const convertedCount = applicationsList.filter(
    (a) => a.status === "ADMITTED" || a.status === "APPROVED"
  ).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleConvertToAdmission = (app: ApplicationListItem) => {
    navigate(`${rolePrefix}/admissions/direct-entry`, {
      state: {
        application: app,
        applicationId: app.id,
        leadId: app.leadId || undefined,
        lead: {
          id: app.leadId || app.id,
          applicationId: app.id,
          applicationNo: app.applicationNo,
          name: app.applicantName,
          phone: app.phone,
          email: app.email,
          course: app.courseName,
          courseId: app.courseId,
          courseCode: app.courseCode,
          feeStatus: app.feeStatus,
          notes: app.notes,
          source: "Application",
        },
      },
    });
  };

  const handleCreate = async (values: ApplicationCreateFormValues) => {
    setCreateError(null);
    try {
      if (values.leadId) {
        await createFromLeadMutation.mutateAsync({
          id: values.leadId,
          data: {
            courseId: values.courseId,
            feeStatus: values.feeStatus,
            applicationFee:
              values.feeStatus === "PAID" ? values.applicationFee : undefined,
            paymentModeMasterId:
              values.feeStatus === "PAID" ? values.paymentModeMasterId : undefined,
            paymentRef:
              values.feeStatus === "PAID" && values.paymentRef
                ? values.paymentRef
                : undefined,
            notes: values.notes,
            branchId: values.branchId || undefined,
          },
        });
      } else {
        if (requireBranch && !values.branchId) {
          setCreateError("Branch is required to create an application");
          return;
        }
        await createApplicationMutation.mutateAsync({
          applicantName: values.applicantName,
          phone: values.phone,
          email: values.email || undefined,
          courseId: values.courseId,
          branchId: values.branchId || undefined,
          feeStatus: values.feeStatus,
          applicationFee:
            values.feeStatus === "PAID" ? values.applicationFee : undefined,
          paymentModeMasterId:
            values.feeStatus === "PAID" ? values.paymentModeMasterId : undefined,
          paymentRef:
            values.feeStatus === "PAID" && values.paymentRef
              ? values.paymentRef
              : undefined,
          notes: values.notes || undefined,
        });
      }
      setIsCreateOpen(false);
      setLeadPrefill(null);
      setCurrentPage(1);
      showToast("Application created successfully!");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        "Failed to create application.";
      setCreateError(message);
    }
  };

  const handleMarkPaid = async (
    appId: string,
    payload: {
      applicationFee: number;
      paymentModeMasterId: string;
      paymentRef?: string;
    }
  ) => {
    try {
      const updated = await updateApplicationMutation.mutateAsync({
        id: appId,
        payload: {
          feeStatus: "PAID",
          applicationFee: payload.applicationFee,
          paymentModeMasterId: payload.paymentModeMasterId,
          paymentRef: payload.paymentRef,
        },
      });
      const receiptNo = updated.data?.payment?.receiptNo;
      showToast(
        receiptNo
          ? `Application fee marked paid · receipt ${receiptNo}`
          : "Application fee marked paid."
      );
    } catch {
      showToast("Failed to update fee status.");
      throw new Error("Failed to update fee status.");
    }
  };

  const handleReject = async (appId: string, reason: string) => {
    try {
      await updateApplicationMutation.mutateAsync({
        id: appId,
        payload: { status: "REJECTED", rejectReason: reason },
      });
      showToast("Application rejected.");
    } catch {
      showToast("Failed to reject application.");
      throw new Error("Failed to reject application.");
    }
  };

  const handleUpdateDetails = async (
    appId: string,
    payload: {
      applicantName: string;
      phone: string;
      email?: string;
      courseId: string;
    }
  ) => {
    try {
      await updateApplicationMutation.mutateAsync({
        id: appId,
        payload,
      });
      showToast("Application details saved.");
    } catch {
      showToast("Failed to save details.");
      throw new Error("Failed to save details.");
    }
  };

  const handleAddNote = async (appId: string, note: string) => {
    try {
      await addNoteMutation.mutateAsync({ id: appId, description: note });
      showToast("Note saved successfully!");
    } catch {
      showToast("Failed to save note.");
      throw new Error("Failed to save note.");
    }
  };

  const handleViewAdmission = (admissionId: string) => {
    navigate(`${rolePrefix}/admissions/all`, { state: { admissionId } });
    setIsDetailsOpen(false);
    setSelectedAppId(null);
  };

  const branches = (branchesRes?.data || []).map((b) => ({ id: b.id, name: b.name }));

  return (
    <PermissionGate itemKey="admissions.applications" mode="read">
      <PageContainer className="space-y-4 text-foreground font-sans">
        <ReadOnlyBanner itemKey="admissions.applications" label="Applications" />

        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-popover text-popover-foreground px-4 py-3 rounded-xl shadow-2xl text-xs font-medium border border-border animate-in fade-in slide-in-from-bottom-3 duration-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <PageHeader
          title="Applications"
          description={`${total} total · ${feePendingCount} fee pending · ${convertedCount} admitted`}
          actions={
            <PermissionGate itemKey="admissions.applications" mode="write">
              <Button
                size="sm"
                onClick={() => {
                  setLeadPrefill(null);
                  setCreateError(null);
                  setIsCreateOpen(true);
                }}
                className="h-9 gap-1.5 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                New application
              </Button>
            </PermissionGate>
          }
        />

        <ApplicationsToolbar
          searchTerm={searchTerm}
          onSearchChange={(v) => {
            setSearchTerm(v);
            setCurrentPage(1);
          }}
          feeFilter={feeFilter}
          onFeeFilterChange={(v) => {
            setFeeFilter(v);
            setCurrentPage(1);
          }}
          courseFilter={courseFilter}
          onCourseFilterChange={(v) => {
            setCourseFilter(v);
            setCurrentPage(1);
          }}
          courses={courses.map((c) => ({ id: c.id, name: c.name }))}
          onClear={() => {
            setSearchTerm("");
            setFeeFilter("ALL");
            setCourseFilter("ALL");
            setCurrentPage(1);
          }}
        />

        <ApplicationsTable
          rows={applicationsList}
          isLoading={isLoadingApplications}
          currentPage={currentPage}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          onRowClick={(app) => {
            setSelectedAppId(app.id);
            setIsDetailsOpen(true);
          }}
        />

        <ApplicationDetailsSheet
          open={isDetailsOpen}
          onOpenChange={(open) => {
            setIsDetailsOpen(open);
            if (!open) setSelectedAppId(null);
          }}
          application={selectedApplication}
          isLoading={isLoadingDetails}
          activities={activities}
          courses={courses.map((c) => ({ id: c.id, name: c.name }))}
          canEdit={canEditApplications}
          isUpdating={updateApplicationMutation.isPending}
          isAddingNote={addNoteMutation.isPending}
          leadBasePath={`${rolePrefix}/leads`}
          portalBasePath={rolePrefix}
          onMarkPaid={handleMarkPaid}
          onReject={handleReject}
          onUpdateDetails={handleUpdateDetails}
          onConvert={(app) => {
            handleConvertToAdmission(app);
            setIsDetailsOpen(false);
            setSelectedAppId(null);
          }}
          onViewAdmission={handleViewAdmission}
          onAddNote={handleAddNote}
        />

        <ApplicationCreateDialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setLeadPrefill(null);
              setCreateError(null);
            }
          }}
          courses={courses.map((c) => ({ id: c.id, name: c.name }))}
          branches={branches}
          requireBranch={requireBranch}
          leadPrefill={leadPrefill}
          leadBasePath={`${rolePrefix}/leads`}
          isSubmitting={
            createApplicationMutation.isPending || createFromLeadMutation.isPending
          }
          serverError={createError}
          onSubmit={handleCreate}
        />
      </PageContainer>
    </PermissionGate>
  );
};
