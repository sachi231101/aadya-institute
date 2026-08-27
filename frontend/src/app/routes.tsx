import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Login } from "../pages/auth/Login";

import { AdminLayout } from "../layouts/AdminLayout";
import { CenterLayout } from "../layouts/CenterLayout";
import { CounselorLayout } from "../layouts/CounselorLayout";
import { FacultyLayout } from "../layouts/FacultyLayout";
import { StudentLayout } from "../layouts/StudentLayout";

// Admin Dashboard & AI
import { AdminDashboard } from "../pages/admin/Dashboard";
import { AiHome } from "../pages/admin/ai/AiHome";
import { AskMe } from "../pages/admin/ai/AskMe";
import { BranchPerformance } from "../pages/admin/branch/BranchPerformance";
import { BranchRevenueDetails } from "../pages/admin/branch/BranchRevenueDetails";

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
import { FacultyTimetable } from "../pages/admin/faculty/FacultyTimetable";
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
import { DirectAdmissionEntry } from "../pages/admin/admissions/DirectAdmissionEntry";

// Counsellor
import { AllCounsellors } from "../pages/admin/counselor/AllCounsellors";
import { CounsellorOverview } from "../pages/admin/counselor/CounsellorOverview";
import { CounsellorBatches } from "../pages/admin/counselor/CounsellorBatches";
import { AssignStudents } from "../pages/admin/counselor/AssignStudents";
import { AssignFaculty } from "../pages/admin/counselor/AssignFaculty";

// Schedule
import { Classes } from "../pages/admin/schedule/Classes";

// Examinations & Proctoring
import { ExamManagement } from "../pages/admin/exams/ExamManagement";
import { CreateExam } from "../pages/admin/exams/CreateExam";
import { ExamDetails } from "../pages/admin/exams/ExamDetails";
import { EditExam } from "../pages/admin/exams/EditExam";
import { QuestionBank } from "../pages/admin/exams/QuestionBank";
import { CreateQuestion } from "../pages/admin/exams/CreateQuestion";
import { ExamAttempts } from "../pages/admin/exams/ExamAttempts";
import { AttemptProctoringDetails } from "../pages/admin/exams/AttemptProctoringDetails";
import { MyExams } from "../pages/student/exams/MyExams";
import { ExamConsentScreen } from "../pages/student/exams/ExamConsentScreen";
import { TakeExam } from "../pages/student/exams/TakeExam";
import { ExamResultScreen } from "../pages/student/exams/ExamResultScreen";
import { Timetable } from "../pages/admin/schedule/Timetable";

// Fees
import { Payments } from "../pages/admin/fees/Payments";
import { PendingFees } from "../pages/admin/fees/PendingFees";
import { FeeReports } from "../pages/admin/fees/FeeReports";

// Reports
import { StudentReports } from "../pages/admin/reports/StudentReports";
import { FacultyReports } from "../pages/admin/reports/FacultyReports";
import { CourseReports } from "../pages/admin/reports/CourseReports";
import { FinancialReports } from "../pages/admin/reports/FinancialReports";

// Settings & Masters
import { Settings } from "../pages/admin/settings/Settings";
import { NotificationsPage } from "../pages/admin/notifications/NotificationsPage";
import { MasterSetup } from "../pages/admin/masters/MasterSetup";

// Phase 1 — Lead Management & AI Calling
import { LeadManagement } from "../pages/admin/leads/LeadManagement";
import { LeadDetails } from "../pages/admin/leads/LeadDetails";
import { AddLead } from "../pages/admin/leads/AddLead";
import { AiCallingQualification } from "../pages/counselor/AiCallingQualification";

// Phase 2 — Recordings, Assignments, Feedback, WhatsApp, Discontinuation
import { Recordings } from "../pages/admin/schedule/Recordings";
import { AdminAssignments } from "../pages/admin/schedule/Assignments";
import { FacultyRatings } from "../pages/admin/faculty/FacultyRatings";
import { WhatsAppMonitor } from "../pages/admin/notifications/WhatsAppMonitor";
import { DiscontinuationRisk } from "../pages/admin/students/DiscontinuationRisk";

// Phase 3 — Placement Export
import { PlacementExport } from "../pages/admin/reports/PlacementExport";

// Target & Incentive Management System
import { TargetManagement } from "../pages/admin/targets/TargetManagement";
import { TargetPerformance } from "../pages/admin/targets/TargetPerformance";
import { IncentiveManagement } from "../pages/admin/targets/IncentiveManagement";
import { CounselorPerformance } from "../pages/counselor/CounselorPerformance";

