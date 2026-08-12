import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Eye, 
  Trash2, 
  Users, 
  CheckCircle2, 
  Clock, 
  BookOpen,
  Filter,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useFacultyList, useDeleteFaculty } from "../../../hooks/useFaculty";
import { useAuthStore } from "../../../store/auth.store";
import { UserRole } from "../../../constants/roles";
import type { FacultyStatus } from "../../../types/faculty.types";

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

export const AllFaculty: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const deleteMutation = useDeleteFaculty();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  const queryParams = {
    page,
    limit: 20,
    search: searchTerm || undefined,
    status: statusFilter !== "ALL" ? (statusFilter as FacultyStatus) : undefined,
  };

  const { data: response, isLoading, isError } = useFacultyList(queryParams);

  const facultyList = response?.data ?? [];
  const meta = response?.meta;

  const activeCount = facultyList.filter((f) => f.status === "ACTIVE").length;
  const leaveCount = facultyList.filter((f) => f.status === "ON_LEAVE").length;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "ON_LEAVE":
        return "warning";
      case "INACTIVE":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace("_", " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const isSuperAdmin = user?.role === UserRole.ADMIN;

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to deactivate this faculty member?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Faculty Directory</h2>
          <p className="text-sm text-text-secondary">
            Manage academy professors, instructors, and technical mentors.
          </p>
        </div>
        <Button 
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white transition-colors"
          onClick={() => navigate("/admin/faculty/add")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Faculty
        </Button>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Faculty</p>
              <h3 className="text-2xl font-bold text-text-primary">{meta?.total ?? facultyList.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Active Professors</p>
              <h3 className="text-2xl font-bold text-text-primary">{activeCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">On Leave</p>
              <h3 className="text-2xl font-bold text-text-primary">{leaveCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Showing on Page</p>
              <h3 className="text-2xl font-bold text-text-primary">{facultyList.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Faculty Table Card */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
              <Users className="h-5 w-5 text-[#1769AA]" />
              Faculty Members ({meta?.total ?? facultyList.length})
            </CardTitle>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
                <Input
                  type="text"
                  placeholder="Search faculty..."
                  className="pl-9 bg-bg-secondary border-border/50 focus-visible:ring-[#1769AA]"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-text-muted hidden sm:block" />
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA] w-full sm:w-auto"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#1769AA]" />
              <span className="ml-3 text-text-secondary">Loading faculty...</span>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Failed to load faculty</h3>
              <p className="text-text-secondary max-w-sm mx-auto mb-6">
                Could not fetch faculty data. Please check your connection and try again.
              </p>
            </div>
          ) : facultyList.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-bg-secondary/50">
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold text-text-secondary">Code</TableHead>
                      <TableHead className="font-semibold text-text-secondary">Faculty Name</TableHead>
                      <TableHead className="font-semibold text-text-secondary">Contact Info</TableHead>
                      <TableHead className="font-semibold text-text-secondary">Specialization</TableHead>
                      <TableHead className="font-semibold text-text-secondary">Branch</TableHead>
                      <TableHead className="font-semibold text-text-secondary">Status</TableHead>
                      <TableHead className="text-right font-semibold text-text-secondary">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facultyList.map((faculty) => (
                      <TableRow 
                        key={faculty.id} 
                        className="border-border/50 hover:bg-bg-secondary/50 transition-colors"
                      >
                        <TableCell className="font-mono text-xs text-[#1769AA] font-semibold">
                          {faculty.employeeCode}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-text-primary">{faculty.user.name}</span>
                            <span className="text-xs text-text-muted">{faculty.specialization || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span className="text-text-secondary">{faculty.user.email || "—"}</span>
                            <span className="text-xs text-text-muted">{faculty.user.phone || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm max-w-xs truncate">
                          {faculty.specialization || "—"}
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {faculty.branch?.name || "—"}
                        </TableCell>
                        <TableCell>
                          {/* @ts-ignore Badge variant map */}
                          <Badge variant={getStatusBadgeVariant(faculty.status)} className="capitalize font-medium">
                            {formatStatus(faculty.status)}
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
                              <DropdownMenuLabel>Faculty Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => navigate(`/admin/faculty/${faculty.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/faculty/courses?facultyId=${faculty.id}`)}>
                                <BookOpen className="mr-2 h-4 w-4" />
                                Assigned Courses
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/faculty/attendance?facultyId=${faculty.id}`)}>
                                <Clock className="mr-2 h-4 w-4" />
                                View Attendance
                              </DropdownMenuItem>
                              {isSuperAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    onClick={() => handleDelete(faculty.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Faculty
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
                  <p className="text-sm text-text-secondary">
                    Page {meta.page} of {meta.totalPages} ({meta.total} total)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-text-muted mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No faculty members found</h3>
              <p className="text-text-secondary max-w-sm mx-auto mb-6">
                {searchTerm || statusFilter !== "ALL"
                  ? "No faculty match your active search or filters. Try adjusting your parameters."
                  : "There are currently no faculty members registered in the system."}
              </p>
              {searchTerm || statusFilter !== "ALL" ? (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                    setPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button 
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
                  onClick={() => navigate("/admin/faculty/add")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Faculty
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
