import React, { useState, useEffect } from "react";
import { 
  HelpCircle, 
  Plus, 
  Search, 
  UserCheck, 
  PhoneCall, 
  CheckCircle2, 
  MoreVertical, 
  Trash2, 
  ArrowRight,
  MessageSquare,
  Globe,
  Users,
  MapPin,
  Share2,
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
import type { EnquirySource, EnquiryStatus } from "../../../types/admission.types";

export const Enquiries: React.FC = () => {
  const { enquiries, isLoading, fetchEnquiries, addEnquiry, updateEnquiry, deleteEnquiry, convertEnquiryToApplication } = useAdmissionStore();
  const { courses, fetchCourses } = useCourseStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State for New Enquiry
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [courseId, setCourseId] = useState("");
  const [source, setSource] = useState<EnquirySource>("WEBSITE");
  const [status, setStatus] = useState<EnquiryStatus>("NEW");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEnquiries();
    if (fetchCourses) {
      fetchCourses();
    }
  }, []);

  useEffect(() => {
    if (courses.length > 0 && !courseId) {
      setCourseId(courses[0].id);
    }
  }, [courses]);

  const filteredEnquiries = enquiries.filter((e) => {
    const matchesSearch =
      (e.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.phone || "").includes(searchTerm) ||
      (e.courseName || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSource = sourceFilter === "ALL" || e.source === sourceFilter;
    const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;

    return matchesSearch && matchesSource && matchesStatus;
  });

  const totalEnquiries = enquiries.length;
  const newEnquiries = enquiries.filter((e) => e.status === "NEW").length;
  const pendingFollowups = enquiries.filter((e) => e.status === "FOLLOW_UP" || e.status === "IN_PROGRESS").length;
  const convertedCount = enquiries.filter((e) => e.status === "CONVERTED").length;
  const conversionRate = totalEnquiries > 0 ? Math.round((convertedCount / totalEnquiries) * 100) : 0;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !courseId) return;

    setIsSubmitting(true);
    await addEnquiry({
      name,
      email: email || undefined,
      phone,
      courseId,
      source,
      status,
      counselorNotes: notes || undefined,
    });

    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setIsSubmitting(false);
    setShowModal(false);
  };

  const getSourceBadge = (src: EnquirySource) => {
    switch (src) {
      case "WEBSITE":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Globe className="w-3 h-3 mr-1" /> Website</Badge>;
      case "WHATSAPP":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><MessageSquare className="w-3 h-3 mr-1" /> WhatsApp</Badge>;
      case "WALK_IN":
        return <Badge variant="outline" className="bg-[#1769AA]/10 text-[#1769AA] border-blue-200"><MapPin className="w-3 h-3 mr-1" /> Walk-in</Badge>;
      case "REFERRAL":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><Users className="w-3 h-3 mr-1" /> Referral</Badge>;
      default:
        return <Badge variant="outline"><Share2 className="w-3 h-3 mr-1" /> {src}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Student Enquiries</h2>
          <p className="text-sm text-text-secondary">
            Manage prospective student leads, follow-up schedules, and admission conversions.
          </p>
        </div>

        <Button 
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-sm transition-colors"
          onClick={() => setShowModal(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Enquiry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Enquiries</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalEnquiries}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">New Enquiries</p>
              <h3 className="text-2xl font-bold text-text-primary">{newEnquiries}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Follow-ups Pending</p>
              <h3 className="text-2xl font-bold text-text-primary">{pendingFollowups}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Conversion Rate</p>
              <h3 className="text-2xl font-bold text-text-primary">{conversionRate}%</h3>
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
                placeholder="Search by student name, email, phone, or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-bg-secondary border-border/50"
              />
            </div>

            {/* Filter Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Sources</option>
                <option value="WEBSITE">Website</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="WALK_IN">Walk-in</option>
                <option value="REFERRAL">Referral</option>
                <option value="SOCIAL_MEDIA">Social Media</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New Lead</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="CONVERTED">Converted</option>
                <option value="REJECTED">Closed</option>
              </select>
            </div>
          </div>

          {/* Enquiries Data Table */}
          <div className="rounded-md border border-border/50 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-bg-secondary/50">
                <TableRow>
                  <TableHead className="font-semibold text-text-primary">Lead Details</TableHead>
                  <TableHead className="font-semibold text-text-primary">Target Course</TableHead>
                  <TableHead className="font-semibold text-text-primary">Source</TableHead>
                  <TableHead className="font-semibold text-text-primary">Status</TableHead>
                  <TableHead className="font-semibold text-text-primary">Counsellor Remarks</TableHead>
                  <TableHead className="font-semibold text-text-primary">Date</TableHead>
                  <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-text-muted">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-[#1769AA]" />
                        Loading enquiries...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEnquiries.length > 0 ? (
                  filteredEnquiries.map((enquiry) => (
                    <TableRow key={enquiry.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div>
                          <span className="font-semibold text-text-primary text-sm block">
                            {enquiry.name}
                          </span>
                          <span className="text-xs text-text-secondary block">
                            {enquiry.email ? `${enquiry.email} • ` : ""}{enquiry.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-[#1769AA]">
                        {enquiry.courseName}
                      </TableCell>
                      <TableCell>{getSourceBadge(enquiry.source)}</TableCell>
                      <TableCell>
                        <select
                          value={enquiry.status}
                          onChange={(e) => updateEnquiry(enquiry.id, { status: e.target.value as EnquiryStatus })}
                          className="text-xs p-1 border rounded bg-transparent font-medium"
                        >
                          <option value="NEW">New Lead</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="FOLLOW_UP">Follow-up</option>
                          <option value="CONVERTED">Converted</option>
                          <option value="REJECTED">Closed</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary max-w-xs truncate">
                        {enquiry.counselorNotes || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {enquiry.createdAt ? new Date(enquiry.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-text-secondary">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-border shadow-md">
                            <DropdownMenuLabel>Lead Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {enquiry.status !== "CONVERTED" && (
                              <DropdownMenuItem 
                                className="text-[#1769AA] font-semibold"
                                onClick={() => convertEnquiryToApplication(enquiry.id)}
                              >
                                <ArrowRight className="mr-2 h-4 w-4" /> Convert to Application
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => deleteEnquiry(enquiry.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Lead
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-text-muted">
                      No enquiries found. Add your first live lead!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog for New Enquiry */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[#1769AA]" />
              New Student Enquiry
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Full Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Rahul Verma"
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
                    placeholder="student@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Course *</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  required
                >
                  <option value="" disabled>Select a course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as EnquirySource)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="WEBSITE">Website</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="WALK_IN">Walk-in</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="SOCIAL_MEDIA">Social Media</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EnquiryStatus)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="NEW">New Lead</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Counsellor Remarks / Notes</label>
                <Input
                  type="text"
                  placeholder="e.g. Interested in morning batch; requested brochure."
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
                    "Save Enquiry"
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
