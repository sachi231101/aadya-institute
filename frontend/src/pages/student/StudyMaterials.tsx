import React, { useState, useMemo } from "react";
import { 
  BookOpen, 
  Search, 
  Download, 
  Eye, 
  FileText, 
  FileCode, 
  Presentation, 
  FolderArchive, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  X, 
  Layers, 
  HardDrive
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StudyMaterialItem {
  id: string;
  title: string;
  description: string;
  moduleName: string;
  batchCode: string;
  courseName: string;
  fileType: "pdf" | "slides" | "code" | "doc";
  fileSize: string;
  pagesOrDuration: string;
  uploadedAt: string;
  facultyName: string;
  facultyAvatar?: string;
  downloadUrl: string;
  topics: string[];
}

const MOCK_STUDY_MATERIALS: StudyMaterialItem[] = [
  {
    id: "mat-1",
    title: "Complete On-Page SEO Checklist & Implementation Guide",
    description: "Comprehensive step-by-step checklist for title tags, meta descriptions, heading structures, canonicalization, and semantic content.",
    moduleName: "SEO Fundamentals",
    batchCode: "DM-01",
    courseName: "Digital Marketing",
    fileType: "pdf",
    fileSize: "3.4 MB",
    pagesOrDuration: "24 Pages",
    uploadedAt: "12 Aug 2026",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    downloadUrl: "#",
    topics: ["Title & Meta Optimization", "Heading Hierarchy (H1-H6)", "Image Alt Attributes", "URL Slug Structures"],
  },
  {
    id: "mat-2",
    title: "Node.js Modular REST API Architecture & Best Practices",
    description: "Production architectural template covering Controller-Service-Repository pattern, Prisma ORM, and JWT authentication.",
    moduleName: "Backend Architecture",
    batchCode: "WD-2026-A",
    courseName: "Full Stack Web Development",
    fileType: "code",
    fileSize: "8.2 MB",
    pagesOrDuration: "ZIP Archive",
    uploadedAt: "11 Aug 2026",
    facultyName: "HM Adithya",
    facultyAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    downloadUrl: "#",
    topics: ["Modular Folder Layout", "Route Controllers", "Prisma Database Client", "Zod Request Validation"],
  },
  {
    id: "mat-3",
    title: "Keyword Research Strategy & Search Intent Slide Deck",
    description: "Lecture presentation slides covering commercial, informational, transactional intent, volume trends, and competitor gap discovery.",
    moduleName: "SEO Fundamentals",
    batchCode: "DM-01",
    courseName: "Digital Marketing",
    fileType: "slides",
    fileSize: "12.5 MB",
    pagesOrDuration: "42 Slides",
    uploadedAt: "10 Aug 2026",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    downloadUrl: "#",
    topics: ["Search Intent Categorization", "Long-tail Keyword Extraction", "Keyword Difficulty Matrices", "SERP Analysis"],
  },
  {
    id: "mat-4",
    title: "JavaScript ES6+ Core Concepts & Modern Cheatsheet",
    description: "Concise handbook detailing arrow functions, destructuring, spread/rest syntax, Promises, Async/Await, and Array methods.",
    moduleName: "JavaScript Essentials",
    batchCode: "JS-2026-A",
    courseName: "Web Development",
    fileType: "pdf",
    fileSize: "2.1 MB",
    pagesOrDuration: "18 Pages",
    uploadedAt: "08 Aug 2026",
    facultyName: "Priya Sharma",
    facultyAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
    downloadUrl: "#",
    topics: ["Arrow Functions vs Normal Functions", "Promises & Microtasks", "Destructuring & Spreading", "Map, Filter, Reduce"],
  },
  {
    id: "mat-5",
    title: "Technical SEO Audit & Core Web Vitals Lab Workbook",
    description: "Hands-on audit template for evaluating LCP, FID, CLS, crawl depth, robots.txt directives, and XML sitemaps.",
    moduleName: "Technical SEO",
    batchCode: "DM-01",
    courseName: "Digital Marketing",
    fileType: "doc",
    fileSize: "4.8 MB",
    pagesOrDuration: "Workbook (.docx)",
    uploadedAt: "06 Aug 2026",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    downloadUrl: "#",
    topics: ["Core Web Vitals Metrics", "Lighthouse Performance Scoring", "Crawl Budget Optimization", "Schema JSON-LD"],
  },
  {
    id: "mat-6",
    title: "React JS Custom Hooks & State Management Starter Pack",
    description: "Starter repository containing custom hooks for API polling, local storage sync, debounce inputs, and responsive window observers.",
    moduleName: "React Framework",
    batchCode: "WD-2026-A",
    courseName: "Full Stack Web Development",
    fileType: "code",
    fileSize: "6.7 MB",
    pagesOrDuration: "ZIP Starter",
    uploadedAt: "04 Aug 2026",
    facultyName: "HM Adithya",
    facultyAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    downloadUrl: "#",
    topics: ["useFetch & useQuery Hooks", "useLocalStorage Hook", "useDebounce Hook", "Zustand Global Store"],
  },
];

export const StudentStudyMaterials: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [previewItem, setPreviewItem] = useState<StudyMaterialItem | null>(null);

  const modulesList = ["ALL", "SEO Fundamentals", "Backend Architecture", "JavaScript Essentials", "Technical SEO", "React Framework"];

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return MOCK_STUDY_MATERIALS.filter((item) => {
      // Module filter
      if (selectedModule !== "ALL" && item.moduleName !== selectedModule) {
        return false;
      }
      // Type filter
      if (selectedType !== "ALL" && item.fileType !== selectedType) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchModule = item.moduleName.toLowerCase().includes(q);
        const matchFaculty = item.facultyName.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchModule || matchFaculty;
      }
      return true;
    });
  }, [selectedModule, selectedType, searchQuery]);

  const renderTypeIcon = (type: StudyMaterialItem["fileType"]) => {
    switch (type) {
      case "pdf":
        return (
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
            <FileText className="w-5 h-5 stroke-[2.2]" />
          </div>
        );
      case "slides":
        return (
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
            <Presentation className="w-5 h-5 stroke-[2.2]" />
          </div>
        );
      case "code":
        return (
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
            <FileCode className="w-5 h-5 stroke-[2.2]" />
          </div>
        );
      case "doc":
      default:
        return (
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1769AA] shrink-0 shadow-2xs">
            <FolderArchive className="w-5 h-5 stroke-[2.2]" />
          </div>
        );
    }
  };

  const renderTypeBadge = (type: StudyMaterialItem["fileType"]) => {
    switch (type) {
      case "pdf":
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] uppercase font-bold">PDF Document</Badge>;
      case "slides":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] uppercase font-bold">Slide Deck</Badge>;
      case "code":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] uppercase font-bold">Source Code</Badge>;
      case "doc":
      default:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] uppercase font-bold">Workbook</Badge>;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12 font-sans">
      {/* ── Page Header Section ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-transparent">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#5B50EC] flex items-center justify-center text-white shrink-0 shadow-xs">
            <BookOpen className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Study Materials & Resources
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-[#5B50EC] border border-indigo-200/60">
                <Sparkles className="w-3 h-3" />
                Assigned Curriculum
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Access lecture notes, slide presentations, cheat sheets, and lab workbooks assigned to your enrolled courses.
            </p>
          </div>
        </div>

        {/* Action Header Pill */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button
            onClick={() => alert("Downloading all module notes as a unified ZIP package...")}
            className="bg-[#5B50EC] hover:bg-[#4C40E0] text-white rounded-xl text-xs font-semibold h-9 px-4 gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download All (ZIP)</span>
          </Button>
        </div>
      </div>

      {/* ── 4 KPI Summary Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* 1. Total Materials */}
        <Card className="bg-white border border-slate-200/70 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5B50EC] shrink-0">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Files
              </span>
              <div className="text-2xl font-black text-slate-900 leading-tight">
                {MOCK_STUDY_MATERIALS.length}
              </div>
              <span className="text-[11px] font-medium text-slate-500 block">
                Curriculum Assets
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Active Modules */}
        <Card className="bg-white border border-slate-200/70 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Modules
              </span>
              <div className="text-2xl font-black text-slate-900 leading-tight">
                5
              </div>
              <span className="text-[11px] font-bold text-emerald-600 block">
                All Enrolled
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 3. Reading Hours */}
        <Card className="bg-white border border-slate-200/70 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Est. Study Time
              </span>
              <div className="text-2xl font-black text-slate-900 leading-tight">
                18h
              </div>
              <span className="text-[11px] font-medium text-slate-500 block">
                Guided Content
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 4. Total Size */}
        <Card className="bg-white border border-slate-200/70 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1769AA] shrink-0">
              <HardDrive className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Storage Size
              </span>
              <div className="text-2xl font-black text-slate-900 leading-tight">
                37.7 MB
              </div>
              <span className="text-[11px] font-medium text-slate-500 block">
                Cloud Synced
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Search Toolbar ──────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Module Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {modulesList.map((mod) => {
            const isSelected = selectedModule === mod;
            return (
              <button
                key={mod}
                type="button"
                onClick={() => setSelectedModule(mod)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-[#5B50EC] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {mod === "ALL" ? "All Modules" : mod}
              </button>
            );
          })}
        </div>

        {/* Search & Type Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {["ALL", "pdf", "slides", "code", "doc"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedType === t
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {t === "ALL" && "All Types"}
                {t === "pdf" && "PDF Documents"}
                {t === "slides" && "Slide Decks"}
                {t === "code" && "Source Code"}
                {t === "doc" && "Workbooks"}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search notes, slides, cheatsheets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl border-slate-200/80 bg-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ── Materials Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredMaterials.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-slate-200/80 rounded-2xl p-8 space-y-2">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No study materials found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              We couldn't find any resources matching your selected module or search keywords.
            </p>
          </div>
        ) : (
          filteredMaterials.map((item) => (
            <Card
              key={item.id}
              className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Top Card Header: Type Icon + Badges */}
                  <div className="flex items-start justify-between gap-3">
                    {renderTypeIcon(item.fileType)}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {renderTypeBadge(item.fileType)}
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-mono">
                        {item.batchCode}
                      </Badge>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#5B50EC] transition-colors leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Module & File Info */}
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold text-slate-800">{item.moduleName}</span>
                      <span className="text-slate-400 font-mono">{item.fileSize}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span>{item.pagesOrDuration}</span>
                      <span>•</span>
                      <span>Uploaded {item.uploadedAt}</span>
                    </div>
                  </div>

                  {/* Faculty Uploader */}
                  <div className="flex items-center gap-2 pt-1">
                    <Avatar className="w-6 h-6 rounded-full border border-slate-200">
                      <AvatarImage src={item.facultyAvatar} alt={item.facultyName} />
                      <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700 font-bold">
                        {item.facultyName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-slate-600 font-medium">
                      By <strong className="text-slate-800 font-semibold">{item.facultyName}</strong>
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewItem(item)}
                    className="flex-1 h-8.5 rounded-xl text-xs font-semibold text-slate-700 border-slate-200 bg-white hover:bg-slate-50 hover:text-[#5B50EC] gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => alert(`Downloading: ${item.title} (${item.fileSize})`)}
                    className="h-8.5 px-3.5 rounded-xl text-xs font-semibold bg-[#5B50EC] hover:bg-[#4C40E0] text-white gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── Document Preview Modal Dialog ────────────────────────────────────── */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-xl p-5 sm:p-6 space-y-5 text-slate-900 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-start gap-3">
                {renderTypeIcon(previewItem.fileType)}
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {previewItem.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {renderTypeBadge(previewItem.fileType)}
                    <span className="text-xs text-slate-500">• {previewItem.moduleName}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                {previewItem.description}
              </p>

              {/* Topics Breakdown */}
              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Table of Contents & Core Topics
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {previewItem.topics.map((topic, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200/60 text-slate-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{topic}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">File Size</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">{previewItem.fileSize}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Format</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">{previewItem.pagesOrDuration}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Instructor</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block truncate">{previewItem.facultyName}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewItem(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Close Preview
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  alert(`Downloading: ${previewItem.title}`);
                  setPreviewItem(null);
                }}
                className="bg-[#5B50EC] hover:bg-[#4C40E0] text-white rounded-xl text-xs font-semibold px-4 gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Resource</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
