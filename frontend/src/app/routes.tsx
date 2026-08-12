import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Login } from "../pages/auth/Login";

import { AdminLayout } from "../layouts/AdminLayout";
import { CenterLayout } from "../layouts/CenterLayout";
import { CounselorLayout } from "../layouts/CounselorLayout";
import { FacultyLayout } from "../layouts/FacultyLayout";
import { StudentLayout } from "../layouts/StudentLayout";

// Admin Dashboard
import { AdminDashboard } from "../pages/admin/Dashboard";

// Students
import { AllStudents } from "../pages/admin/students/AllStudents";
import { AddStudent } from "../pages/admin/students/AddStudent";
import { StudentDetails } from "../pages/admin/students/StudentDetails";
import { EditStudent } from "../pages/admin/students/EditStudent";
import { StudentAttendance } from "../pages/admin/students/StudentAttendance";
import { StudentPerformance } from "../pages/admin/students/StudentPerformance";

// Faculty
import { AllFaculty } from "../pages/admin/faculty/AllFaculty";
import { AddFaculty } from "../pages/admin/faculty/AddFaculty";
import { FacultyDetails } from "../pages/admin/faculty/FacultyDetails";
import { FacultyCourses } from "../pages/admin/faculty/FacultyCourses";
import { FacultyAttendance } from "../pages/admin/faculty/FacultyAttendance";

// Courses
import { AllCourses } from "../pages/admin/courses/AllCourses";
import { AddCourse } from "../pages/admin/courses/AddCourse";
import { Batches } from "../pages/admin/courses/Batches";
import { Curriculum } from "../pages/admin/courses/Curriculum";

// Administration
import { AdminPanel } from "../pages/admin/administration/AdminPanel";
import { ViewAdmin } from "../pages/admin/administration/ViewAdmin";
import { EditAdmin } from "../pages/admin/administration/EditAdmin";
import { AddAdmin } from "../pages/admin/administration/AddAdmin";

// Admissions
import { Enquiries } from "../pages/admin/admissions/Enquiries";
import { Applications } from "../pages/admin/admissions/Applications";
import { AllAdmissions } from "../pages/admin/admissions/AllAdmissions";

// Counsellor
import { CounsellorOverview } from "../pages/admin/counselor/CounsellorOverview";
import { CounsellorBatches } from "../pages/admin/counselor/CounsellorBatches";
import { AssignStudents } from "../pages/admin/counselor/AssignStudents";
import { AssignFaculty } from "../pages/admin/counselor/AssignFaculty";

// Schedule
import { Classes } from "../pages/admin/schedule/Classes";
import { Timetable } from "../pages/admin/schedule/Timetable";
import { UpcomingClasses } from "../pages/admin/schedule/UpcomingClasses";

// Fees
import { Payments } from "../pages/admin/fees/Payments";
import { PendingFees } from "../pages/admin/fees/PendingFees";
import { FeeReports } from "../pages/admin/fees/FeeReports";

// Reports
import { StudentReports } from "../pages/admin/reports/StudentReports";
import { FacultyReports } from "../pages/admin/reports/FacultyReports";
import { CourseReports } from "../pages/admin/reports/CourseReports";
import { FinancialReports } from "../pages/admin/reports/FinancialReports";

// Settings
import { Settings } from "../pages/admin/settings/Settings";

// Other roles dashboards
import { CenterDashboard } from "../pages/center/Dashboard";
import { CounselorDashboard } from "../pages/counselor/Dashboard";
import { FacultyDashboard } from "../pages/faculty/Dashboard";
import { StudentDashboard } from "../pages/student/Dashboard";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Administration Routes */}
      <Route path="/administration" element={<AdminLayout />}>
        <Route index element={<AdminPanel />} />
        <Route path="admins/new" element={<AddAdmin />} />
        <Route path="admins/:id" element={<ViewAdmin />} />
        <Route path="admins/:id/edit" element={<EditAdmin />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />

        {/* Students */}
        <Route path="students">
          <Route path="all" element={<AllStudents />} />
          <Route path="add" element={<AddStudent />} />
          <Route path=":id" element={<StudentDetails />} />
          <Route path=":id/edit" element={<EditStudent />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="performance" element={<StudentPerformance />} />
        </Route>

        {/* Faculty */}
        <Route path="faculty">
          <Route path="all" element={<AllFaculty />} />
          <Route path="add" element={<AddFaculty />} />
          <Route path=":id" element={<FacultyDetails />} />
          <Route path="courses" element={<FacultyCourses />} />
          <Route path="attendance" element={<FacultyAttendance />} />
        </Route>

        {/* Courses */}
        <Route path="courses">
          <Route path="all" element={<AllCourses />} />
          <Route path="add" element={<AddCourse />} />
          <Route path="batches" element={<Batches />} />
          <Route path="curriculum" element={<Curriculum />} />
        </Route>

        {/* Admissions */}
        <Route path="admissions">
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="applications" element={<Applications />} />
          <Route path="all" element={<AllAdmissions />} />
        </Route>

        {/* Counsellor */}
        <Route path="counselor">
          <Route path="overview" element={<CounsellorOverview />} />
          <Route path="batches" element={<CounsellorBatches />} />
          <Route path="assign-students" element={<AssignStudents />} />
          <Route path="assign-faculty" element={<AssignFaculty />} />
        </Route>

        {/* Schedule */}
        <Route path="schedule">
          <Route path="classes" element={<Classes />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="upcoming" element={<UpcomingClasses />} />
        </Route>

        {/* Fees */}
        <Route path="fees">
          <Route path="payments" element={<Payments />} />
          <Route path="pending" element={<PendingFees />} />
          <Route path="reports" element={<FeeReports />} />
        </Route>

        {/* Reports */}
        <Route path="reports">
          <Route path="students" element={<StudentReports />} />
          <Route path="faculty" element={<FacultyReports />} />
          <Route path="courses" element={<CourseReports />} />
          <Route path="financial" element={<FinancialReports />} />
        </Route>

        {/* Settings */}
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Center Manager Routes */}
      <Route path="/center" element={<CenterLayout />}>
        <Route path="dashboard" element={<CenterDashboard />} />
      </Route>

      {/* Counselor Routes */}
      <Route path="/counselor" element={<CounselorLayout />}>
        <Route path="dashboard" element={<CounselorDashboard />} />
      </Route>

      {/* Faculty Routes */}
      <Route path="/faculty" element={<FacultyLayout />}>
        <Route path="dashboard" element={<FacultyDashboard />} />
      </Route>

      {/* Student Routes */}
      <Route path="/student" element={<StudentLayout />}>
        <Route path="dashboard" element={<StudentDashboard />} />
      </Route>

      {/* Default Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
