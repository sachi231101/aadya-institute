import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type CourseOption = { id: string; name: string };

interface ApplicationsToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  feeFilter: string;
  onFeeFilterChange: (value: string) => void;
  courseFilter: string;
  onCourseFilterChange: (value: string) => void;
  courses: CourseOption[];
  onClear: () => void;
}

export function ApplicationsToolbar({
  searchTerm,
  onSearchChange,
  feeFilter,
  onFeeFilterChange,
  courseFilter,
  onCourseFilterChange,
  courses,
  onClear,
}: ApplicationsToolbarProps) {
  const hasFilters =
    searchTerm || feeFilter !== "ALL" || courseFilter !== "ALL";

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, app no, phone..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-8 text-xs rounded-lg"
          />
        </div>
        <select
          value={feeFilter}
          onChange={(e) => onFeeFilterChange(e.target.value)}
          className="h-9 px-3 text-xs font-medium border border-border rounded-lg bg-background"
        >
          <option value="ALL">All fees</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Not paid</option>
        </select>
        <select
          value={courseFilter}
          onChange={(e) => onCourseFilterChange(e.target.value)}
          className="h-9 px-3 text-xs font-medium border border-border rounded-lg bg-background"
        >
          <option value="ALL">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-9 text-xs text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
