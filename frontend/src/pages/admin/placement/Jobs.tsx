import React, { useState } from "react";
import { Briefcase, Search, Loader2, AlertCircle, Plus } from "lucide-react";
import {
  usePlacementJobs,
  useCreatePlacementJob,
  usePlacementCompanies,
} from "@/hooks/usePlacement";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

export const Jobs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    companyId: "",
    title: "",
    description: "",
    location: "",
    salaryRange: "",
    openings: "1",
  });

  const { data, isLoading, isError, refetch } = usePlacementJobs({
    search: searchTerm || undefined,
  });
  const { data: companiesData } = usePlacementCompanies({ limit: 100 });
  const createMutation = useCreatePlacementJob();

  const jobs = data?.data?.data || data?.data || [];
  const companies = companiesData?.data?.data || companiesData?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await createMutation.mutateAsync({
        companyId: form.companyId,
        title: form.title,
        description: form.description || undefined,
        location: form.location || undefined,
        salaryRange: form.salaryRange || undefined,
        openings: Number(form.openings) || 1,
      });
      setShowModal(false);
      setForm({ companyId: "", title: "", description: "", location: "", salaryRange: "", openings: "1" });
      refetch();
    } catch {
      setFormError("Failed to create job. Please check all required fields.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Job Openings</h2>
          <p className="text-sm text-text-secondary">Active placement job postings.</p>
        </div>
        <Button className="bg-[#1769AA] text-white" onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Job
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Openings</TableHead>
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
              ) : !Array.isArray(jobs) || jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-text-secondary">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No jobs found.
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map(
                  (j: {
                    id: string;
                    title: string;
                    company?: { name: string };
                    location?: string;
                    openings?: number;
                    packageAmount?: number;
                    salaryRange?: string;
                    status?: string;
                  }) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium">{j.title}</TableCell>
                      <TableCell>{j.company?.name || "—"}</TableCell>
                      <TableCell>{j.location || "—"}</TableCell>
                      <TableCell>{j.openings ?? 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{j.status || "ACTIVE"}</Badge>
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
            <DialogTitle>Create Job Opening</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
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
              <Label>Job Title *</Label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Salary Range</Label>
                <Input
                  placeholder="e.g. 3-5 LPA"
                  value={form.salaryRange}
                  onChange={(e) => setForm((f) => ({ ...f, salaryRange: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Openings</Label>
              <Input
                type="number"
                min={1}
                value={form.openings}
                onChange={(e) => setForm((f) => ({ ...f, openings: e.target.value }))}
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
                Create Job
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
