import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, GraduationCap, Loader2, AlertCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFacultyMyStudents } from "@/hooks/useFaculty";

export const FacultyMyStudents: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useFacultyMyStudents({
    page,
    limit: 20,
    search: search.trim() || undefined,
  });

  const students = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-[#1769AA]" />
          My Students
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Students enrolled in batches assigned to you.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name, code, email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Users className="w-4 h-4" />
            {meta?.total ?? students.length} students
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#1769AA]" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 space-y-3">
              <AlertCircle className="mx-auto h-10 w-10 text-rose-500 opacity-70" />
              <p className="text-sm text-muted-foreground">Failed to load students.</p>
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No students in your assigned batches yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500">
                    <th className="py-3 pr-4">Student</th>
                    <th className="py-3 pr-4">Code</th>
                    <th className="py-3 pr-4">Contact</th>
                    <th className="py-3 pr-4">Batches</th>
                    <th className="py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <td className="py-3 pr-4 font-semibold">{s.user?.name || "—"}</td>
                      <td className="py-3 pr-4 font-mono text-xs">{s.studentCode}</td>
                      <td className="py-3 pr-4 text-slate-600">
                        <div>{s.user?.email || "—"}</div>
                        <div className="text-xs">{s.user?.phone || ""}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {s.batches.map((b) => (
                            <Badge key={b.id} variant="outline" className="text-[10px] font-medium">
                              {b.code}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge
                          className={
                            s.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }
                        >
                          {s.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-xs text-slate-500">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
