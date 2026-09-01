import React, { useState } from "react";
import { Trophy, Loader2, AlertCircle, Plus } from "lucide-react";
import {
  usePlacements,
  useCreatePlacement,
  usePlacementCompanies,
  usePlacementJobs,
} from "@/hooks/usePlacement";
import { useStudentList } from "@/hooks/useStudents";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Placements: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    studentId: "",
    companyId: "",
    jobId: "",
    package: "",
    joiningDate: "",
    status: "OFFERED",
    notes: "",
  });

  const { data, isLoading, isError, refetch } = usePlacements({ limit: 50 });
  const { data: companiesData } = usePlacementCompanies({ limit: 100 });
  const { data: jobsData } = usePlacementJobs({ limit: 100 });
  const { data: studentsData } = useStudentList({ limit: 100 });
  const createMutation = useCreatePlacement();

  const placements = data?.data?.data || data?.data || [];
  const companies = companiesData?.data?.data || companiesData?.data || [];
  const jobs = jobsData?.data?.data || jobsData?.data || [];
  const students = studentsData?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await createMutation.mutateAsync({
        studentId: form.studentId,
        companyId: form.companyId,
        jobId: form.jobId || undefined,
        package: form.package || undefined,
        joiningDate: form.joiningDate || undefined,
        status: form.status,
        notes: form.notes || undefined,
      });
      setShowModal(false);
      setForm({
        studentId: "",
        companyId: "",
        jobId: "",
        package: "",
        joiningDate: "",
        status: "OFFERED",
        notes: "",
      });
      refetch();
    } catch {
      setFormError("Failed to confirm placement.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Placements</h2>
          <p className="text-sm text-text-secondary">Confirmed student placements and offers.</p>
        </div>
        <Button className="bg-[#1769AA] text-white" onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Confirm Placement
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-red-600">
                    <AlertCircle className="w-5 h-5 inline mr-2" />
                    Failed to load.
                    <Button variant="link" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : !Array.isArray(placements) || placements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-text-secondary">
                    <Trophy className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No placements recorded.
                  </TableCell>
                </TableRow>
              ) : (
                placements.map(
                  (p: {
                    id: string;
                    student?: { user?: { name?: string } };
                    company?: { name: string };
                    role?: string;
                    package?: string;
                    packageAmount?: number;
                    status: string;
                  }) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.student?.user?.name || "Student"}</TableCell>
                      <TableCell>{p.company?.name || "—"}</TableCell>
                      <TableCell>{p.role || "—"}</TableCell>
                      <TableCell>
                        {p.package ||
                          (p.packageAmount ? `₹${p.packageAmount.toLocaleString("en-IN")}` : "—")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">{p.status}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Placement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Student *</Label>
              <select
                required
                value={form.studentId}
                onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.user?.name || s.studentCode} ({s.studentCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Company *</Label>
              <select
                required
                value={form.companyId}
                onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select company</option>
                {Array.isArray(companies) &&
                  companies.map((c: { id: string; name: string }) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Job (optional)</Label>
              <select
                value={form.jobId}
                onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select job</option>
                {Array.isArray(jobs) &&
                  jobs.map((j: { id: string; title: string }) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Package</Label>
                <Input
                  placeholder="e.g. 4.5 LPA"
                  value={form.package}
                  onChange={(e) => setForm((f) => ({ ...f, package: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Joining Date</Label>
                <Input
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="OFFERED">Offered</option>
                <option value="JOINED">Joined</option>
                <option value="DECLINED">Declined</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#1769AA] text-white"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Placement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
