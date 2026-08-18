import React from "react";
import { useAuthStore } from "../../store/auth.store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Filter, Plus } from "lucide-react";

export const StudentAttendance: React.FC = () => {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] || "Student";

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Howdy {firstName}!</h1>
          <p className="text-text-secondary mt-1">See all your Insights here</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-text-secondary h-10 px-4 shadow-sm border-border/50 bg-white hover:bg-slate-50">
            <Calendar className="mr-2 h-4 w-4" /> April 1 - April 30
          </Button>
          <Button variant="outline" className="text-text-secondary h-10 px-4 shadow-sm border-border/50 bg-white hover:bg-slate-50">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button className="bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-sm h-10 px-6">
            <Plus className="mr-1.5 h-4 w-4" /> Attend class
          </Button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <p className="text-text-secondary font-medium mb-4">Total classes</p>
            <h3 className="text-4xl font-bold text-text-primary mb-3">0</h3>
            <p className="text-muted-foreground text-sm font-medium flex items-center gap-1">
              Scheduled Sessions
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <p className="text-text-secondary font-medium mb-4">Attended classes</p>
            <h3 className="text-4xl font-bold text-text-primary mb-3">0</h3>
            <p className="text-emerald-500 text-sm font-medium flex items-center gap-1">
              Verified Attendance
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <p className="text-text-secondary font-medium mb-4">Total hours</p>
            <h3 className="text-4xl font-bold text-text-primary mb-3">0 hrs</h3>
            <p className="text-muted-foreground text-sm font-medium flex items-center gap-1">
              Class Time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classes Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[#ef4444] rounded-full"></div>
            <h2 className="text-xl font-medium text-text-primary">Classes</h2>
          </div>
        </div>

        <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground">
          No class attendance sessions recorded yet.
        </div>
      </div>
    </div>
  );
};
