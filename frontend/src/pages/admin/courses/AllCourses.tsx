import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Search,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  MoreVertical,
  Trash2,
  LayoutGrid,
  List,
  GraduationCap,
  Loader2
} from "lucide-react";
import { useCourses } from "../../../hooks/useCourses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const AllCourses: React.FC = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const { courses, loading, error, deleteCourse } = useCourses({
    search: searchTerm,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    category: categoryFilter !== "ALL" ? categoryFilter : undefined,
  });

  const categories = Array.from(
    new Set(courses.map((c) => c.category).filter((cat): cat is string => Boolean(cat)))
  );

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.category && c.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === "ALL" || c.category === categoryFilter;
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalCourses = courses.length;
  const activeCourses = courses.filter((c) => c.status === "ACTIVE").length;
  const totalEnrolled = courses.reduce((acc, c) => acc + (c._count?.admissions || 0), 0);
  const totalModules = courses.reduce((acc, c) => acc + (c.modules?.length || 0), 0);

  const getModeBadge = (mode?: string) => {
    switch (mode) {
      case "HYBRID":
        return <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">Hybrid</Badge>;
      case "OFFLINE":
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">Offline</Badge>;
      case "ONLINE":
        return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">Online</Badge>;
      default:
        return <Badge variant="outline">{mode || "HYBRID"}</Badge>;
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this course?")) {
      await deleteCourse(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Course Directory</h2>
          <p className="text-sm text-text-secondary">
            Manage academy courses, learning tracks, and active curriculums.
          </p>
        </div>

        <Button
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-sm transition-colors"
          onClick={() => navigate("/admin/courses/add")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Course
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Courses</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalCourses}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Active Courses</p>
              <h3 className="text-2xl font-bold text-text-primary">{activeCourses}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Enrolled</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalEnrolled}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Modules</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalModules}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls & Search Filter */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search by course name, code, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-bg-secondary border-border/50"
              />
            </div>

            {/* Filter Controls & Toggle */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Selector */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              {/* View Mode Toggle Buttons */}
              <div className="flex items-center border border-border/50 rounded-md overflow-hidden bg-bg-secondary">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-10 px-3 rounded-none ${viewMode === "grid" ? "bg-accent-primary/10 text-[#1769AA]" : "text-text-secondary"}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-10 px-3 rounded-none ${viewMode === "table" ? "bg-accent-primary/10 text-[#1769AA]" : "text-text-secondary"}`}
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center text-text-muted">
              <Loader2 className="h-8 w-8 animate-spin text-[#1769AA]" />
              <span className="ml-2 text-sm font-medium">Loading courses...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-rose-500 font-medium text-sm">
              {error}
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <Card key={course.id} className="border-border/50 bg-white hover:border-[#1769AA]/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <Badge variant="outline" className="font-mono text-xs text-[#1769AA] border-blue-200 bg-blue-50">
                          {course.code}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Badge variant={course.status === "ACTIVE" ? "success" : "secondary"}>
                            {course.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-text-secondary">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border-border shadow-md">
                              <DropdownMenuLabel>Course Options</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate("/admin/courses/curriculum")}>
                                <Layers className="mr-2 h-4 w-4" /> View Curriculum
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate("/admin/courses/batches")}>
                                <GraduationCap className="mr-2 h-4 w-4" /> View Batches
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(course.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Course
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CardTitle className="text-base font-bold text-text-primary line-clamp-1">
                        {course.name}
                      </CardTitle>
                      <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                        {course.description || "No description provided."}
                      </p>
                    </CardHeader>

                    <CardContent className="p-5 pt-0 space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-text-muted" />
                          <span>{course.duration || course.durationMonths || 6} Months ({course.totalHours || 100} hrs)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-text-muted" />
                          <span>{course.modules?.length || 0} Modules</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-text-muted" />
                          <span>{course._count?.admissions || 0} Students</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {getModeBadge(course.mode)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => navigate("/admin/courses/curriculum")}
                        >
                          <BookOpen className="mr-1.5 h-3.5 w-3.5 text-[#1769AA]" />
                          Curriculum
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full text-xs bg-[#1769AA] hover:bg-[#F39A16] text-white"
                          onClick={() => navigate("/admin/courses/batches")}
                        >
                          <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                          Batches
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-text-muted">
                  <BookOpen className="mx-auto h-12 w-12 opacity-20 mb-3" />
                  <p className="text-base font-medium">No courses found</p>
                  <p className="text-xs text-text-secondary mt-1">Try adjusting your search query or category filter.</p>
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-md border border-border/50 overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-bg-secondary/50">
                  <TableRow>
                    <TableHead className="font-semibold text-text-primary">Course Code & Title</TableHead>
                    <TableHead className="font-semibold text-text-primary">Category</TableHead>
                    <TableHead className="font-semibold text-text-primary">Mode</TableHead>
                    <TableHead className="font-semibold text-text-primary">Duration</TableHead>
                    <TableHead className="font-semibold text-text-primary">Modules</TableHead>
                    <TableHead className="font-semibold text-text-primary">Enrolled</TableHead>
                    <TableHead className="font-semibold text-text-primary">Status</TableHead>
                    <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.length > 0 ? (
                    filteredCourses.map((course) => (
                      <TableRow key={course.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <div>
                            <span className="font-mono text-xs font-bold text-[#1769AA] block">
                              {course.code}
                            </span>
                            <span className="font-medium text-text-primary text-sm">
                              {course.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-text-secondary">{course.category || "General"}</TableCell>
                        <TableCell>{getModeBadge(course.mode)}</TableCell>
                        <TableCell className="text-xs text-text-secondary">
                          {course.duration || course.durationMonths || 6} Mos ({course.totalHours || 100} hrs)
                        </TableCell>
                        <TableCell className="text-xs text-text-secondary">{course.modules?.length || 0}</TableCell>
                        <TableCell className="text-xs font-semibold text-text-primary">{course._count?.admissions || 0}</TableCell>
                        <TableCell>
                          <Badge variant={course.status === "ACTIVE" ? "success" : "secondary"}>
                            {course.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 text-text-secondary">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border-border shadow-md">
                              <DropdownMenuItem onClick={() => navigate("/admin/courses/curriculum")}>
                                <Layers className="mr-2 h-4 w-4" /> Curriculum
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate("/admin/courses/batches")}>
                                <GraduationCap className="mr-2 h-4 w-4" /> Batches
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(course.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-text-muted">
                        No courses found matching criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
