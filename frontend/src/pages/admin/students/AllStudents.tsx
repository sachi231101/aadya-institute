import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  GraduationCap 
} from "lucide-react";
import { useStudentStore } from "../../../store/student.store";
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
  const { students } = useStudentStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "ON_LEAVE":
        return "warning";
      case "COMPLETED":
        return "default";
      case "DISCONTINUED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace("_", " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Check if current user has student permissions (mock check)
  const isSuperAdmin = user?.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">All Students</h2>
          <p className="text-sm text-text-secondary">
            Manage all students across the institute.
          </p>
        </div>
        <Button 
          className="bg-accent-primary hover:bg-accent-secondary text-white"
          onClick={() => navigate("/admin/students/add")}
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
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
              <Input
                type="text"
                placeholder="Search by name, code or email..."
                className="pl-9 bg-bg-secondary border-border/50 focus-visible:ring-accent-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredStudents.length > 0 ? (
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
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className="border-border/50 hover:bg-bg-secondary/50 transition-colors">
                      <TableCell className="font-medium text-text-primary">
                        {student.studentCode}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-text-primary">{student.name}</span>
                          <span className="text-xs text-text-muted">{student.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm text-text-secondary">{student.email || "N/A"}</span>
                          <span className="text-xs text-text-muted">{student.phone || "N/A"}</span>
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
                            <DropdownMenuItem onClick={() => navigate(`/admin/students/${student.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/students/${student.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Student
                            </DropdownMenuItem>
                            {isSuperAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
                  onClick={() => navigate("/admin/students/add")}
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
