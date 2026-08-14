import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStudent } from "../../../hooks/useStudents";
import { ArrowLeft, GraduationCap, Mail, Phone, Calendar, BookOpen, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const StudentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = window.location;
  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : location.pathname.startsWith("/faculty")
    ? "/faculty"
    : "/admin";

  const { data: response, isLoading, isError } = useStudent(id);

  const student = response?.data;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE": return "success";
      case "ON_LEAVE": return "warning";
      case "COMPLETED": return "default";
      case "DISCONTINUED": case "CANCELLED": return "destructive";
      default: return "secondary";
    }
  };

  const formatStatus = (status: string) =>
    status.replace("_", " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
        <span className="ml-3 text-text-secondary">Loading student...</span>
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4 opacity-60" />
        <h3 className="text-lg font-medium text-text-primary mb-2">Student not found</h3>
        <Button variant="outline" onClick={() => navigate(`${basePath}/students/all`)}>Back to Students</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`${basePath}/students/all`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">{student.user?.name || student.studentCode}</h2>
          <p className="text-sm text-text-secondary">Student Code: {student.studentCode}</p>
        </div>
        <div className="ml-auto">
          {/* @ts-ignore */}
          <Badge variant={getStatusBadgeVariant(student.status)} className="capitalize font-medium text-sm px-3 py-1">
            {formatStatus(student.status)}
          </Badge>
        </div>
      </div>

      {/* Personal Info */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-accent-primary" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Email</p>
                <p className="text-sm font-medium text-text-primary">{student.user?.email || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Phone</p>
                <p className="text-sm font-medium text-text-primary">{student.user?.phone || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <BookOpen className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Qualification</p>
                <p className="text-sm font-medium text-text-primary">{student.qualification || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Date of Birth</p>
                <p className="text-sm font-medium text-text-primary">
                  {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "Not provided"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GraduationCap className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Branch</p>
                <p className="text-sm font-medium text-text-primary">{student.branch?.name || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Enrolled On</p>
                <p className="text-sm font-medium text-text-primary">{new Date(student.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Enrollments */}
      {student.batchEnrollments && student.batchEnrollments.length > 0 && (
        <Card className="border-border/50 shadow-sm bg-bg-primary">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent-primary" />
              Active Batch Enrollments
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {student.batchEnrollments.map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between p-4 rounded-lg bg-bg-secondary/50 border border-border/30">
                  <div>
                    <p className="font-medium text-text-primary">{enrollment.batch.name}</p>
                    <p className="text-sm text-text-secondary">
                      {enrollment.batch.course.name} ({enrollment.batch.course.code})
                    </p>
                  </div>
                  <Badge variant="default" className="capitalize">{enrollment.batch.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/admin/students/all")}>Back</Button>
        <Button
          className="bg-accent-primary hover:bg-accent-secondary text-white"
          onClick={() => navigate(`/admin/students/${id}/edit`)}
        >
          Edit Student
        </Button>
      </div>
    </div>
  );
};
