import React, { useState } from "react";
import { FileText, Loader2, AlertCircle, Plus } from "lucide-react";
import {
  usePlacementApplications,
  useCreatePlacementApplication,
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

export const Applications: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ jobId: "", studentId: "", notes: "" });

  const { data, isLoading, isError, refetch } = usePlacementApplications({ limit: 50 });
  const { data: jobsData } = usePlacementJobs({ limit: 100 });
  const { data: studentsData } = useStudentList({ limit: 100 });
  const createMutation = useCreatePlacementApplication();

  const applications = data?.data?.data || data?.data || [];
  const jobs = jobsData?.data?.data || jobsData?.data || [];
  const students = studentsData?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await createMutation.mutateAsync({
        jobId: form.jobId,
        studentId: form.studentId,
        notes: form.notes || undefined,
      });
      setShowModal(false);
      setForm({ jobId: "", studentId: "", notes: "" });
      refetch();
    } catch {
      setFormError("Failed to create application.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Job Applications</h2>
          <p className="text-sm text-text-secondary">Student job applications and status.</p>
        </div>
        <Button className="bg-[#1769AA] text-white" onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Application
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied</TableHead>
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
              ) : !Array.isArray(applications) || applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-text-secondary">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No applications.
                  </TableCell>
                </TableRow>
              ) : (
                applications.map(
                  (a: {
                    id: string;
                    student?: { user?: { name?: string } };
                    job?: { title: string; company?: { name: string } };
                    status: string;
                    createdAt: string;
                  }) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.student?.user?.name || "Student"}</TableCell>
                      <TableCell>{a.job?.title || "—"}</TableCell>
                      <TableCell>{a.job?.company?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(a.createdAt).toLocaleDateString("en-IN")}</TableCell>
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
            <DialogTitle>Create Application</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Job *</Label>
              <select
                required
                value={form.jobId}
                onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select job</option>
                {Array.isArray(jobs) &&
                  jobs.map((j: { id: string; title: string; company?: { name: string } }) => (
                    <option key={j.id} value={j.id}>
                      {j.title} — {j.company?.name || "Company"}
                    </option>
                  ))}
              </select>
            </div>
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
                Submit Application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
