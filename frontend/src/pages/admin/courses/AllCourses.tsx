import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Search,
  Layers,
  Users,
  Clock,
  MoreVertical,
  Trash2,
  Pencil,
  LayoutGrid,
  List,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { useCourses } from "../../../hooks/useCourses";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranchScopeForLists } from "@/hooks/useBranchScopeForLists";
import { getPortalBasePath } from "@/utils/portal-path";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, MetricGrid, FilterToolbar } from "@/components/layout";
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
import type { CourseData } from "@/services/courses.api";

const courseBranchLabels = (course: CourseData) => {
  const fromLinks =
    course.courseBranches
      ?.map((cb) => cb.branch?.name || cb.branch?.code)
      .filter(Boolean) ?? [];
  if (fromLinks.length > 0) return fromLinks as string[];
  return [];
};

const BranchChips = ({ labels, max = 2 }: { labels: string[]; max?: number }) => {
  if (labels.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const shown = labels.slice(0, max);
  const rest = labels.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((label) => (
        <Badge key={label} variant="outline" className="text-[10px] font-medium px-1.5 py-0">
          {label}
        </Badge>
      ))}
      {rest > 0 ? (
        <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0">
          +{rest}
        </Badge>
      ) : null}
    </div>
  );
};

export const AllCourses: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const coursesBasePath = location.pathname.startsWith("/center")
    ? "/center/courses"
    : "/admin/courses";
  const { canEditItem } = usePermissions();
  const canEditCourses = canEditItem("courses.all");
  const {
    branches,
    allowAllBranches,
    showBranchSelector,
    selectedBranchId,
    branchIdForQuery,
    setSelectedBranchId,
  } = useBranchScopeForLists();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const { courses, loading, error, deleteCourse } = useCourses({
    search: searchTerm,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    category: categoryFilter !== "ALL" ? categoryFilter : undefined,
    branchId: branchIdForQuery,
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

  const metrics = [
    { label: "Total Courses", value: totalCourses },
    { label: "Active Courses", value: activeCourses },
    { label: "Total Enrolled", value: totalEnrolled },
    { label: "Total Modules", value: totalModules },
  ];

  const getModeBadge = (mode?: string) => {
    switch (mode) {
      case "HYBRID":
        return (
          <Badge
            variant="secondary"
            className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/40"
          >
            Hybrid
          </Badge>
        );
      case "OFFLINE":
        return (
          <Badge
            variant="secondary"
            className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/40"
          >
            Offline
          </Badge>
        );
      case "ONLINE":
        return (
          <Badge
            variant="secondary"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40"
          >
            Online
          </Badge>
        );
      default:
        return <Badge variant="outline">{mode || "HYBRID"}</Badge>;
    }
  };

  const handleEditCourse = (course: (typeof courses)[number]) => {
    navigate(`${coursesBasePath}/${course.id}/edit`, { state: { course } });
  };

  const handleOpenCurriculum = (courseId: string) => {
    navigate(`${coursesBasePath}/curriculum?courseId=${courseId}`);
  };

  const handleOpenBatches = (courseId?: string) => {
    const batchesBase = `${getPortalBasePath(location.pathname)}/batches`;
    navigate(courseId ? `${batchesBase}?courseId=${courseId}` : batchesBase);
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this course? It will be deactivated and hidden from active lists."
      )
    ) {
      try {
        await deleteCourse(id);
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || "Failed to delete course");
      }
    }
  };

  const courseMenuItems = (course: (typeof courses)[number]) => (
    <>
      {canEditCourses && (
        <DropdownMenuItem
          onClick={() => handleEditCourse(course)}
          className="cursor-pointer text-xs font-medium gap-2"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit Course
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onClick={() => handleOpenCurriculum(course.id)}
        className="cursor-pointer text-xs font-medium gap-2"
      >
        <Layers className="h-3.5 w-3.5" /> View Curriculum
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => handleOpenBatches(course.id)}
        className="cursor-pointer text-xs font-medium gap-2"
      >
        <GraduationCap className="h-3.5 w-3.5" /> View Batches
      </DropdownMenuItem>
      {canEditCourses && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-rose-600 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer text-xs font-medium gap-2"
            onClick={() => handleDelete(course.id)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Course
          </DropdownMenuItem>
        </>
      )}
    </>
  );

  const emptyState = (
    <div className="py-16 text-center">
      <BookOpen className="mx-auto h-9 w-9 text-muted-foreground/40 mb-2" />
      <p className="text-sm font-medium text-foreground">No courses found</p>
      <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search or filters.</p>
    </div>
  );

  return (
    <PageContainer className="animate-in fade-in duration-300">
      <PageHeader
        title="Course Directory"
        description="Academy courses and learning tracks."
        actions={
          <PermissionGate itemKey="courses.all" mode="write">
            <Button
              size="sm"
              className="rounded-lg"
              onClick={() => navigate(`${coursesBasePath}/add`)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Course
            </Button>
          </PermissionGate>
        }
      />

      <MetricGrid columns="grid-cols-2 sm:grid-cols-4" density="compact">
        {metrics.map((kpi) => (
          <Card
            key={kpi.label}
            size="compact"
            className="border border-border bg-card shadow-none rounded-lg"
          >
            <CardContent size="compact">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </p>
              <h3 className="text-xl font-semibold text-foreground mt-0.5 tabular-nums">
                {kpi.value}
              </h3>
            </CardContent>
          </Card>
        ))}
      </MetricGrid>

      <FilterToolbar className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or category…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm rounded-lg"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 text-sm border border-border rounded-lg px-3 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-sm border border-border rounded-lg px-3 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          {showBranchSelector && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-9 text-sm border border-border rounded-lg px-3 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {allowAllBranches && <option value="ALL">All branches</option>}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}

          <div className="inline-flex items-center rounded-lg border border-border p-0.5 h-9">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Grid view"
              className={`h-full px-2.5 rounded-md ${
                viewMode === "grid"
                  ? "bg-primary text-white hover:bg-primary hover:text-white"
                  : "text-muted-foreground"
              }`}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Table view"
              className={`h-full px-2.5 rounded-md ${
                viewMode === "table"
                  ? "bg-primary text-white hover:bg-primary hover:text-white"
                  : "text-muted-foreground"
              }`}
              onClick={() => setViewMode("table")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </FilterToolbar>

      {loading ? (
        <div className="py-16 flex justify-center items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading courses…</span>
        </div>
      ) : error ? (
        <div className="py-12 text-center text-rose-600 text-sm">{error}</div>
      ) : viewMode === "grid" ? (
        filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredCourses.map((course) => {
              const durationMonths = course.duration || course.durationMonths || 6;
              const totalHours = course.totalHours || 100;
              const moduleCount = course.modules?.length || 0;
              const studentCount = course._count?.admissions || 0;
              const branches = courseBranchLabels(course);

              return (
                <Card
                  key={course.id}
                  className="border border-border bg-card shadow-none rounded-lg overflow-hidden flex flex-col hover:border-primary/40 transition-colors"
                >
                  <div className="flex flex-col flex-1 p-4 gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {course.code}
                        </Badge>
                        <Badge variant={course.status === "ACTIVE" ? "success" : "secondary"}>
                          {course.status}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-lg">
                          <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                            Course Options
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {courseMenuItems(course)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
                        {course.name}
                      </h3>
                      {course.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      ) : null}
                      {course.category ? (
                        <p className="text-xs text-muted-foreground">{course.category}</p>
                      ) : null}
                      {branches.length > 0 ? <BranchChips labels={branches} /> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {durationMonths} mo · {totalHours}h
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {moduleCount} modules
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {studentCount} enrolled
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        ₹{(course.fee ?? 0).toLocaleString()}
                      </p>
                      {getModeBadge(course.mode)}
                    </div>

                    <div className="flex items-center gap-2 mt-auto pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs rounded-lg"
                        onClick={() => handleOpenCurriculum(course.id)}
                      >
                        <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                        Curriculum
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs rounded-lg"
                        onClick={() => handleOpenBatches(course.id)}
                      >
                        <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                        Batches
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-lg">{emptyState}</div>
        )
      ) : (
        <Card className="border border-border shadow-none rounded-lg overflow-hidden">
          <div className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Branches</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead className="text-center">Modules</TableHead>
                  <TableHead className="text-center">Enrolled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-primary">{course.code}</p>
                          <p className="text-sm font-medium text-foreground">{course.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{course.category || "—"}</TableCell>
                      <TableCell>
                        <BranchChips labels={courseBranchLabels(course)} max={2} />
                      </TableCell>
                      <TableCell>{getModeBadge(course.mode)}</TableCell>
                      <TableCell className="text-sm tabular-nums whitespace-nowrap">
                        {course.duration || course.durationMonths || 6} mo ·{" "}
                        {course.totalHours || 100}h
                      </TableCell>
                      <TableCell className="text-sm font-medium tabular-nums whitespace-nowrap">
                        ₹{(course.fee ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">
                        {course.modules?.length || 0}
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">
                        {course._count?.admissions || 0}
                      </TableCell>
                      <TableCell>
                        <Badge variant={course.status === "ACTIVE" ? "success" : "secondary"}>
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-lg">
                            {courseMenuItems(course)}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-28 text-center text-sm text-muted-foreground">
                      No courses found matching criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </PageContainer>
  );
};
