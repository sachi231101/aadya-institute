import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, Trash2, AlertCircle } from "lucide-react";
import { batchesApi } from "@/services/batches.api";
import { studentsApi } from "@/services/students.api";
import type { Student } from "@/types/student.types";
import { Card, CardContent } from "@/components/ui/card";
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

interface Props {
  batchId: string;
}

export const StudentAllocation: React.FC<Props> = ({ batchId }) => {
  const queryClient = useQueryClient();
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: enrolledData, isLoading } = useQuery({
    queryKey: ["batches", batchId, "students"],
    queryFn: () => batchesApi.getStudents(batchId),
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students", studentSearch],
    queryFn: () => studentsApi.getAll({ search: studentSearch, limit: 20 }),
    enabled: studentSearch.length >= 2,
  });

  const enrolled = enrolledData?.data || [];
  const candidates = Array.isArray(studentsData?.data) ? studentsData.data : [];

  const handleEnroll = async () => {
    if (!selectedStudentId) return;
    setLoading(true);
    setError(null);
    try {
      await batchesApi.enrollStudent(batchId, selectedStudentId);
      setSelectedStudentId("");
      setStudentSearch("");
      queryClient.invalidateQueries({ queryKey: ["batches", batchId] });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to enroll student");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (studentId: string) => {
    if (!window.confirm("Remove this student from the batch?")) return;
    try {
      await batchesApi.removeStudent(batchId, studentId);
      queryClient.invalidateQueries({ queryKey: ["batches", batchId] });
    } catch {
      alert("Failed to remove student");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <h3 className="font-semibold">Enroll Student</h3>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search students by name or code..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="flex-1"
            />
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="h-10 px-3 border rounded-md text-sm min-w-[200px]"
            >
              <option value="">Select student</option>
              {Array.isArray(candidates) && candidates.map((s: Student) => (
                <option key={s.id} value={s.id}>{s.user?.name || s.studentCode}</option>
              ))}
            </select>
            <Button onClick={handleEnroll} disabled={!selectedStudentId || loading} className="bg-[#1769AA] text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" /> Enroll</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin inline" /></TableCell></TableRow>
              ) : enrolled.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-text-secondary">No students enrolled yet.</TableCell></TableRow>
              ) : (
                enrolled.map((e: { id: string; studentId: string; student?: { studentCode?: string; user?: { name?: string; email?: string } } }) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">{e.student?.studentCode}</TableCell>
                    <TableCell>{e.student?.user?.name}</TableCell>
                    <TableCell>{e.student?.user?.email || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(e.studentId)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAllocation;
