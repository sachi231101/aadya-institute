import React, { useState } from "react";
import { 
  GraduationCap, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  MoreVertical, 
  Trash2, 
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
import type { AdmissionStatus, FeePlan } from "../../../types/admission.types";

export const AllAdmissions: React.FC = () => {
  const { admissions, addAdmission, deleteAdmission } = useAdmissionStore();
  const { courses, batches } = useCourseStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State for Direct Admission
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [batchId, setBatchId] = useState(batches[0]?.id || "");
  const [feePlan, setFeePlan] = useState<FeePlan>("INSTALLMENT");
  const [status, setStatus] = useState<AdmissionStatus>("CONFIRMED");
  const [notes, setNotes] = useState("");

  const filteredAdmissions = admissions.filter((adm) => {
    const matchesSearch =
      adm.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adm.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adm.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adm.phone.includes(searchTerm) ||
      adm.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (adm.batchName && adm.batchName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCourse = courseFilter === "ALL" || adm.courseId === courseFilter;
    const matchesStatus = statusFilter === "ALL" || adm.status === statusFilter;

    return matchesSearch && matchesCourse && matchesStatus;
  });

  const totalAdmissions = admissions.length;
  const confirmedCount = admissions.filter((a) => a.status === "CONFIRMED").length;
  const provisionalCount = admissions.filter((a) => a.status === "PROVISIONAL").length;
  const activeBatchesCount = Array.from(new Set(admissions.map((a) => a.batchId).filter(Boolean))).length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !courseId) return;

    const selectedCourse = courses.find((c) => c.id === courseId);
    const selectedBatch = batches.find((b) => b.id === batchId);

    addAdmission({
      studentName: name,
      email: email || `${name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
      phone,
      courseId,
      courseName: selectedCourse?.name || "General Course",
      batchId,
      batchName: selectedBatch?.code || "FS-2026-A1",
      feePlan,
      status,
      notes,
    });

    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setShowModal(false);
  };

  const getStatusBadge = (st: AdmissionStatus) => {
    switch (st) {
      case "CONFIRMED":
        return <Badge variant="success">Confirmed</Badge>;
      case "PROVISIONAL":
        return <Badge variant="warning">Provisional</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  const getFeePlanBadge = (fp: FeePlan) => {
    return fp === "FULL_PAYMENT" ? (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Full Paid</Badge>
    ) : (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Installments</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">All Admissions</h2>
          <p className="text-sm text-text-secondary">
            Directory of officially enrolled students, batch assignments, and fee payment plans.
          </p>
        </div>

        <Button 
          className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white shadow-sm transition-colors"
          onClick={() => setShowModal(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Direct Admission
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Confirmed Admissions</p>
              <h3 className="text-2xl font-bold text-text-primary">{confirmedCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Provisional Seats</p>
              <h3 className="text-2xl font-bold text-text-primary">{provisionalCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Enrolled</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalAdmissions}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Active Cohorts</p>
              <h3 className="text-2xl font-bold text-text-primary">{activeBatchesCount}</h3>
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
                placeholder="Search by admission no, student name, email, course, or batch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-bg-secondary border-border/50"
              />
            </div>

            {/* Filter Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROVISIONAL">Provisional</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Admissions Data Table */}
          <div className="rounded-md border border-border/50 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-bg-secondary/50">
                <TableRow>
                  <TableHead className="font-semibold text-text-primary">Admission No & Student</TableHead>
                  <TableHead className="font-semibold text-text-primary">Course & Batch</TableHead>
                  <TableHead className="font-semibold text-text-primary">Payment Plan</TableHead>
                  <TableHead className="font-semibold text-text-primary">Admission Date</TableHead>
                  <TableHead className="font-semibold text-text-primary">Status</TableHead>
                  <TableHead className="font-semibold text-text-primary">Notes</TableHead>
                  <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmissions.length > 0 ? (
                  filteredAdmissions.map((adm) => (
                    <TableRow key={adm.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs font-bold text-[#1769AA] block">
                            {adm.admissionNo}
                          </span>
                          <span className="font-medium text-text-primary text-sm block">
                            {adm.studentName}
                          </span>
                          <span className="text-xs text-text-secondary block">
                            {adm.email} • {adm.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="text-xs font-semibold text-slate-800 block">
                            {adm.courseName}
                          </span>
                          {adm.batchName && (
                            <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 text-slate-600 mt-0.5">
                              Batch: {adm.batchName}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getFeePlanBadge(adm.feePlan)}</TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {adm.admissionDate}
                      </TableCell>
                      <TableCell>{getStatusBadge(adm.status)}</TableCell>
                      <TableCell className="text-xs text-text-secondary max-w-xs truncate">
                        {adm.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-text-secondary">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-border shadow-md">
                            <DropdownMenuLabel>Admission Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => deleteAdmission(adm.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Admission
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-text-muted">
                      No admissions found matching criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog for Direct Admission */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#1769AA]" />
              Direct Student Admission
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Full Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Aarav Gupta"
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
                    placeholder="+91 98220 55443"
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
                    placeholder="student@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course *</label>
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Batch</label>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Plan</label>
                  <select
                    value={feePlan}
                    onChange={(e) => setFeePlan(e.target.value as FeePlan)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="INSTALLMENT">Installment Plan</option>
                    <option value="FULL_PAYMENT">Full Payment Upfront</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AdmissionStatus)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="PROVISIONAL">Provisional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Notes</label>
                <Input
                  type="text"
                  placeholder="e.g. Received first installment receipt #4021."
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
                  className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white"
                >
                  Confirm Admission
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
