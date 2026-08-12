import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Search, 
  CheckCircle2, 
  UserCheck, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { batchesApi } from "../../../services/batches.api";
import { facultyApi } from "../../../services/faculty.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const AssignFaculty: React.FC = () => {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [targetFacultyId, setTargetFacultyId] = useState<string>("");
  const [actionError, setActionError] = useState("");

  // Queries
  const { data: batchesRes, isLoading: loadingBatches } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.getAll(),
  });

  const { data: facultyRes, isLoading: loadingFaculty } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => facultyApi.getAll({ limit: 100 }),
  });

  const batches = batchesRes?.data || [];
  const facultyList = facultyRes?.data || [];

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  // Faculty Assignment Mutation
  const assignFacultyMutation = useMutation({
    mutationFn: ({ batchId, facultyId }: { batchId: string; facultyId: string }) =>
      batchesApi.assignFaculty(batchId, facultyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setSelectedBatchId(null);
      setActionError("");
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || "Failed to assign faculty to batch.");
    },
  });

  const filteredBatches = batches.filter((b) => {
    const term = searchTerm.toLowerCase();
    const facultyName = b.faculty?.user?.name || "";
    const courseName = b.course?.name || "";

    return (
      b.name.toLowerCase().includes(term) ||
      b.code.toLowerCase().includes(term) ||
      courseName.toLowerCase().includes(term) ||
      facultyName.toLowerCase().includes(term)
    );
  });

  const handleOpenAssignModal = (batchId: string, currentFacultyId?: string | null) => {
    setSelectedBatchId(batchId);
    setTargetFacultyId(currentFacultyId || (facultyList[0]?.id || ""));
    setActionError("");
  };

  const handleSaveFacultyAssignment = () => {
    if (!selectedBatchId || !targetFacultyId) return;
    assignFacultyMutation.mutate({ batchId: selectedBatchId, facultyId: targetFacultyId });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-[#1769AA]" />
            Assign Faculty to Batches
          </h1>
          <p className="text-muted-foreground mt-1">
            Allocate qualified faculty instructors (collected live from Faculty Store) to lead specific training batches.
          </p>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          {actionError}
        </div>
      )}

      {/* Filter / Search */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search batch, course, or faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Batches & Faculty Assignment Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-bg-secondary">
              <TableRow>
                <TableHead>Batch Name & Code</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Current Assigned Faculty</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingBatches ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1769AA] mb-2" />
                    Fetching batches...
                  </TableCell>
                </TableRow>
              ) : filteredBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No batch records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBatches.map((batch) => {
                  const facultyName = batch.faculty?.user?.name;
                  const courseName = batch.course?.name || "General Course";

                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="font-semibold text-text-primary">{batch.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{batch.code}</div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{courseName}</TableCell>
                      <TableCell>
                        {facultyName ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#1769AA]">{facultyName}</span>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={batch.status === "ACTIVE" ? "default" : "outline"}>
                          {batch.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenAssignModal(batch.id, batch.facultyId)}
                          className="bg-[#1769AA] hover:bg-[#F39A16] text-white text-xs gap-1"
                        >
                          <Users className="h-3.5 w-3.5" /> Reassign / Assign Faculty
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Faculty Dialog Modal */}
      <Dialog open={!!selectedBatchId} onOpenChange={(open) => !open && setSelectedBatchId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Faculty Member</DialogTitle>
            <DialogDescription>
              Select a faculty member from the system records for <span className="font-semibold text-text-primary">{selectedBatch?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-2">
                Available Faculty (Collected from Faculty Store)
              </label>
              {loadingFaculty ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#1769AA]" /> Loading faculty list...
                </div>
              ) : (
                <select
                  value={targetFacultyId}
                  onChange={(e) => setTargetFacultyId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-primary font-medium"
                >
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.user?.name || f.employeeCode} — {f.specialization || "Faculty Member"}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBatchId(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveFacultyAssignment} 
              disabled={assignFacultyMutation.isPending || !targetFacultyId}
              className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
            >
              {assignFacultyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
