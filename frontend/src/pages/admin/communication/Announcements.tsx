import React, { useMemo, useState } from "react";
import { Megaphone, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader, PageSection } from "@/components/layout";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useAuthStore } from "@/store/auth.store";
import { useBranches } from "@/hooks/useBranches";
import { useBatches } from "@/hooks/useBatches";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
} from "@/hooks/useAnnouncements";
import type { AnnouncementTargetRole } from "@/services/announcements.api";

const AUDIENCE_OPTIONS: { value: AnnouncementTargetRole; label: string }[] = [
  { value: "STUDENT", label: "Students" },
  { value: "FACULTY", label: "Faculty" },
  { value: "COUNSELLOR", label: "Counsellors" },
  { value: "CENTER_MANAGER", label: "Center Managers" },
  { value: "ALL", label: "Everyone" },
];

const formatWhen = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const CommunicationAnnouncements: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const roles = (user?.roles || []).map((role) => role.toUpperCase());
  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
  const isCounsellor = roles.includes("COUNSELLOR") && !isAdmin && !roles.includes("CENTER_MANAGER");
  const canPickAudience = !isCounsellor;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<"GENERAL" | "CLASS" | "ASSIGNMENT" | "URGENT">("GENERAL");
  const [targetRole, setTargetRole] = useState<AnnouncementTargetRole>("STUDENT");
  const [branchId, setBranchId] = useState(user?.branchId || "");
  const [batchId, setBatchId] = useState("");
  const [error, setError] = useState("");

  const { data: branchRes } = useBranches({ limit: 100 });
  const { batches } = useBatches(branchId ? undefined : undefined);
  const { data: listRes, isLoading } = useAnnouncements({ limit: 50, status: "ALL", view: "sent" });
  const createMutation = useCreateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const branches = branchRes?.data || [];

  const audience = isCounsellor ? "STUDENT" : targetRole;
  const batchOptions = useMemo(() => {
    return batches.filter((batch) => !branchId || batch.branchId === branchId);
  }, [batches, branchId]);

  const portal = location.pathname.startsWith("/counselor")
    ? "counselor"
    : location.pathname.startsWith("/center")
      ? "center"
      : "admin";

  const publish = async (status: "PUBLISHED" | "DRAFT") => {
    setError("");
    if (!title.trim() || !body.trim()) {
      setError("Title and message are required.");
      return;
    }
    if (!isAdmin && !branchId) {
      setError("Select a branch.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        type,
        status,
        targetRole: audience,
        branchId: branchId || undefined,
        batchId: audience === "STUDENT" && batchId ? batchId : undefined,
      });
      setTitle("");
      setBody("");
      setBatchId("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save announcement";
      setError(message);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Announcements"
        description={
          isCounsellor
            ? "Send a notice to students in your branch."
            : "Choose who should see this notice, then publish it to their inbox."
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <PageSection title="New announcement" className="xl:col-span-5">
          <form
            className="bg-card border border-border/80 rounded-xl p-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void publish("PUBLISHED");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="announcement-title">Title</Label>
              <Input
                id="announcement-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Exam schedule update"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="announcement-body">Message</Label>
              <Textarea
                id="announcement-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={6}
                placeholder="Write the announcement"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="announcement-type">Type</Label>
                <select
                  id="announcement-type"
                  value={type}
                  onChange={(event) => setType(event.target.value as typeof type)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="GENERAL">General</option>
                  <option value="CLASS">Class</option>
                  <option value="ASSIGNMENT">Assignment</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="announcement-audience">Audience</Label>
                <select
                  id="announcement-audience"
                  value={audience}
                  disabled={!canPickAudience}
                  onChange={(event) => {
                    const next = event.target.value as AnnouncementTargetRole;
                    setTargetRole(next);
                    if (next !== "STUDENT") setBatchId("");
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-70"
                >
                  {(canPickAudience ? AUDIENCE_OPTIONS : AUDIENCE_OPTIONS.filter((option) => option.value === "STUDENT")).map(
                    (option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="announcement-branch">Branch</Label>
                <select
                  id="announcement-branch"
                  value={branchId}
                  onChange={(event) => {
                    setBranchId(event.target.value);
                    setBatchId("");
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {isAdmin && <option value="">Whole institute</option>}
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              {audience === "STUDENT" && (
                <div className="space-y-1.5">
                  <Label htmlFor="announcement-batch">Batch</Label>
                  <select
                    id="announcement-batch"
                    value={batchId}
                    onChange={(event) => setBatchId(event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{branchId ? "All students in branch" : "All students"}</option>
                    {batchOptions.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <PermissionGate itemKey="communication.announcements" mode="write">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Publish
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={createMutation.isPending}
                  onClick={() => void publish("DRAFT")}
                >
                  Save draft
                </Button>
              </PermissionGate>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Portal: {portal}. Publishing adds the notice to the matching inbox. It does not send WhatsApp or email.
            </p>
          </form>
        </PageSection>

        <PageSection title="Posted announcements" className="xl:col-span-7">
          <div className="bg-card border border-border/80 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-8 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (listRes?.data || []).length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No announcements posted yet.
              </div>
            ) : (
              <div className="divide-y divide-border/80">
                {(listRes?.data || []).map((item) => (
                  <div key={item.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold truncate">{item.title}</h3>
                        <Badge variant="outline">{item.status}</Badge>
                        <Badge variant="secondary">{item.targetRole}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.body}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.authorRole} · {item.batch?.name || item.branch?.name || "Institute"} ·{" "}
                        {item.readCount ?? 0} read · {formatWhen(item.publishedAt)}
                      </p>
                    </div>
                    <PermissionGate itemKey="communication.announcements" mode="write">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => void deleteMutation.mutateAsync(item.id)}
                      >
                        Delete
                      </Button>
                    </PermissionGate>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PageSection>
      </div>
    </PageContainer>
  );
};
