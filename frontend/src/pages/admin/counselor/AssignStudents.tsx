import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  GraduationCap, 
  Search, 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  Check, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { batchesApi } from "../../../services/batches.api";
import { studentsApi } from "../../../services/students.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const AssignStudents: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionError, setActionError] = useState("");

  // 1. Fetch batches
  const { data: batchesRes, isLoading: loadingBatches } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.getAll(),
  });

  const batches = batchesRes?.data || [];

  // Set default selected batch when batches load
  useEffect(() => {
    if (batches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  // 2. Fetch students
  const { data: studentsRes, isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.getAll({ limit: 100 }),
  });

  const students = studentsRes?.data || [];

  // 3. Fetch batch enrolled students for currently selected batch
  const { data: batchStudentsRes, isLoading: loadingEnrolled } = useQuery({
    queryKey: ["batchStudents", selectedBatchId],
    queryFn: () => batchesApi.getStudents(selectedBatchId),
    enabled: Boolean(selectedBatchId),
  });

  const enrolledStudentRecords = batchStudentsRes?.data || [];
  const enrolledStudentIds = enrolledStudentRecords.map((e) => e.studentId);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  // Enroll Mutation
  const enrollMutation = useMutation({
    mutationFn: (studentId: string) => batchesApi.enrollStudent(selectedBatchId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batchStudents", selectedBatchId] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setActionError("");
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || "Failed to enroll student.");
    },
  });

  // Remove Enrollment Mutation
  const removeMutation = useMutation({
    mutationFn: (studentId: string) => batchesApi.removeStudent(selectedBatchId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batchStudents", selectedBatchId] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setActionError("");
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || "Failed to remove student from batch.");
    },
  });

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    const studentName = s.user?.name || "";
    const studentEmail = s.user?.email || "";
    const studentPhone = s.user?.phone || "";

    return (
      studentName.toLowerCase().includes(term) ||
      s.studentCode.toLowerCase().includes(term) ||
      studentEmail.toLowerCase().includes(term) ||
      studentPhone.toLowerCase().includes(term) ||
      (s.qualification && s.qualification.toLowerCase().includes(term))
    );
  });

  const toggleStudentEnrollment = (studentId: string) => {
    if (!selectedBatchId) return;
    if (enrolledStudentIds.includes(studentId)) {
      removeMutation.mutate(studentId);
    } else {
      enrollMutation.mutate(studentId);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-[#1769AA]" />
          Assign Students to Batches
        </h1>
        <p className="text-muted-foreground mt-1">
          Select a batch and map registered students (collected live from Student Store) into the batch schedule.
        </p>
      </div>

      {actionError && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          {actionError}
        </div>
      )}

      {/* Target Batch Selection Card */}
      <Card className="border border-border/60 shadow-sm bg-bg-secondary/40">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="w-full md:w-1/2 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Target Batch Selection
            </label>
            {loadingBatches ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#1769AA]" /> Loading batches...
              </div>
            ) : (
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full px-4 py-2.5 text-base rounded-lg border border-border bg-bg-primary font-semibold text-text-primary"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}) — {b.course?.name || "Course"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedBatch && (
            <div className="flex items-center gap-6 p-4 bg-bg-primary rounded-xl border border-border/60">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Assigned Faculty</span>
                <span className="text-sm font-semibold text-text-primary">
                  {selectedBatch.faculty?.user?.name || "Unassigned"}
                </span>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Enrolled Status</span>
                <span className="text-sm font-bold text-[#1769AA]">
                  {enrolledStudentIds.length} Students Enrolled
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student List & Assignment Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border/40">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            Registered Students ({students.length} Total)
          </CardTitle>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student code, name, qualification..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-bg-secondary">
              <TableRow>
                <TableHead>Student Code & Name</TableHead>
                <TableHead>Email & Phone</TableHead>
                <TableHead>Qualification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Assignment</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingStudents || loadingEnrolled ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1769AA] mb-2" />
                    Fetching students...
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No student records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => {
                  const isEnrolled = enrolledStudentIds.includes(student.id);
                  const name = student.user?.name || "Student";
                  const email = student.user?.email || "—";
                  const phone = student.user?.phone || "—";

                  return (
                    <TableRow key={student.id} className={isEnrolled ? "bg-[#1769AA]/5" : ""}>
                      <TableCell>
                        <div className="font-semibold text-text-primary">{name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{student.studentCode}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{email}</div>
                        <div className="text-muted-foreground">{phone}</div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{student.qualification || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={student.status === "ACTIVE" ? "default" : "outline"}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {isEnrolled ? (
                          <Badge className="bg-green-600/10 text-green-700 border-green-200 gap-1">
                            <Check className="h-3 w-3" /> Enrolled in Batch
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not Enrolled</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={isEnrolled ? "destructive" : "default"}
                          disabled={enrollMutation.isPending || removeMutation.isPending}
                          onClick={() => toggleStudentEnrollment(student.id)}
                          className={isEnrolled ? "text-xs gap-1" : "bg-[#1769AA] hover:bg-[#F39A16] text-white text-xs gap-1"}
                        >
                          {isEnrolled ? (
                            <>
                              <UserMinus className="h-3.5 w-3.5" /> Remove
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5" /> Assign to Batch
                            </>
                          )}
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
    </div>
  );
};
