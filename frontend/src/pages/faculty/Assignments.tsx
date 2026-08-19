import React, { useState } from "react";
import { FileText, Plus, Clock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAssignments, useCreateAssignment } from "@/hooks/useAssignments";
import { useAuthStore } from "@/store/auth.store";

export const FacultyAssignments: React.FC = () => {
  const { user } = useAuthStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: assignmentsResponse, isLoading } = useAssignments({});
  const createMutation = useCreateAssignment();
  const assignments = assignmentsResponse?.data || [];

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate(
      {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        classSessionId: formData.get("classSessionId") as string,
        batchId: formData.get("batchId") as string,
        facultyId: (user as any)?.facultyId || user?.id || "",
        dueDate: formData.get("dueDate") as string || undefined,
      },
      { onSuccess: () => setShowCreateDialog(false) }
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FileText className="h-6 w-6 text-amber-600" />
            My Assignments
          </h1>
          <p className="text-sm text-text-secondary mt-1">Create, assign, and evaluate student assignments</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-semibold">
          <Plus size={16} /> Create Assignment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <FileText className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{assignments.length}</p>
              <p className="text-xs text-text-secondary font-medium">Total Assignments</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {assignments.filter((a: any) => a.status === "ACTIVE").length}
              </p>
              <p className="text-xs text-text-secondary font-medium">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {assignments.reduce((acc: number, a: any) => acc + (a._count?.submissions || 0), 0)}
              </p>
              <p className="text-xs text-text-secondary font-medium">Total Submissions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments Table */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Title</TableHead>
                <TableHead className="font-semibold">Class Session</TableHead>
                <TableHead className="font-semibold">Due Date</TableHead>
                <TableHead className="font-semibold">Submissions</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-text-secondary">Loading...</TableCell>
                </TableRow>
              ) : assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-text-secondary font-medium">No assignments created yet</p>
                    <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)} className="mt-3 gap-1">
                      <Plus size={14} /> Create First Assignment
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment: any) => (
                  <TableRow key={assignment.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-medium text-sm">{assignment.title}</TableCell>
                    <TableCell className="text-sm">
                      {assignment.classSession?.title || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {assignment.dueDate
                        ? new Date(assignment.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "No deadline"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {assignment._count?.submissions || 0} submitted
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs border ${
                        assignment.status === "ACTIVE"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>
                        {assignment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Assignment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input name="title" placeholder="e.g. React Component Exercise" required className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                name="description"
                placeholder="Assignment description..."
                className="w-full mt-1 h-20 px-3 py-2 rounded-md border border-border text-sm bg-background resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Class Session ID</Label>
                <Input name="classSessionId" placeholder="Session ID" className="mt-1" />
              </div>
              <div>
                <Label>Batch ID</Label>
                <Input name="batchId" placeholder="Batch ID" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input name="dueDate" type="datetime-local" className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
