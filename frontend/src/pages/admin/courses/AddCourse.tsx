import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useCourses } from "../../../hooks/useCourses";
import { useBranches } from "../../../hooks/useBranches";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Keep the typed digits. Empty stays empty, and a leading 0 is not forced back in. */
const toNumericInput = (value: string) => value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

const fieldClass = "rounded-lg text-sm";
const selectClass =
  "w-full h-9 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer";
const labelClass = "block text-xs font-medium text-foreground mb-1.5";

export const AddCourse: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canEditItem, isAdmin, roleScope } = usePermissions();
  const user = useAuthStore((s) => s.user);
  const coursesListPath = location.pathname.startsWith("/center")
    ? "/center/courses/all"
    : "/admin/courses/all";
  const canWrite = isAdmin || !roleScope || canEditItem("courses.all");
  const { createCourse } = useCourses();
  const { data: branchesResponse, isLoading: branchesLoading } = useBranches({
    limit: 100,
    status: "ACTIVE",
  });
  const branches = branchesResponse?.data ?? [];

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"OFFLINE" | "ONLINE" | "HYBRID">("HYBRID");
  const [level, setLevel] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">("BEGINNER");
  const [durationMonths, setDurationMonths] = useState("");
  const [totalHours, setTotalHours] = useState("");
  const [fee, setFee] = useState("");
  const [description, setDescription] = useState("");
  const [branchIds, setBranchIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const showBranchSelector = branches.length >= 2;
  const lockedBranchId = useMemo(() => {
    if (isAdmin) return undefined;
    const allowed = user?.allowedBranchIds?.length
      ? user.allowedBranchIds
      : user?.branchId
        ? [user.branchId]
        : [];
    return allowed.length === 1 ? allowed[0] : undefined;
  }, [isAdmin, user?.allowedBranchIds, user?.branchId]);

  useEffect(() => {
    if (!canWrite) {
      navigate(coursesListPath, { replace: true, state: { accessDenied: true, readOnly: true } });
    }
  }, [canWrite, navigate, coursesListPath]);

  useEffect(() => {
    if (branches.length === 0) return;
    if (lockedBranchId) {
      setBranchIds([lockedBranchId]);
      return;
    }
    if (branches.length === 1) {
      setBranchIds([branches[0].id]);
    }
  }, [branches, lockedBranchId]);

  const toggleBranch = (id: string) => {
    if (lockedBranchId) return;
    setBranchIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const allBranchesSelected =
    branches.length > 0 && branches.every((b) => branchIds.includes(b.id));

  const handleSelectAllBranches = () => {
    if (lockedBranchId) return;
    if (allBranchesSelected) {
      setBranchIds([]);
      return;
    }
    setBranchIds(branches.map((b) => b.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const durationValue = durationMonths === "" ? undefined : Number(durationMonths);
    const hoursValue = totalHours === "" ? undefined : Number(totalHours);
    const feeValue = fee === "" ? undefined : Number(fee);

    if (!name || !code) return;
    if (feeValue === undefined || Number.isNaN(feeValue) || feeValue < 0) {
      setError("Enter a valid course fee");
      return;
    }
    if (durationValue !== undefined && (Number.isNaN(durationValue) || durationValue < 1)) {
      setError("Enter a valid duration in months");
      return;
    }
    if (hoursValue !== undefined && (Number.isNaN(hoursValue) || hoursValue < 1)) {
      setError("Enter a valid number of teaching hours");
      return;
    }
    if (showBranchSelector && branchIds.length === 0) {
      setError("Select at least one branch");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await createCourse({
        name,
        code,
        mode,
        level,
        duration: durationValue,
        totalHours: hoursValue,
        fee: feeValue,
        description,
        branchIds:
          branchIds.length > 0
            ? branchIds
            : branches.length === 1
              ? [branches[0].id]
              : undefined,
      });

      setIsSaved(true);
      setTimeout(() => {
        navigate(coursesListPath);
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to create course");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canWrite) {
    return null;
  }

  return (
    <PageContainer maxWidth="narrow" className="animate-in fade-in duration-300">
      <PageHeader
        title="Add Course"
        description="Register a new course for the academy."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => navigate(coursesListPath)}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />

      {isSaved && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p className="text-sm">Course created. Redirecting…</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-rose-700 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="border border-border bg-card shadow-none rounded-lg">
          <CardContent className="p-5 sm:p-6 space-y-6">
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Basic information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Course title *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Advanced Cloud Architecture"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Course code *</label>
                  <Input
                    type="text"
                    placeholder="e.g. CLOUD-2026"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Delivery mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as typeof mode)}
                    className={selectClass}
                  >
                    <option value="HYBRID">Hybrid</option>
                    <option value="OFFLINE">Offline</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Skill level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as typeof level)}
                    className={selectClass}
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-4 pt-2 border-t border-border">
              <h2 className="text-sm font-semibold text-foreground">Duration & fee</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Duration (months)</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(toNumericInput(e.target.value))}
                    placeholder="e.g. 6"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Teaching hours</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={totalHours}
                    onChange={(e) => setTotalHours(toNumericInput(e.target.value))}
                    placeholder="e.g. 200"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fee (₹) *</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={fee}
                    onChange={(e) => setFee(toNumericInput(e.target.value))}
                    required
                    placeholder="e.g. 35000"
                    className={fieldClass}
                  />
                </div>
              </div>
            </section>

            {showBranchSelector && (
              <section className="space-y-3 pt-2 border-t border-border">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Branches *</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select at least one branch that can offer this course.
                    </p>
                  </div>
                  {!lockedBranchId && !branchesLoading && branches.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg h-8 text-xs shrink-0"
                      onClick={handleSelectAllBranches}
                    >
                      {allBranchesSelected ? "Clear all" : "Select all"}
                    </Button>
                  ) : null}
                </div>
                {branchesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading branches…
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {branches.map((b) => {
                      const checked = branchIds.includes(b.id);
                      const locked = Boolean(lockedBranchId);
                      return (
                        <label
                          key={b.id}
                          className={`flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 ${
                            locked
                              ? "opacity-70 cursor-not-allowed"
                              : "cursor-pointer hover:bg-muted/40"
                          } ${checked ? "border-primary/40 bg-primary/5" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={locked}
                            onChange={() => toggleBranch(b.id)}
                            className="rounded"
                          />
                          <span className="text-sm font-medium min-w-0 truncate">{b.name}</span>
                          <span className="text-xs text-muted-foreground font-mono ml-auto shrink-0">
                            {b.code}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            <section className="space-y-3 pt-2 border-t border-border">
              <h2 className="text-sm font-semibold text-foreground">Description</h2>
              <div>
                <label className={labelClass}>Overview / prerequisites</label>
                <textarea
                  rows={4}
                  placeholder="Learning outcomes, prerequisites, tools, projects…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>
            </section>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => navigate(coursesListPath)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-lg"
                disabled={submitting || branchesLoading}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Course
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </PageContainer>
  );
};
