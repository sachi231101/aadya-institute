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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Course Directory</h2>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Manage academy courses, learning tracks, and active curriculums.
          </p>
        </div>

        <Button
          className="bg-primary hover:bg-primary/90 text-white shadow-xs transition-all text-xs font-bold h-10 px-4 rounded-xl cursor-pointer"
          onClick={() => navigate("/admin/courses/add")}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add New Course
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 border border-blue-100 dark:border-sky-900/40">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Courses</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{totalCourses}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Courses</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{activeCourses}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Enrolled</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{totalEnrolled}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Modules</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{totalModules}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls & Search Filter */}
      <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by course name, code, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 bg-muted/30 border-border text-foreground rounded-xl placeholder:text-muted-foreground focus:bg-background"
              />
            </div>

            {/* Filter Controls & Toggle */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Selector */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
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
                className="h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              {/* View Mode Toggle Buttons */}
              <div className="flex items-center border border-border rounded-xl overflow-hidden bg-muted/30 p-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 px-3 rounded-lg cursor-pointer ${viewMode === "grid" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 px-3 rounded-lg cursor-pointer ${viewMode === "table" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-xs font-bold">Loading courses...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-rose-500 font-bold text-xs">
              {error}
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <Card key={course.id} className="border border-border bg-card hover:border-primary/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <Badge variant="outline" className="font-mono text-xs text-primary border-primary/20 bg-primary/10">
                          {course.code}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Badge variant={course.status === "ACTIVE" ? "success" : "secondary"}>
                            {course.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border shadow-lg rounded-xl text-foreground">
                              <DropdownMenuLabel className="text-xs font-bold">Course Options</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-border" />
                              <DropdownMenuItem onClick={() => navigate("/admin/courses/curriculum")} className="cursor-pointer text-xs font-bold">
                                <Layers className="mr-2 h-4 w-4" /> View Curriculum
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate("/admin/courses/batches")} className="cursor-pointer text-xs font-bold">
                                <GraduationCap className="mr-2 h-4 w-4" /> View Batches
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-border" />
                              <DropdownMenuItem
                                className="text-rose-500 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer text-xs font-bold"
                                onClick={() => handleDelete(course.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Course
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CardTitle className="text-base font-black text-foreground line-clamp-1">
                        {course.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-medium">
                        {course.description || "No description provided."}
                      </p>
                    </CardHeader>

                    <CardContent className="p-5 pt-0 space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-xs text-foreground pt-3 border-t border-border/70">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{course.duration || course.durationMonths || 6} Mos ({course.totalHours || 100} hrs)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{course.modules?.length || 0} Modules</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
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
                          className="w-full text-xs font-bold rounded-xl border-border bg-card text-foreground hover:bg-muted/40 cursor-pointer"
                          onClick={() => navigate("/admin/courses/curriculum")}
                        >
                          <BookOpen className="mr-1.5 h-3.5 w-3.5 text-primary" />
                          Curriculum
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-white cursor-pointer"
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
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  <BookOpen className="mx-auto h-12 w-12 opacity-20 mb-3" />
                  <p className="text-base font-bold text-foreground">No courses found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query or category filter.</p>
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-2xs">
              <Table>
                <TableHeader className="bg-muted/50 border-b border-border">
                  <TableRow className="text-xs">
                    <TableHead className="font-bold text-foreground pl-6">Course Code & Title</TableHead>
                    <TableHead className="font-bold text-foreground">Category</TableHead>
                    <TableHead className="font-bold text-foreground">Mode</TableHead>
                    <TableHead className="font-bold text-foreground">Duration</TableHead>
                    <TableHead className="font-bold text-foreground">Modules</TableHead>
                    <TableHead className="font-bold text-foreground">Enrolled</TableHead>
                    <TableHead className="font-bold text-foreground">Status</TableHead>
                    <TableHead className="text-right font-bold text-foreground pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.length > 0 ? (
                    filteredCourses.map((course) => (
                      <TableRow key={course.id} className="hover:bg-muted/40 transition-colors border-b border-border/70 text-xs">
                        <TableCell className="pl-6 py-3.5">
                          <div>
                            <span className="font-mono text-xs font-bold text-primary block">
                              {course.code}
                            </span>
                            <span className="font-bold text-foreground text-sm">
                              {course.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium py-3.5">{course.category || "General"}</TableCell>
                        <TableCell className="py-3.5">{getModeBadge(course.mode)}</TableCell>
                        <TableCell className="text-xs text-foreground py-3.5">
                          {course.duration || course.durationMonths || 6} Mos ({course.totalHours || 100} hrs)
                        </TableCell>
                        <TableCell className="text-xs text-foreground py-3.5">{course.modules?.length || 0}</TableCell>
                        <TableCell className="text-xs font-bold text-foreground py-3.5">{course._count?.admissions || 0}</TableCell>
                        <TableCell className="py-3.5">
                          <Badge variant={course.status === "ACTIVE" ? "success" : "secondary"}>
                            {course.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6 py-3.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border shadow-lg rounded-xl text-foreground">
                              <DropdownMenuItem onClick={() => navigate("/admin/courses/curriculum")} className="cursor-pointer text-xs font-bold">
                                <Layers className="mr-2 h-4 w-4" /> Curriculum
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate("/admin/courses/batches")} className="cursor-pointer text-xs font-bold">
                                <GraduationCap className="mr-2 h-4 w-4" /> Batches
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-border" />
                              <DropdownMenuItem
                                className="text-rose-500 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer text-xs font-bold"
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
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-xs font-medium">
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