// Faculty Portal Expansion
import { FacultyAssignments } from "../pages/faculty/Assignments";
import { FacultyBatchClasses } from "../pages/faculty/BatchClasses";
import { FacultyMarkAttendance } from "../pages/faculty/MarkAttendance";
import { FacultyClassSession } from "../pages/faculty/ClassSession";
import { FacultyRecordings } from "../pages/faculty/FacultyRecordings";
import { FacultyAnnouncements } from "../pages/faculty/Announcements";

// Student Portal Expansion
import { StudentRecordings } from "../pages/student/Recordings";
import { StudentAssignments } from "../pages/student/Assignments";
import { StudentFeedback } from "../pages/student/Feedback";
import { StudentSchedule } from "../pages/student/Schedule";
import { StudentProfile } from "../pages/student/Profile";
import { StudentStudyMaterials } from "../pages/student/StudyMaterials";
import { StudentAnnouncements } from "../pages/student/Announcements";


// Other roles dashboards
import { CenterDashboard } from "../pages/center/Dashboard";
import { CounselorDashboard } from "../pages/counselor/Dashboard";
import { FacultyDashboard } from "../pages/faculty/Dashboard";
import { StudentDashboard } from "../pages/student/Dashboard";
import { StudentAttendance as PortalStudentAttendance } from "../pages/student/Attendance";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
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
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<AiHome />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="ask-me" element={<AskMe />} />
        <Route path="branch/:id/performance" element={<BranchPerformance />} />
        <Route path="branch/:id/revenue" element={<BranchRevenueDetails />} />

        {/* Students */}
        <Route path="students">
          <Route path="all" element={<AllStudents />} />
          <Route path="add" element={<AddStudent />} />
          <Route path=":id" element={<StudentDetails />} />
          <Route path=":id/edit" element={<EditStudent />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="performance" element={<StudentPerformance />} />
          <Route path="discontinuation-risk" element={<DiscontinuationRisk />} />
        </Route>

        {/* Faculty */}
        <Route path="faculty">
          <Route path="all" element={<AllFaculty />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="add" element={<AddFaculty />} />
          <Route path=":id" element={<FacultyDetails />} />
          <Route path="courses" element={<FacultyCourses />} />
          <Route path="attendance" element={<FacultyAttendance />} />
          <Route path="ratings" element={<FacultyRatings />} />
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
          <Route path="all" element={<AllAdmissions />} />
          <Route path="direct-entry" element={<DirectAdmissionEntry />} />
          <Route path="applications" element={<Applications />} />
          <Route path="enquiries" element={<Navigate to="/admin/leads" replace />} />
        </Route>

        {/* Counsellor */}
        <Route path="counselor">
          <Route path="overview" element={<CounsellorOverview />} />
          <Route path="all" element={<AllCounsellors />} />
          <Route path="batches" element={<CounsellorBatches />} />
          <Route path="assign-students" element={<Navigate to="/admin/counselor/batches" replace />} />
          <Route path="assign-faculty" element={<Navigate to="/admin/counselor/batches" replace />} />
        </Route>

        {/* Schedule */}
        <Route path="schedule">
          <Route path="classes" element={<Classes />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="recordings" element={<Recordings />} />
          <Route path="assignments" element={<AdminAssignments />} />
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
          <Route path="placement" element={<PlacementExport />} />
        </Route>

        {/* Settings, Notifications & Masters */}
        <Route path="masters" element={<MasterSetup />} />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="notifications/whatsapp" element={<WhatsAppMonitor />} />
        {/* Phase 1 — Leads & AI Calling */}
        <Route path="leads">
          <Route index element={<LeadManagement />} />
          <Route path="all" element={<LeadManagement />} />
          <Route path="enquiries" element={<Navigate to="/admin/leads" replace />} />
          <Route path="ai-calling" element={<AiCallingQualification />} />
          <Route path="follow-ups" element={<LeadManagement />} />
          <Route path="add" element={<AddLead />} />
          <Route path=":id" element={<LeadDetails />} />
        </Route>

        {/* Target & Incentive Management System */}
        <Route path="targets" element={<TargetManagement />} />
        <Route path="performance" element={<TargetPerformance />} />
        <Route path="incentives" element={<IncentiveManagement />} />

        {/* Examination Management System & Proctoring */}
        <Route path="exams">
          <Route index element={<ExamManagement />} />
          <Route path="all" element={<ExamManagement />} />
          <Route path="create" element={<CreateExam />} />
          <Route path="question-bank" element={<QuestionBank />} />
          <Route path="questions/create" element={<CreateQuestion />} />
          <Route path=":id" element={<ExamDetails />} />
          <Route path=":id/edit" element={<EditExam />} />
          <Route path=":id/attempts" element={<ExamAttempts />} />
          <Route path="attempts/:attemptId/proctoring" element={<AttemptProctoringDetails />} />
        </Route>
      </Route>


      {/* Center Manager Routes */}
      <Route path="/center" element={<CenterLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<AiHome />} />
        <Route path="dashboard" element={<CenterDashboard />} />
        <Route path="ask-me" element={<AskMe />} />
        <Route path="timetable" element={<Timetable />} />

        {/* Students */}
        <Route path="students">
          <Route path="all" element={<AllStudents />} />
          <Route path="add" element={<AddStudent />} />
          <Route path=":id" element={<StudentDetails />} />
          <Route path=":id/edit" element={<EditStudent />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="performance" element={<StudentPerformance />} />
          <Route path="discontinuation-risk" element={<DiscontinuationRisk />} />
        </Route>

        {/* Counsellor */}
        <Route path="counselor">
          <Route path="overview" element={<CounsellorOverview />} />
          <Route path="all" element={<AllCounsellors />} />
          <Route path="batches" element={<CounsellorBatches />} />
          <Route path="assign-students" element={<AssignStudents />} />
          <Route path="assign-faculty" element={<AssignFaculty />} />
        </Route>

        {/* Faculty */}
        <Route path="faculty">
          <Route path="all" element={<AllFaculty />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="add" element={<AddFaculty />} />
          <Route path=":id" element={<FacultyDetails />} />
          <Route path="courses" element={<FacultyCourses />} />
          <Route path="attendance" element={<FacultyAttendance />} />
          <Route path="ratings" element={<FacultyRatings />} />
        </Route>

        {/* Schedule */}
        <Route path="schedule">
          <Route path="classes" element={<Classes />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="recordings" element={<Recordings />} />
          <Route path="assignments" element={<AdminAssignments />} />
        </Route>

        {/* Fees */}
        <Route path="fees">
          <Route path="payments" element={<Payments />} />
          <Route path="pending" element={<PendingFees />} />
          <Route path="reports" element={<FeeReports />} />
        </Route>

        {/* Admissions */}
        <Route path="admissions">
          <Route path="all" element={<AllAdmissions />} />
          <Route path="direct-entry" element={<DirectAdmissionEntry />} />
          <Route path="applications" element={<Applications />} />
          <Route path="enquiries" element={<Navigate to="/center/leads" replace />} />
        </Route>

        {/* Courses */}
        <Route path="courses">
          <Route path="all" element={<AllCourses />} />
          <Route path="add" element={<AddCourse />} />
          <Route path="batches" element={<Batches />} />
          <Route path="curriculum" element={<Curriculum />} />
        </Route>

        {/* Reports */}
        <Route path="reports">
          <Route path="students" element={<StudentReports />} />
          <Route path="faculty" element={<FacultyReports />} />
          <Route path="courses" element={<CourseReports />} />
          <Route path="financial" element={<FinancialReports />} />
          <Route path="placement" element={<PlacementExport />} />
        </Route>

        {/* Settings & Notifications */}
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="notifications/whatsapp" element={<WhatsAppMonitor />} />

        {/* Center Manager: Leads (branch-filtered) */}
        <Route path="leads">
          <Route index element={<LeadManagement />} />
          <Route path="all" element={<LeadManagement />} />
          <Route path="enquiries" element={<Navigate to="/center/leads" replace />} />
          <Route path="ai-calling" element={<AiCallingQualification />} />
          <Route path="follow-ups" element={<LeadManagement />} />
          <Route path="add" element={<AddLead />} />
          <Route path=":id" element={<LeadDetails />} />
        </Route>

        {/* Target & Incentive Management System */}
        <Route path="targets" element={<TargetManagement />} />
        <Route path="performance" element={<TargetPerformance />} />
        <Route path="incentives" element={<IncentiveManagement />} />

        {/* Examination Management System (Branch Scoped) */}
        <Route path="exams">
          <Route index element={<ExamManagement />} />
          <Route path="all" element={<ExamManagement />} />
          <Route path="create" element={<CreateExam />} />
          <Route path="question-bank" element={<QuestionBank />} />
          <Route path="questions/create" element={<CreateQuestion />} />
          <Route path=":id" element={<ExamDetails />} />
          <Route path=":id/edit" element={<EditExam />} />
          <Route path=":id/attempts" element={<ExamAttempts />} />
          <Route path="attempts/:attemptId/proctoring" element={<AttemptProctoringDetails />} />
        </Route>
      </Route>

      {/* Counselor Routes */}
      <Route path="/counselor" element={<CounselorLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<AiHome />} />
        <Route path="dashboard" element={<CounselorDashboard />} />
        <Route path="ask-me" element={<AskMe />} />

        {/* Admissions / Leads */}
        <Route path="admissions">
          <Route path="all" element={<AllAdmissions />} />
          <Route path="direct-entry" element={<DirectAdmissionEntry />} />
          <Route path="applications" element={<Applications />} />
          <Route path="enquiries" element={<Navigate to="/counselor/leads" replace />} />
        </Route>

        {/* Students */}
        <Route path="students">
          <Route path="all" element={<AllStudents />} />
          <Route path="add" element={<AddStudent />} />
          <Route path=":id" element={<StudentDetails />} />
          <Route path=":id/edit" element={<EditStudent />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="performance" element={<StudentPerformance />} />
        </Route>

        {/* Faculty & Timetable */}
        <Route path="faculty">
          <Route path="all" element={<AllFaculty />} />
          <Route path="add" element={<AddFaculty />} />
          <Route path=":id" element={<FacultyDetails />} />
          <Route path="courses" element={<FacultyCourses />} />
          <Route path="attendance" element={<FacultyAttendance />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="ratings" element={<FacultyRatings />} />
        </Route>

        {/* Batches & Schedules */}
        <Route path="batches" element={<CounsellorBatches />} />
        <Route path="timetable" element={<Timetable />} />

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

        {/* Settings & Notifications */}
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<NotificationsPage />} />

        {/* Phase 1 — Leads & AI Calling */}
        <Route path="leads">
          <Route index element={<LeadManagement />} />
          <Route path="all" element={<LeadManagement />} />
          <Route path="enquiries" element={<Navigate to="/counselor/leads" replace />} />
          <Route path="ai-calling" element={<AiCallingQualification />} />
          <Route path="follow-ups" element={<LeadManagement />} />
          <Route path="add" element={<AddLead />} />
          <Route path=":id" element={<LeadDetails />} />
        </Route>

        {/* Personal Performance & Target Rewards */}
        <Route path="performance" element={<CounselorPerformance />} />
        <Route path="targets" element={<CounselorPerformance />} />
      </Route>

      {/* Top-Level Shortcut Redirects */}
      <Route path="/my-targets" element={<Navigate to="/counselor/performance" replace />} />
      <Route path="/my-performance" element={<Navigate to="/counselor/performance" replace />} />

      {/* Faculty Routes */}
      <Route path="/faculty" element={<FacultyLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<AiHome />} />
        <Route path="dashboard" element={<FacultyDashboard />} />
        <Route path="ask-me" element={<AskMe />} />
        <Route path="courses" element={<FacultyCourses />} />
        <Route path="class-session" element={<FacultyClassSession />} />
        <Route path="classes/:id" element={<FacultyClassSession />} />
        <Route path="attendance" element={<FacultyClassSession />} />
        <Route path="students">
          <Route path="attendance" element={<FacultyMarkAttendance />} />
          <Route path="attendance-records" element={<FacultyMarkAttendance />} />
          <Route path="all" element={<AllStudents />} />
          <Route path="add" element={<AddStudent />} />
          <Route path=":id" element={<StudentDetails />} />
          <Route path=":id/edit" element={<EditStudent />} />
        </Route>
        <Route path="timetable" element={<FacultyTimetable />} />
        <Route path="classes" element={<FacultyTimetable />} />
        <Route path="recordings" element={<FacultyRecordings />} />
        <Route path="schedule">
          <Route path="classes" element={<FacultyTimetable />} />
          <Route path="timetable" element={<FacultyTimetable />} />
          <Route path="recordings" element={<FacultyRecordings />} />
        </Route>
        <Route path="reports">
          <Route path="students" element={<StudentReports />} />
        </Route>
        <Route path="assignments" element={<FacultyAssignments />} />
        <Route path="announcements" element={<FacultyAnnouncements />} />
        <Route path="batches" element={<FacultyBatchClasses />} />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* Student Routes */}
      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<AiHome />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="ask-me" element={<AskMe />} />
        <Route path="attendance" element={<PortalStudentAttendance />} />
        <Route path="announcements" element={<StudentAnnouncements />} />
        <Route path="schedule" element={<StudentSchedule />} />
        <Route path="study-materials" element={<StudentStudyMaterials />} />
        <Route path="recordings" element={<StudentRecordings />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="feedback" element={<StudentFeedback />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="exams" element={<MyExams />} />
        <Route path="exams/:id/start" element={<ExamConsentScreen />} />
        <Route path="exams/:attemptId/result" element={<ExamResultScreen />} />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* Standalone Fullscreen Proctored Examination Session */}
      <Route path="/student/exams/:attemptId/take" element={<TakeExam />} />

      {/* Default Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
