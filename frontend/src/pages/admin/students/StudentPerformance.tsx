import React, { useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { 
  GraduationCap, 
  TrendingUp, 
  BookOpen, 
  CheckCircle,
  User
} from "lucide-react";
import { useStudentStore } from "../../../store/student.store";
import { usePerformanceStore } from "../../../store/performance.store";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const StudentPerformance: React.FC = () => {
  const { students } = useStudentStore();
  const { getPerformanceForStudent } = usePerformanceStore();
  
  // Default to the first student if available
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || "");

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const performance = getPerformanceForStudent(selectedStudentId);

  // Chart Colors
  const COLORS = ['#2563eb', '#16a34a', '#eab308'];
  const PIE_COLORS = ['#22c55e', '#ef4444']; // Green for present, Red for absent

  // Calculate average score
  const avgScore = performance.testScores.length 
    ? Math.round(performance.testScores.reduce((acc, curr) => acc + curr.score, 0) / performance.testScores.length)
    : 0;

  const attendanceData = [
    { name: 'Present', value: performance.overallAttendancePercent },
    { name: 'Absent', value: 100 - performance.overallAttendancePercent },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Student Performance</h2>
          <p className="text-sm text-text-secondary">
            View detailed academic analytics and progress for individual students.
          </p>
        </div>
        
        <div className="w-full sm:w-72">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <select 
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-border/50 bg-bg-secondary pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="" disabled>Select a student...</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.studentCode})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedStudent ? (
        <Card className="border-border/50 bg-bg-primary py-12 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-text-muted mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Student Selected</h3>
          <p className="text-text-secondary">Please select a student from the dropdown above to view their performance.</p>
        </Card>
      ) : (
        <>
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border/50 bg-bg-primary shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary">Overall Attendance</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-text-primary">{performance.overallAttendancePercent}%</div>
                <p className="text-xs text-text-muted mt-1">For the current semester</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-bg-primary shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary">Average Test Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-text-primary">{avgScore}%</div>
                <p className="text-xs text-text-muted mt-1">Across all recent assessments</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-bg-primary shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary">Enrolled Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-text-primary">{performance.enrolledCourses.length}</div>
                <p className="text-xs text-text-muted mt-1">Active courses this term</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart for Test Scores */}
            <Card className="border-border/50 bg-bg-primary shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg text-text-primary">Assessment Results</CardTitle>
                <CardDescription>Marks obtained in recent tests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={performance.testScores}
                      margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                      <XAxis dataKey="testName" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        cursor={{fill: 'var(--bg-tertiary)', opacity: 0.4}}
                        contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {performance.testScores.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart for Attendance */}
            <Card className="border-border/50 bg-bg-primary shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-text-primary">Attendance Distribution</CardTitle>
                <CardDescription>Present vs Absent ratio</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {attendanceData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        formatter={(value) => [`${value}%`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 mt-4 w-full justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-text-secondary">Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm text-text-secondary">Absent</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Courses Progress Section */}
          <Card className="border-border/50 bg-bg-primary shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-text-primary">Enrolled Courses & Progress</CardTitle>
              <CardDescription>Track syllabus completion for active subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {performance.enrolledCourses.map((course) => (
                  <div key={course.courseId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-text-primary">{course.courseName}</span>
                        <span className="ml-2 text-xs text-text-muted">({course.courseId})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-text-secondary">
                          {course.completionPercentage}%
                        </span>
                        {course.grade && (
                          <span className="px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary text-xs font-bold">
                            Grade: {course.grade}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          course.completionPercentage === 100 
                            ? "bg-green-500" 
                            : course.completionPercentage > 50 
                              ? "bg-blue-500" 
                              : "bg-yellow-500"
                        }`}
                        style={{ width: `${course.completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
