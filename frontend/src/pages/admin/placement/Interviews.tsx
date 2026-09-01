import React, { useState } from "react";
import { Calendar, Loader2, AlertCircle, Plus } from "lucide-react";
import {
  usePlacementInterviews,
  useCreatePlacementInterview,
  usePlacementApplications,
} from "@/hooks/usePlacement";
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

export const Interviews: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    applicationId: "",
    scheduledAt: "",
    mode: "ONLINE",
    location: "",
    interviewer: "",
  });

  const { data, isLoading, isError, refetch } = usePlacementInterviews({ limit: 50 });
  const { data: applicationsData } = usePlacementApplications({ limit: 100 });
  const createMutation = useCreatePlacementInterview();

  const interviews = data?.data?.data || data?.data || [];
  const applications = applicationsData?.data?.data || applicationsData?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await createMutation.mutateAsync({
        applicationId: form.applicationId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        mode: form.mode || undefined,
        location: form.location || undefined,
        interviewer: form.interviewer || undefined,
      });
      setShowModal(false);
      setForm({ applicationId: "", scheduledAt: "", mode: "ONLINE", location: "", interviewer: "" });
      refetch();
    } catch {
      setFormError("Failed to schedule interview.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Interviews</h2>
          <p className="text-sm text-text-secondary">Scheduled and completed placement interviews.</p>
        </div>
        <Button className="bg-[#1769AA] text-white" onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Schedule Interview
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Scheduled At</TableHead>
                <TableHead>Mode</TableHead>
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
              ) : !Array.isArray(interviews) || interviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-text-secondary">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No interviews scheduled.
                  </TableCell>
                </TableRow>
              ) : (
                interviews.map(
                  (i: {
                    id: string;
                    student?: { user?: { name?: string } };
                    company?: { name: string };
                    scheduledAt: string;
                    mode?: string;
                    status: string;
                  }) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.student?.user?.name || "Student"}</TableCell>
                      <TableCell>{i.company?.name || "—"}</TableCell>
                      <TableCell>{new Date(i.scheduledAt).toLocaleString("en-IN")}</TableCell>
                      <TableCell>{i.mode || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{i.status}</Badge>
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
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Application *</Label>
              <select
                required
                value={form.applicationId}
                onChange={(e) => setForm((f) => ({ ...f, applicationId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select application</option>
                {Array.isArray(applications) &&
                  applications.map(
                    (a: {
                      id: string;
                      student?: { user?: { name?: string } };
                      job?: { title: string };
                    }) => (
                      <option key={a.id} value={a.id}>
                        {a.student?.user?.name || "Student"} — {a.job?.title || "Job"}
                      </option>
                    )
                  )}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date & Time *</Label>
              <Input
                type="datetime-local"
                required
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mode</Label>
                <select
                  value={form.mode}
                  onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Interviewer</Label>
                <Input
                  value={form.interviewer}
                  onChange={(e) => setForm((f) => ({ ...f, interviewer: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location / Meeting Link</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
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
                Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
