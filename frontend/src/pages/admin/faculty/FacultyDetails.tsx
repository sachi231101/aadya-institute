import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Award, 
  BookOpen, 
  Clock, 
  UserCheck, 
  MapPin
} from "lucide-react";
import { useFacultyStore } from "../../../store/faculty.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const FacultyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { facultyList, assignments, attendanceRecords } = useFacultyStore();

  const [activeTab, setActiveTab] = useState<"overview" | "courses" | "attendance">("overview");

  const faculty = facultyList.find((f) => f.id === id) || facultyList[0];

  if (!faculty) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">Faculty Member Not Found</h2>
        <Button className="mt-4" onClick={() => navigate("/admin/faculty/all")}>
          Return to Directory
        </Button>
      </div>
    );
  }

  const facultyAssignments = assignments.filter((a) => a.facultyId === faculty.id);
  const facultyAttendance = attendanceRecords.filter((a) => a.facultyId === faculty.id);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "ON_LEAVE":
        return "warning";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Back Button */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => navigate("/admin/faculty/all")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">{faculty.name}</h2>
          <p className="text-sm text-text-secondary">
            {faculty.designation} • <span className="font-mono">{faculty.facultyCode}</span>
          </p>
        </div>
      </div>

      {/* Main Profile Banner Card */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#1769AA]/10 text-[#1769AA] flex items-center justify-center font-bold text-2xl border border-[#1769AA]/20">
                {faculty.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-text-primary">{faculty.name}</h3>
                  {/* @ts-ignore Badge variant map */}
                  <Badge variant={getStatusBadgeVariant(faculty.status)} className="capitalize">
                    {faculty.status.toLowerCase().replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary mt-1">{faculty.specialization}</p>
                
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-text-secondary" /> {faculty.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-text-secondary" /> {faculty.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-text-secondary" /> Main Campus — Bengaluru
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button 
                variant="outline"
                onClick={() => navigate("/admin/faculty/courses")}
                className="w-full md:w-auto"
              >
                <BookOpen className="mr-2 h-4 w-4 text-[#1769AA]" />
                Assign Course
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "overview"
              ? "bg-[#1769AA] text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
          }`}
        >
          Overview
        </button>

        <button
          onClick={() => setActiveTab("courses")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "courses"
              ? "bg-[#1769AA] text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
          }`}
        >
          Assigned Courses ({facultyAssignments.length})
        </button>

        <button
          onClick={() => setActiveTab("attendance")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "attendance"
              ? "bg-[#1769AA] text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
          }`}
        >
          Attendance Record ({facultyAttendance.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border/50 bg-bg-primary shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-[#1769AA]" /> Academic Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-text-secondary">Faculty ID</span>
                <span className="font-mono font-semibold text-text-primary">{faculty.facultyCode}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-text-secondary">Designation</span>
                <span className="font-medium text-text-primary">{faculty.designation}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-text-secondary">Primary Specialization</span>
                <span className="font-medium text-text-primary text-right max-w-xs">{faculty.specialization}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-text-secondary">Joining Date</span>
                <span className="font-medium text-text-primary">{faculty.joiningDate}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-bg-primary shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#1769AA]" /> Teaching Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                <div>
                  <p className="text-xs text-text-secondary">Active Courses Taught</p>
                  <p className="text-xl font-bold text-[#1769AA]">{facultyAssignments.length} Courses</p>
                </div>
                <BookOpen className="h-8 w-8 text-[#1769AA]/40" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                <div>
                  <p className="text-xs text-text-secondary">Total Weekly Teaching Hours</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {facultyAssignments.reduce((sum, a) => sum + a.weeklyHours, 0)} Hours / Week
                  </p>
                </div>
                <Clock className="h-8 w-8 text-emerald-600/40" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "courses" && (
        <div className="space-y-4">
          {facultyAssignments.length > 0 ? (
            facultyAssignments.map((assignment) => (
              <Card key={assignment.id} className="border-border/50 bg-bg-primary shadow-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-text-primary flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[#1769AA]" /> {assignment.courseName}
                    </h4>
                    <p className="text-xs text-text-secondary mt-1">
                      Batch: <span className="font-mono text-text-primary">{assignment.batchCode}</span> • Schedule: {assignment.schedule}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-[#1769AA] border-blue-200">
                    {assignment.weeklyHours} hrs/wk • {assignment.studentCount} Students
                  </Badge>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-border/50 bg-bg-primary text-center py-8">
              <p className="text-text-secondary">No courses currently assigned to {faculty.name}.</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === "attendance" && (
        <Card className="border-border/50 bg-bg-primary shadow-sm">
          <CardContent className="p-0">
            {facultyAttendance.length > 0 ? (
              <div className="divide-y divide-border/50">
                {facultyAttendance.map((record) => (
                  <div key={record.id} className="p-4 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium text-text-primary">{record.date}</p>
                      <p className="text-xs text-text-muted">{record.notes || "Regular day"}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {record.checkIn && (
                        <span className="text-xs text-text-secondary">
                          {record.checkIn} - {record.checkOut}
                        </span>
                      )}
                      <Badge variant={record.status === "PRESENT" ? "success" : "warning"}>
                        {record.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-text-secondary">
                No attendance records logged for {faculty.name} yet.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
