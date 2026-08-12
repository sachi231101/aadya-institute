import React, { useState, useEffect } from "react";
import { 
  GraduationCap, 
  Plus, 
  Search, 
  CheckCircle2, 
  MoreVertical, 
  Trash2, 
  Loader2
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
  const { admissions, isLoading, fetchAdmissions, addAdmission, updateAdmission, deleteAdmission } = useAdmissionStore();
  const { courses, batches, fetchCourses, fetchBatches } = useCourseStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State for Direct Admission
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [feePlan, setFeePlan] = useState<FeePlan>("INSTALLMENT");
  const [status, setStatus] = useState<AdmissionStatus>("CONFIRMED");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAdmissions();
    if (fetchCourses) fetchCourses();
    if (fetchBatches) fetchBatches();
  }, []);

  useEffect(() => {
    if (courses.length > 0 && !courseId) {
      setCourseId(courses[0].id);
    }
  }, [courses]);

  useEffect(() => {
    if (batches.length > 0 && !batchId) {
      setBatchId(batches[0].id);
    }
  }, [batches]);

  const filteredAdmissions = admissions.filter((adm) => {
    const matchesSearch =
      (adm.admissionNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (adm.studentName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (adm.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (adm.phone || "").includes(searchTerm) ||
      (adm.courseName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (adm.batchName && adm.batchName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCourse = courseFilter === "ALL" || adm.courseId === courseFilter;
    const matchesStatus = statusFilter === "ALL" || adm.status === statusFilter;

    return matchesSearch && matchesCourse && matchesStatus;
  });

  const totalAdmissions = admissions.length;
  const confirmedCount = admissions.filter((a) => a.status === "CONFIRMED").length;
  const provisionalCount = admissions.filter((a) => a.status === "PROVISIONAL").length;
  const activeBatchesCount = Array.from(new Set(admissions.map((a) => a.batchId).filter(Boolean))).length;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !courseId) return;

    setIsSubmitting(true);
    await addAdmission({
      studentName: name,
      email: email || undefined,
      phone,
      courseId,
      batchId: batchId || undefined,
      feePlan,
      status,
      notes: notes || undefined,
    });

    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setIsSubmitting(false);
    setShowModal(false);
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
            View active student admissions, fee structures, and batch assignments across all institute departments.
          </p>
        </div>

        <Button 
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-sm transition-colors"
          onClick={() => setShowModal(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Direct Admission Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Admissions</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalAdmissions}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Confirmed Seats</p>
              <h3 className="text-2xl font-bold text-text-primary">{confirmedCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Provisional Seats</p>
              <h3 className="text-2xl font-bold text-text-primary">{provisionalCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Active Batches Assigned</p>
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
                placeholder="Search by admission no, student name, email, or course..."
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
                  <TableHead className="font-semibold text-text-primary">Adm No.</TableHead>
                  <TableHead className="font-semibold text-text-primary">Student Details</TableHead>
                  <TableHead className="font-semibold text-text-primary">Course</TableHead>
                  <TableHead className="font-semibold text-text-primary">Assigned Batch</TableHead>
                  <TableHead className="font-semibold text-text-primary">Fee Plan</TableHead>
                  <TableHead className="font-semibold text-text-primary">Status</TableHead>
                  <TableHead className="font-semibold text-text-primary">Admission Date</TableHead>
                  <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-text-muted">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-[#1769AA]" />
                        Loading admissions...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAdmissions.length > 0 ? (
                  filteredAdmissions.map((adm) => (
                    <TableRow key={adm.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-[#1769AA]">
                        {adm.admissionNo || "—"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-semibold text-text-primary text-sm block">
                            {adm.studentName}
                          </span>
                          <span className="text-xs text-text-secondary block">
                            {adm.email ? `${adm.email} • ` : ""}{adm.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-[#1769AA]">
                        {adm.courseName}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">
                        {adm.batchName || "Unassigned"}
                      </TableCell>
                      <TableCell>{getFeePlanBadge(adm.feePlan)}</TableCell>
                      <TableCell>
                        <select
                          value={adm.status}
                          onChange={(e) => updateAdmission(adm.id, { status: e.target.value as AdmissionStatus })}
                          className="text-xs p-1 border rounded bg-transparent font-medium"
                        >
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="PROVISIONAL">Provisional</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {adm.admissionDate}
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
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-text-muted">
                      No admission records found. Create your first live admission!
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
                    placeholder="+91 98765 43210"
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
                    placeholder="aarav@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course *</label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                    required
                  >
                    <option value="" disabled>Select course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
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
                    <option value="">No Batch Assigned</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code || b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Payment Plan</label>
                  <select
                    value={feePlan}
                    onChange={(e) => setFeePlan(e.target.value as FeePlan)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="FULL_PAYMENT">Full Upfront</option>
                    <option value="INSTALLMENT">Installments</option>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                <Input
                  type="text"
                  placeholder="e.g. Paid registration fee via UPI."
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
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Admission"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
