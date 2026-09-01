import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Loader2, AlertCircle } from "lucide-react";
import { coursesApi } from "@/services/courses.api";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const CourseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["courses", id],
    queryFn: () => coursesApi.getById(id!),
    enabled: !!id,
  });

  const course = data?.data;

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#1769AA]" /></div>;
  if (isError || !course) return <div className="text-center py-20 text-red-600"><AlertCircle className="w-8 h-8 mx-auto mb-2" />Failed to load course.<Button variant="link" onClick={() => refetch()}>Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">{course.name}</h2>
          <p className="text-sm text-text-secondary font-mono">{course.code}</p>
        </div>
        <Badge variant="outline">{course.status}</Badge>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="text-text-secondary block">Category</span>{course.category || "—"}</div>
          <div><span className="text-text-secondary block">Duration</span>{course.durationMonths ? `${course.durationMonths} months` : course.duration || "—"}</div>
          <div><span className="text-text-secondary block">Mode</span>{course.mode || "—"}</div>
          <div><span className="text-text-secondary block">Level</span>{course.level || "—"}</div>
          <div><span className="text-text-secondary block">Total Hours</span>{course.totalHours || "—"}</div>
          <div><span className="text-text-secondary block">Fee</span>{course.fee ? `₹${course.fee.toLocaleString("en-IN")}` : "—"}</div>
          <div className="md:col-span-2"><span className="text-text-secondary block">Description</span>{course.description || "No description."}</div>
          <div><span className="text-text-secondary block">Batches</span>{course._count?.batches ?? 0}</div>
          <div><span className="text-text-secondary block">Admissions</span>{course._count?.admissions ?? 0}</div>
        </CardContent>
      </Card>

      {course.modules && course.modules.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Modules ({course.modules.length})</h3>
            <ul className="space-y-2">
              {course.modules.map((m: { id: string; name: string; sequence: number; duration?: number }) => (
                <li key={m.id} className="flex justify-between text-sm border-b pb-2">
                  <span>{m.sequence}. {m.name}</span>
                  <span className="text-text-secondary">{m.duration ? `${m.duration}h` : ""}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Link to={ROUTES.ADMIN.COURSES.ALL}>
        <Button variant="outline">Back to Courses</Button>
      </Link>
    </div>
  );
};
