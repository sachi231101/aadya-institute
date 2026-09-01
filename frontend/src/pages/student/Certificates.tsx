import React, { useState } from "react";
import {
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  GraduationCap,
  Lock,
  QrCode,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Printer,
  X,
  Clock,
  Send,
  Building,
  Check,
  Copy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth.store";
import { useStudentAcademicAccess } from "@/hooks/useStudentAcademicAccess";

interface CertificateItem {
  id: string;
  certificateNo: string;
  title: string;
  courseName: string;
  category: "Course Completion" | "Proctored Exam" | "Skill Specialization" | "Workshop";
  issueDate: string;
  status: "ISSUED" | "ELIGIBLE" | "IN_PROGRESS";
  grade?: string;
  score?: string;
  instructor: string;
  skills: string[];
  description: string;
  verificationUrl: string;
  duration: string;
}

const INITIAL_CERTIFICATES: CertificateItem[] = [
  {
    id: "cert-1",
    certificateNo: "AADYA-CC-2026-8492",
    title: "Certificate of Course Completion",
    courseName: "Full Stack Web Development & Cloud Architecture",
    category: "Course Completion",
    issueDate: "Aug 15, 2026",
    status: "ISSUED",
    grade: "Grade A+ (Distinction)",
    score: "94.5%",
    instructor: "Dr. Vikram Sethi",
    skills: ["React 19", "Node.js", "TypeScript", "PostgreSQL", "Docker", "REST APIs"],
    description: "Demonstrated advanced proficiency in building enterprise-grade full stack web applications.",
    verificationUrl: "https://verify.aadyainstitution.com/cert/AADYA-CC-2026-8492",
    duration: "6 Months Professional Program",
  },
  {
    id: "cert-2",
    certificateNo: "AADYA-EX-2026-1049",
    title: "Proctored Final Exam Certificate",
    courseName: "Advanced React & Frontend System Design",
    category: "Proctored Exam",
    issueDate: "Jul 28, 2026",
    status: "ISSUED",
    grade: "Score: 98/100",
    score: "98.0%",
    instructor: "Prof. Priya Sharma",
    skills: ["React Architecture", "State Optimization", "SSR", "Performance Auditing"],
    description: "Cleared the comprehensive 180-minute camera-proctored examination with distinction.",
    verificationUrl: "https://verify.aadyainstitution.com/cert/AADYA-EX-2026-1049",
    duration: "Comprehensive Assessment",
  },
  {
    id: "cert-3",
    certificateNo: "AADYA-WS-2026-3021",
    title: "Workshop Mastery Credential",
    courseName: "AI-Powered Full Stack Development with LLMs & Sarvam AI",
    category: "Workshop",
    issueDate: "Feb 05, 2026",
    status: "ISSUED",
    grade: "Merit Badge",
    score: "100%",
    instructor: "Dr. Vikram Sethi & AI Team",
    skills: ["Prompt Engineering", "Voice AI", "Sarvam AI APIs", "Autonomous Agents"],
    description: "Successfully participated in and delivered the hands-on Voice AI hackathon module.",
    verificationUrl: "https://verify.aadyainstitution.com/cert/AADYA-WS-2026-3021",
    duration: "30 Hours Intensive Workshop",
  },
  {
    id: "cert-4",
    certificateNo: "AADYA-SK-2026-7712",
    title: "Professional Specialization Certificate",
    courseName: "Database Optimization & High Performance PostgreSQL",
    category: "Skill Specialization",
    issueDate: "Pending Verification",
    status: "ELIGIBLE",
    grade: "Eligible (92% Aggregate)",
    score: "92.0%",
    instructor: "Er. Amit Patil",
    skills: ["Indexing Strategies", "Prisma ORM", "Query Tuning", "ACID Transactions"],
    description: "Eligible for certificate issuance upon final attendance verification.",
    verificationUrl: "https://verify.aadyainstitution.com/cert/AADYA-SK-2026-7712",
    duration: "2 Months Specialization",
  },
  {
    id: "cert-5",
    certificateNo: "AADYA-CC-2026-9904",
    title: "Professional Certification in Digital Marketing & SEO",
    courseName: "Digital Growth Strategy & Search Engine Optimization",
    category: "Course Completion",
    issueDate: "Estimated Mar 2026",
    status: "IN_PROGRESS",
    grade: "In Progress (78% Complete)",
    score: "78.0%",
    instructor: "Smt. Priya Nair",
    skills: ["SEO Audits", "Social Ads", "Google Analytics 4", "Lead Funnels"],
    description: "Currently pursuing. Certificate unlocks upon batch graduation and final exam.",
    verificationUrl: "",
    duration: "3 Months Program",
  },
];

export const StudentCertificates: React.FC = () => {
  const { user } = useAuthStore();
  const academic = useStudentAcademicAccess();
  const studentName = academic.studentName || user?.name || "Student";

  const [certificates, setCertificates] = useState<CertificateItem[]>(INITIAL_CERTIFICATES);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Certificate Preview Modal State
  const [previewCert, setPreviewCert] = useState<CertificateItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Request Certificate Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestCourse, setRequestCourse] = useState("");
  const [requestComments, setRequestComments] = useState("");
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredCertificates = certificates.filter((cert) => {
    // Course authorization check
    if (cert.courseName && !academic.isAuthorizedForCourse(cert.courseName) && academic.assignedCourses.length > 0) {
      return false;
    }

    const matchesSearch =
      cert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.certificateNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === "ALL" || cert.category === selectedCategory;

    const matchesStatus =
      selectedStatus === "ALL" || cert.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const issuedCount = certificates.filter((c) => c.status === "ISSUED").length;
  const eligibleCount = certificates.filter((c) => c.status === "ELIGIBLE").length;
  const inProgressCount = certificates.filter((c) => c.status === "IN_PROGRESS").length;

  const handleCopyLink = (cert: CertificateItem) => {
    if (!cert.verificationUrl) return;
    navigator.clipboard.writeText(cert.verificationUrl);
    setCopiedId(cert.id);
    showToast(`✓ Verification link for "${cert.courseName}" copied to clipboard!`);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const handleClaimCertificate = (cert: CertificateItem) => {
    setCertificates((prev) =>
      prev.map((c) =>
        c.id === cert.id
          ? {
              ...c,
              status: "ISSUED",
              issueDate: "Today (Verified)",
              verificationUrl: `https://verify.aadyainstitution.com/cert/${c.certificateNo}`,
            }
          : c
      )
    );
    showToast(`🎉 Certificate ${cert.certificateNo} has been generated and verified!`);
  };

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestCourse) return;
    setRequestSuccess(true);
    setTimeout(() => {
      setRequestSuccess(false);
      setShowRequestModal(false);
      setRequestCourse("");
      setRequestComments("");
      showToast("✓ Certificate request submitted to Academic Administration!");
    }, 1500);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500 bg-[#f8fafc] dark:bg-slate-950 min-h-screen">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-3 duration-300">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0A2540] dark:text-white flex items-center gap-3 tracking-tight">
            <span className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
              <Award className="h-6 w-6 stroke-[2.2]" />
            </span>
            My Certificates & Credentials
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            View, download, and publicly verify your Aadya Institute academic credentials, proctored exam diplomas, and skill honors.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setShowRequestModal(true)}
            variant="outline"
            className="rounded-xl border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-xs font-bold gap-2 cursor-pointer shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
            Request Certificate
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 rounded-2xl border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Earned Credentials
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {issuedCount}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified & Active
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 rounded-2xl border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Distinctions & Honors
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                2
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> Top Percentile
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 flex items-center justify-center text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 rounded-2xl border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ready to Claim
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {eligibleCount}
              </h3>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Requirements Met
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 rounded-2xl border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                In Progress
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {inProgressCount}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Enrolled Modules
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters & Search Toolbar */}
      <Card className="bg-white dark:bg-slate-900 rounded-2xl border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "ALL", label: "All Credentials" },
              { id: "Course Completion", label: "Course Completion" },
              { id: "Proctored Exam", label: "Exams & Honors" },
              { id: "Skill Specialization", label: "Specializations" },
              { id: "Workshop", label: "Workshops" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by course, skill, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-9"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Certificate Cards Grid */}
      {filteredCertificates.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 rounded-3xl border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-2xs">
          <Award className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-slate-800 dark:text-slate-200 font-bold text-base">
            No certificates found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Try adjusting your search query or category filter.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredCertificates.map((cert) => {
            const isIssued = cert.status === "ISSUED";
            const isEligible = cert.status === "ELIGIBLE";
            const isInProgress = cert.status === "IN_PROGRESS";

            return (
              <Card
                key={cert.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-300 group flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-lg ${
                  isIssued
                    ? "border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                    : isEligible
                    ? "border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20"
                    : "border-slate-200/60 dark:border-slate-800 opacity-85"
                }`}
              >
                <div>
                  {/* Card Top Banner with Certificate Style */}
                  <div
                    className={`p-5 relative overflow-hidden border-b ${
                      isIssued
                        ? "bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#312E81] text-white"
                        : isEligible
                        ? "bg-gradient-to-br from-[#1E1B4B] to-[#312E81] text-white"
                        : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {/* Background Seal Watermark */}
                    <div className="absolute right-3 -bottom-4 opacity-10 pointer-events-none">
                      <ShieldCheck className="w-32 h-32" />
                    </div>

                    <div className="flex items-center justify-between gap-2 relative z-10">
                      <Badge
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 border ${
                          isIssued
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                            : isEligible
                            ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {cert.category}
                      </Badge>

                      <span
                        className={`font-mono text-[10.5px] font-bold ${
                          isIssued || isEligible ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {cert.certificateNo}
                      </span>
                    </div>

                    <div className="mt-4 relative z-10">
                      <p className="text-[10.5px] font-semibold tracking-wider uppercase opacity-75">
                        AADYA INSTITUTE OF SKILL DEVELOPMENT
                      </p>
                      <h2 className="text-base font-extrabold tracking-tight leading-snug mt-0.5 line-clamp-2">
                        {cert.courseName}
                      </h2>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] font-medium opacity-90 relative z-10 pt-2 border-t border-white/10">
                      <span>Issued: {cert.issueDate}</span>
                      {cert.grade && (
                        <span className="font-bold flex items-center gap-1 text-amber-300">
                          <Star className="w-3 h-3 fill-current" /> {cert.grade}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5 space-y-3.5">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {cert.description}
                    </p>

                    {/* Certified Skills Tags */}
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                        Skills Verified:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {cert.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10.5px] font-semibold border border-slate-200/60 dark:border-slate-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1 font-medium">
                        <Building className="w-3 h-3 text-indigo-500" /> Instructor: {cert.instructor}
                      </span>
                      <span className="font-mono text-[10.5px]">{cert.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-4 px-5 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {isIssued && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyLink(cert)}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1 text-slate-700 dark:text-slate-300 cursor-pointer"
                          title="Copy verification link"
                        >
                          {copiedId === cert.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Share</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
                              cert.courseName
                            )}&organizationName=Aadya+Institute&issueYear=2026&issueMonth=2&certUrl=${encodeURIComponent(
                              cert.verificationUrl
                            )}&certId=${encodeURIComponent(cert.certificateNo)}`;
                            window.open(linkedInUrl, "_blank", "noopener,noreferrer");
                          }}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1 text-[#0A66C2] border-[#0A66C2]/30 hover:bg-[#0A66C2]/10 cursor-pointer"
                          title="Add to LinkedIn Profile"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
                          </svg>
                          <span className="hidden sm:inline">LinkedIn</span>
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setPreviewCert(cert)}
                        className="h-8 px-3.5 rounded-xl text-xs font-bold bg-[#5B50EC] hover:bg-[#4F46E5] text-white gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Certificate</span>
                      </Button>
                    </>
                  )}

                  {isEligible && (
                    <>
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Requirements Met
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleClaimCertificate(cert)}
                        className="h-8 px-3.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Generate & Claim</span>
                      </Button>
                    </>
                  )}

                  {isInProgress && (
                    <div className="w-full flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" /> In Progress (Score: {cert.score})
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        Complete program to unlock
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── CERTIFICATE PREVIEW & PRINT MODAL ─── */}
      <Dialog open={!!previewCert} onOpenChange={(open) => !open && setPreviewCert(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-slate-900 border-slate-700">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Official Credential Verification Preview
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrintCertificate}
                className="h-7.5 px-2.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Download</span>
              </Button>
            </div>
          </div>

          {previewCert && (
            <div className="p-6 md:p-8 bg-[#FAF8F5] text-slate-900 overflow-y-auto max-h-[80vh] print:max-h-none print:p-0">
              {/* Certificate Border Frame */}
              <div className="relative border-8 border-double border-[#8B7355] p-6 md:p-10 rounded-sm bg-[#FCFBF7] shadow-xl text-center">
                {/* Corner Ornaments */}
                <div className="absolute top-2 left-2 text-[#8B7355] text-lg font-serif">✦</div>
                <div className="absolute top-2 right-2 text-[#8B7355] text-lg font-serif">✦</div>
                <div className="absolute bottom-2 left-2 text-[#8B7355] text-lg font-serif">✦</div>
                <div className="absolute bottom-2 right-2 text-[#8B7355] text-lg font-serif">✦</div>

                {/* Institute Header */}
                <div className="space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#1E293B] text-white flex items-center justify-center shadow-md mb-2">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-serif font-extrabold tracking-wider text-[#1E293B] uppercase">
                    Aadya Institute of Skill Development
                  </h3>
                  <p className="text-[10px] font-sans font-bold tracking-widest text-[#8B7355] uppercase">
                    Excellence in Professional & Technical Education
                  </p>
                </div>

                <div className="my-6">
                  <span className="text-xs font-serif italic text-slate-500 uppercase tracking-widest block mb-1">
                    This is proudly presented to
                  </span>
                  <h1 className="text-2xl md:text-4xl font-serif font-black text-[#0A2540] tracking-wide underline decoration-amber-500/50 underline-offset-8">
                    {studentName}
                  </h1>
                </div>

                <p className="text-xs md:text-sm text-slate-700 max-w-lg mx-auto font-serif leading-relaxed">
                  for successfully completing all academic requirements, hands-on lab projects, and assessment milestones in
                </p>

                <h2 className="text-lg md:text-2xl font-serif font-bold text-[#4338CA] mt-2 mb-4 tracking-tight">
                  {previewCert.courseName}
                </h2>

                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 font-sans font-semibold my-4">
                  <span className="px-3 py-1 bg-amber-50 rounded-md border border-amber-200 text-amber-900">
                    Award: {previewCert.grade || "Passing Grade"}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 rounded-md border border-slate-200">
                    Duration: {previewCert.duration}
                  </span>
                </div>

                {/* Signatures & Seal Section */}
                <div className="grid grid-cols-3 items-end pt-8 mt-6 border-t border-slate-200 text-slate-700">
                  <div className="text-center">
                    <p className="font-serif italic text-sm font-bold text-slate-800">
                      {previewCert.instructor}
                    </p>
                    <div className="w-24 h-0.5 bg-slate-400 mx-auto my-1" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Lead Faculty
                    </p>
                  </div>

                  {/* Official Aadya Gold Seal */}
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-600 bg-gradient-to-tr from-amber-500 to-yellow-300 mx-auto flex flex-col items-center justify-center shadow-lg text-amber-950">
                      <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
                      <span className="text-[8px] font-black uppercase tracking-tighter">
                        AADYA VERIFIED
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="font-serif italic text-sm font-bold text-slate-800">
                      Academic Director
                    </p>
                    <div className="w-24 h-0.5 bg-slate-400 mx-auto my-1" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Director of Examination
                    </p>
                  </div>
                </div>

                {/* Verification Footer with ID and QR link */}
                <div className="mt-6 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Certificate ID: {previewCert.certificateNo}</span>
                  <span>Issued Date: {previewCert.issueDate}</span>
                  <span className="text-indigo-600 font-bold">
                    verify.aadyainstitution.com
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── REQUEST CERTIFICATE MODAL ─── */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-md p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Request Certificate Generation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submit a formal request to Academic Administration to audit your course completion and generate your digital certificate.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendRequest} className="space-y-4 mt-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Select Completed Program / Module:
              </label>
              <select
                required
                value={requestCourse}
                onChange={(e) => setRequestCourse(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose Course --</option>
                <option value="Database Optimization & High Performance PostgreSQL">
                  Database Optimization & High Performance PostgreSQL
                </option>
                <option value="Digital Growth Strategy & Search Engine Optimization">
                  Digital Growth Strategy & Search Engine Optimization
                </option>
                <option value="Python Full Stack Development (Batch A)">
                  Python Full Stack Development (Batch A)
                </option>
                <option value="AI Calling & Automation Specialist">
                  AI Calling & Automation Specialist
                </option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Candidate Name on Certificate:
              </label>
              <Input
                type="text"
                value={studentName}
                disabled
                className="text-xs rounded-xl bg-slate-100 text-slate-700 font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Additional Notes / Batch Reference (Optional):
              </label>
              <textarea
                rows={3}
                placeholder="Mention batch timing or roll number if applicable..."
                value={requestComments}
                onChange={(e) => setRequestComments(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRequestModal(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={requestSuccess}
                className="rounded-xl text-xs font-bold bg-[#5B50EC] hover:bg-[#4F46E5] text-white gap-1.5"
              >
                {requestSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Request</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
