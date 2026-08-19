import React from "react";
import { FileText, CheckCircle2, Clock, Upload, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAssignments } from "@/hooks/useAssignments";

export const StudentAssignments: React.FC = () => {
  const { data: assignmentsResponse, isLoading } = useAssignments({});
  const assignments = assignmentsResponse?.data || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FileText className="h-6 w-6 text-[#1769AA]" />
          My Assignments
        </h1>
        <p className="text-sm text-text-secondary mt-1">View, submit, and track your assignment progress</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-[#1769AA]" />
            </div>
            <div>
              <p className="text-xl font-bold">{assignments.length}</p>
              <p className="text-xs text-text-secondary">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {assignments.filter((a: any) => a.status === "ACTIVE").length}
              </p>
              <p className="text-xs text-text-secondary">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold">0</p>
              <p className="text-xs text-text-secondary">Submitted</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-text-secondary">Loading assignments...</div>
      ) : assignments.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-text-secondary font-medium">No assignments yet</p>
            <p className="text-xs text-text-secondary mt-1">Your faculty will assign work that appears here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment: any) => {
            const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
            return (
              <Card key={assignment.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-text-primary">{assignment.title}</h3>
                        <Badge className={`text-xs border ${
                          isOverdue ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {isOverdue ? "Overdue" : "Pending"}
                        </Badge>
                      </div>
                      {assignment.description && (
                        <p className="text-sm text-text-secondary mb-2">{assignment.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-text-secondary">
                        <span>Session: {assignment.classSession?.title || "—"}</span>
                        {assignment.dueDate && (
                          <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
                            Due: {new Date(assignment.dueDate).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric"
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" className="gap-1 bg-[#1769AA] hover:bg-[#F39A16] text-white ml-4">
                      <Upload size={14} /> Submit
                    </Button>
                  </div>

                  {/* If graded */}
                  {assignment.submissions?.[0]?.marks !== undefined && assignment.submissions?.[0]?.marks !== null && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">
                          Marks: {assignment.submissions[0].marks}
                        </span>
                      </div>
                      {assignment.submissions[0].feedback && (
                        <p className="text-sm text-green-800 mt-1">{assignment.submissions[0].feedback}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
