import React, { useState } from "react";
import { 
  FileCheck2, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  CreditCard, 
  MoreVertical, 
  Trash2, 
  ArrowRight,
  UserCheck
} from "lucide-react";
import { useAdmissionStore } from "../../../store/admission.store";
import { useCourseStore } from "../../../store/course.store";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ApplicationStatus, FeeStatus } from "../../../types/admission.types";

export const Applications: React.FC = () => {
  const { applications, addApplication, updateApplication, deleteApplication, convertApplicationToAdmission } = useAdmissionStore();
  const { courses } = useCourseStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [feeFilter, setFeeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State for New Application
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [feeStatus, setFeeStatus] = useState<FeeStatus>("PAID");
  const [status, setStatus] = useState<ApplicationStatus>("SUBMITTED");
  const [notes, setNotes] = useState("");

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.applicationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.phone.includes(searchTerm) ||
      app.courseName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFee = feeFilter === "ALL" || app.feeStatus === feeFilter;
    const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;

    return matchesSearch && matchesFee && matchesStatus;
  });

  const totalApps = applications.length;
  const underReviewCount = applications.filter((a) => a.status === "UNDER_REVIEW" || a.status === "SUBMITTED").length;
  const feePaidCount = applications.filter((a) => a.feeStatus === "PAID").length;
  const approvedCount = applications.filter((a) => a.status === "APPROVED" || a.status === "ADMITTED").length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !courseId) return;

    const selectedCourse = courses.find((c) => c.id === courseId);

    addApplication({
      applicantName: name,
      email: email || `${name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
      phone,
      courseId,
      courseName: selectedCourse?.name || "General Course",
      feeStatus,
      status,
      notes,
    });

    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setShowModal(false);
  };

  const getStatusBadge = (st: ApplicationStatus) => {
    switch (st) {
      case "SUBMITTED":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case "UNDER_REVIEW":
        return <Badge variant="warning">Under Review</Badge>;
      case "APPROVED":
        return <Badge variant="success">Approved</Badge>;
      case "ADMITTED":
        return <Badge variant="secondary" className="bg-[#1769AA]/10 text-[#1769AA]">Admitted</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  const getFeeBadge = (fs: FeeStatus) => {
    return fs === "PAID" ? (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-max">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 w-max">
        <Clock className="w-3 h-3 text-amber-600" /> Pending
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Admission Applications</h2>
          <p className="text-sm text-text-secondary">
            Process candidate admission forms, verify registration fee payments, and issue admission letters.
          </p>
        </div>

        <Button 
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-sm transition-colors"
          onClick={() => setShowModal(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Application
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Applications</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalApps}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Under Review</p>
              <h3 className="text-2xl font-bold text-text-primary">{underReviewCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Registration Fee Paid</p>
              <h3 className="text-2xl font-bold text-text-primary">{feePaidCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Approved / Admitted</p>
              <h3 className="text-2xl font-bold text-text-primary">{approvedCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table & Filters */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search by application no, candidate name, phone, or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-bg-secondary border-border/50"
              />
            </div>

            {/* Filter Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={feeFilter}
                onChange={(e) => setFeeFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Fee Statuses</option>
                <option value="PAID">Fee Paid</option>
                <option value="PENDING">Fee Pending</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Application Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="ADMITTED">Admitted</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* Applications Data Table */}
          <div className="rounded-md border border-border/50 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-bg-secondary/50">
                <TableRow>
                  <TableHead className="font-semibold text-text-primary">Application No & Applicant</TableHead>
                  <TableHead className="font-semibold text-text-primary">Target Course</TableHead>
                  <TableHead className="font-semibold text-text-primary">Fee Status</TableHead>
                  <TableHead className="font-semibold text-text-primary">Application Status</TableHead>
                  <TableHead className="font-semibold text-text-primary">Submitted Date</TableHead>
                  <TableHead className="font-semibold text-text-primary">Notes</TableHead>
                  <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.length > 0 ? (
                  filteredApplications.map((app) => (
                    <TableRow key={app.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs font-bold text-[#1769AA] block">
                            {app.applicationNo}
                          </span>
                          <span className="font-medium text-text-primary text-sm block">
                            {app.applicantName}
                          </span>
                          <span className="text-xs text-text-secondary block">
                            {app.email} • {app.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800">
                        {app.courseName}
                      </TableCell>
                      <TableCell>{getFeeBadge(app.feeStatus)}</TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {app.submittedDate}
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary max-w-xs truncate">
                        {app.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-text-secondary">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-border shadow-md">
                            <DropdownMenuLabel>Application Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {app.status !== "ADMITTED" && (
                              <DropdownMenuItem 
                                className="text-[#1769AA] font-semibold"
                                onClick={() => convertApplicationToAdmission(app.id)}
                              >
                                <ArrowRight className="mr-2 h-4 w-4" /> Confirm Admission
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => 
                                updateApplication(app.id, { 
                                  feeStatus: app.feeStatus === "PAID" ? "PENDING" : "PAID" 
                                })
                              }
                            >
                              <CreditCard className="mr-2 h-4 w-4" /> Toggle Fee Status
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => deleteApplication(app.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Application
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-text-muted">
                      No applications found matching criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog for New Application */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-[#1769AA]" />
              New Admission Application
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Applicant Full Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Sneha Reddy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <Input
                    type="text"
                    placeholder="+91 99887 76655"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <Input
                    type="email"
                    placeholder="applicant@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Course *</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  required
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Registration Fee</label>
                  <select
                    value={feeStatus}
                    onChange={(e) => setFeeStatus(e.target.value as FeeStatus)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="PAID">Paid</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Application Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="SUBMITTED">Submitted</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="APPROVED">Approved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Application Notes</label>
                <Input
                  type="text"
                  placeholder="e.g. Documents verified; fee receipt attached."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
                >
                  Submit Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
