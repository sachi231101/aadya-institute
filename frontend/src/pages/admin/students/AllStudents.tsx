import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  GraduationCap,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useStudentList, useDeleteStudent } from "../../../hooks/useStudents";
import { useAuthStore } from "../../../store/auth.store";
import { UserRole } from "../../../constants/roles";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const AllStudents: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : "/admin";

  const { data: response, isLoading, isError, error } = useStudentList({
    page,
    limit: 20,
    search: searchTerm || undefined,
    status: (statusFilter || undefined) as any,
  });

  const deleteStudentMutation = useDeleteStudent();

  const students = response?.data ?? [];
  const meta = response?.meta;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "ON_LEAVE":
        return "warning";
      case "COMPLETED":
        return "default";
      case "DISCONTINUED":
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace("_", " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const isSuperAdmin = user?.role === UserRole.ADMIN;

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete student "${name}"? This action cannot be undone.`)) {
      deleteStudentMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">All Students</h2>
          <p className="text-sm text-text-secondary">
            Manage all students across the institute.
            {meta && <span className="ml-1">({meta.total} total)</span>}
          </p>
        </div>
        <Button 
          className="bg-accent-primary hover:bg-accent-secondary text-white"
          onClick={() => navigate(`${basePath}/students/add`)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
              <GraduationCap className="h-5 w-5 text-accent-primary" />
              Student Directory
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="flex h-10 w-full sm:w-[160px] items-center rounded-md border border-border/50 bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="COMPLETED">Completed</option>
                <option value="DISCONTINUED">Discontinued</option>
              </select>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
                <Input
                  type="text"
                  placeholder="Search by name, code or email..."
                  className="pl-9 bg-bg-secondary border-border/50 focus-visible:ring-accent-primary"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
              <span className="ml-3 text-text-secondary">Loading students...</span>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4 opacity-60" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Failed to load students</h3>
              <p className="text-text-secondary max-w-sm mx-auto mb-6">
                {(error as any)?.response?.data?.message || "An unexpected error occurred. Please try again."}
              </p>
            </div>
          ) : students.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-bg-secondary/50">
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold text-text-secondary">Student ID</TableHead>
                      <TableHead className="font-semibold text-text-secondary">Name</TableHead>
                      <TableHead className="font-semibold text-text-secondary">Contact</TableHead>
                      <TableHead className="font-semibold text-text-secondary">Qualification</TableHead>
                      <TableHead className="font-semibold text-text-secondary">Status</TableHead>
                      <TableHead className="text-right font-semibold text-text-secondary">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id} className="border-border/50 hover:bg-bg-secondary/50 transition-colors">
                        <TableCell className="font-medium text-text-primary">
                          {student.studentCode}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-text-primary">{student.user?.name || "—"}</span>
                            <span className="text-xs text-text-muted">{student.branch?.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm text-text-secondary">{student.user?.email || "N/A"}</span>
                            <span className="text-xs text-text-muted">{student.user?.phone || "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {student.qualification || "N/A"}
                        </TableCell>
                        <TableCell>
                          {/* @ts-ignore - Status strings matched visually */}
                          <Badge variant={getStatusBadgeVariant(student.status)} className="capitalize font-medium">
                            {formatStatus(student.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-bg-tertiary">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4 text-text-secondary" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-bg-primary border-border/50 shadow-md">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => navigate(`${basePath}/students/${student.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`${basePath}/students/${student.id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Student
                              </DropdownMenuItem>
                              {isSuperAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    onClick={() => handleDelete(student.id, student.user?.name || student.studentCode)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Student
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
                  <p className="text-sm text-text-muted">
                    Showing page {meta.page} of {meta.totalPages} ({meta.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-12 w-12 text-text-muted mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No students found</h3>
              <p className="text-text-secondary max-w-sm mx-auto mb-6">
                {searchTerm 
                  ? `No students match your search for "${searchTerm}". Try a different term.`
                  : "There are currently no students in the system. Add a new student to get started."}
              </p>
              {searchTerm ? (
                <Button variant="outline" onClick={() => setSearchTerm("")}>
                  Clear Search
                </Button>
              ) : (
                <Button 
                  className="bg-accent-primary hover:bg-accent-secondary text-white"
                  onClick={() => navigate(`${basePath}/students/add`)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
