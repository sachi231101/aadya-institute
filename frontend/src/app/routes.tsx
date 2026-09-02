import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Login } from "../pages/auth/Login";

import { AdminLayout } from "../layouts/AdminLayout";
import { CenterLayout } from "../layouts/CenterLayout";
import { CounselorLayout } from "../layouts/CounselorLayout";
import { FacultyLayout } from "../layouts/FacultyLayout";
import { StudentLayout } from "../layouts/StudentLayout";

import { adminChildRoutes } from "./admin.routes";
import { AiHome } from "../pages/admin/ai/AiHome";
import { AskMe } from "../pages/admin/ai/AskMe";

// Shared admin pages (center/counselor portals)
import { AllStudents } from "../pages/admin/students/AllStudents";
import { AddStudent } from "../pages/admin/students/AddStudent";
import { StudentDetails } from "../pages/admin/students/StudentDetails";
import { EditStudent } from "../pages/admin/students/EditStudent";
import { StudentAttendance } from "../pages/admin/students/StudentAttendance";
import { StudentPerformance } from "../pages/admin/students/StudentPerformance";
import { DiscontinuationRisk } from "../pages/admin/students/DiscontinuationRisk";
import { AllFaculty } from "../pages/admin/faculty/AllFaculty";
import { AddFaculty } from "../pages/admin/faculty/AddFaculty";
import { EditFaculty } from "../pages/admin/faculty/EditFaculty";
import { FacultyDetails } from "../pages/admin/faculty/FacultyDetails";
import { FacultyTimetable } from "../pages/admin/faculty/FacultyTimetable";
import { FacultyAllocation } from "../pages/admin/faculty/FacultyAllocation";
import { FacultyAttendance } from "../pages/admin/faculty/FacultyAttendance";
import { FacultyRatings } from "../pages/admin/faculty/FacultyRatings";
import { AllCourses } from "../pages/admin/courses/AllCourses";
import { AddCourse } from "../pages/admin/courses/AddCourse";
import { EditCourse } from "../pages/admin/courses/EditCourse";
import { CourseAssignment } from "../pages/admin/courses/CourseAssignment";
import { Batches } from "../pages/admin/courses/Batches";
import { Curriculum } from "../pages/admin/courses/Curriculum";
import { UsersManagement } from "../pages/admin/administration/UsersManagement";
import { ViewAdmin } from "../pages/admin/administration/ViewAdmin";
import { EditAdmin } from "../pages/admin/administration/EditAdmin";
import { AddAdmin } from "../pages/admin/administration/AddAdmin";
import { Applications } from "../pages/admin/admissions/Applications";
import { AllAdmissions } from "../pages/admin/admissions/AllAdmissions";
import { DirectAdmissionEntry } from "../pages/admin/admissions/DirectAdmissionEntry";
import { Enquiries } from "../pages/admin/admissions/Enquiries";
import { AllCounsellors } from "../pages/admin/counselor/AllCounsellors";
import { CounsellorOverview } from "../pages/admin/counselor/CounsellorOverview";
import { LeadAllocation } from "../pages/admin/counsellors/LeadAllocation";
import { CounsellorPerformance } from "../pages/admin/counsellors/CounsellorPerformance";
import { CounsellorBatches } from "../pages/admin/counselor/CounsellorBatches";
import { Classes } from "../pages/admin/schedule/Classes";
import { ExamManagement } from "../pages/admin/exams/ExamManagement";
import { CreateExam } from "../pages/admin/exams/CreateExam";
import { ExamDetails } from "../pages/admin/exams/ExamDetails";
import { EditExam } from "../pages/admin/exams/EditExam";
import { QuestionBank } from "../pages/admin/exams/QuestionBank";
import { CreateQuestion } from "../pages/admin/exams/CreateQuestion";
import { EditQuestion } from "../pages/admin/exams/EditQuestion";
import { ExamAttempts } from "../pages/admin/exams/ExamAttempts";
import { AttemptProctoringDetails } from "../pages/admin/exams/AttemptProctoringDetails";
import { MyExams } from "../pages/student/exams/MyExams";
import { ExamConsentScreen } from "../pages/student/exams/ExamConsentScreen";
import { TakeExam } from "../pages/student/exams/TakeExam";
import { ExamResultScreen } from "../pages/student/exams/ExamResultScreen";
import { Timetable } from "../pages/admin/schedule/Timetable";
import { Payments } from "../pages/admin/fees/Payments";
import { PendingFees } from "../pages/admin/fees/PendingFees";
import { FeeReports } from "../pages/admin/fees/FeeReports";
import { StudentReports } from "../pages/admin/reports/StudentReports";
import { FacultyReports } from "../pages/admin/reports/FacultyReports";
import { CourseReports } from "../pages/admin/reports/CourseReports";
import { FinancialReports } from "../pages/admin/reports/FinancialReports";
import { Settings } from "../pages/admin/settings/Settings";
import { NotificationsPage } from "../pages/admin/notifications/NotificationsPage";
import { MasterSetup } from "../pages/admin/masters/MasterSetup";
import { AllLeadsList } from "../pages/admin/leads/AllLeadsList";
import { LeadDetails } from "../pages/admin/leads/LeadDetails";
import { AddLead } from "../pages/admin/leads/AddLead";
import { FollowUps } from "../pages/admin/leads/FollowUps";
import { AiCallingQualification } from "../pages/counselor/AiCallingQualification";
import { Recordings } from "../pages/admin/schedule/Recordings";
import { AdminAssignments } from "../pages/admin/schedule/Assignments";
import { WhatsAppHub } from "../pages/admin/communication/WhatsAppHub";
import { PlacementExport } from "../pages/admin/reports/PlacementExport";
import { TargetManagement } from "../pages/admin/targets/TargetManagement";
import { TargetPerformance } from "../pages/admin/targets/TargetPerformance";
import { IncentiveManagement } from "../pages/admin/targets/IncentiveManagement";
import { CounselorPerformance } from "../pages/counselor/CounselorPerformance";
import { CallHistory } from "../pages/admin/leads/CallHistory";
import { StudentDocuments } from "../pages/admin/students/StudentDocuments";
import { StudentAllocation } from "../pages/admin/students/StudentAllocation";
import { AdmissionDocuments } from "../pages/admin/admissions/AdmissionDocuments";
import { AllBatches } from "../pages/admin/batches/AllBatches";
import { CreateBatch } from "../pages/admin/batches/CreateBatch";
import { BatchDetails } from "../pages/admin/batches/BatchDetails";
import { LiveClasses } from "../pages/admin/schedule/LiveClasses";
import { AssignmentList } from "../pages/admin/assignments/AssignmentList";
import { CreateAssignment } from "../pages/admin/assignments/CreateAssignment";
import { SubmissionsQueue } from "../pages/admin/assignments/SubmissionsQueue";
import { ReviewsQueue } from "../pages/admin/assignments/ReviewsQueue";
import { ExamResults } from "../pages/admin/exams/ExamResults";
import { FeePlans } from "../pages/admin/fees/FeePlans";
import { StudentFees } from "../pages/admin/fees/StudentFees";
import { Receipts } from "../pages/admin/fees/Receipts";
import { EmailManagement } from "../pages/admin/communication/EmailManagement";
import { AutomationRules } from "../pages/admin/communication/AutomationRules";
import { EligibleStudents } from "../pages/admin/placement/EligibleStudents";
import { Companies } from "../pages/admin/placement/Companies";
import { Jobs } from "../pages/admin/placement/Jobs";
import { Applications as PlacementApplications } from "../pages/admin/placement/Applications";
import { Interviews } from "../pages/admin/placement/Interviews";
import { Placements } from "../pages/admin/placement/Placements";
import { AttendanceReports } from "../pages/admin/reports/AttendanceReports";
import { AdmissionReports } from "../pages/admin/reports/AdmissionReports";
import { ExaminationReports } from "../pages/admin/reports/ExaminationReports";

// Faculty Portal Expansion
import { FacultyAssignments } from "../pages/faculty/Assignments";
import { FacultyBatchClasses } from "../pages/faculty/BatchClasses";
import { FacultyMarkAttendance } from "../pages/faculty/MarkAttendance";
import { FacultyClassSession } from "../pages/faculty/ClassSession";
import { FacultyRecordings } from "../pages/faculty/FacultyRecordings";
import { FacultyAnnouncements } from "../pages/faculty/Announcements";
import { FacultyMyStudents } from "../pages/faculty/MyStudents";
import { FacultyFeedback } from "../pages/faculty/Feedback";
import { FacultyMySchedule } from "../pages/faculty/FacultyMySchedule";

// Student Portal Expansion
import { StudentRecordings } from "../pages/student/Recordings";
import { StudentAssignments } from "../pages/student/Assignments";
import { StudentFeedback } from "../pages/student/Feedback";
import { StudentSchedule } from "../pages/student/Schedule";
import { StudentProfile } from "../pages/student/Profile";
import { StudentStudyMaterials } from "../pages/student/StudyMaterials";
import { StudentAnnouncements } from "../pages/student/Announcements";
import { StudentCertificates } from "../pages/student/Certificates";


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

      {/* Legacy Administration Routes — redirect to ERP paths */}
      <Route path="/administration" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/administration/users" replace />} />
        <Route path="admins/new" element={<AddAdmin />} />
        <Route path="admins/:id" element={<ViewAdmin />} />
        <Route path="admins/:id/edit" element={<EditAdmin />} />
      </Route>

      {/* Admin Routes — ERP structure */}
      <Route path="/admin" element={<AdminLayout />}>
        {adminChildRoutes}
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
          <Route path="documents" element={<StudentDocuments />} />
          <Route path="student-allocation" element={<StudentAllocation />} />
          <Route path="batch-allocation" element={<Navigate to="/center/students/student-allocation" replace />} />
          <Route path=":id" element={<StudentDetails />} />
          <Route path=":id/edit" element={<EditStudent />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="performance" element={<StudentPerformance />} />
          <Route path="discontinuation-risk" element={<DiscontinuationRisk />} />
        </Route>

        {/* Counsellor */}
        <Route path="counselor">
          <Route path="overview" element={<CounsellorOverview />} />
          <Route path="lead-allocation" element={<LeadAllocation />} />
          <Route path="performance" element={<CounsellorPerformance />} />
          <Route path="all" element={<AllCounsellors />} />
          <Route path="batches" element={<CounsellorBatches />} />
          <Route path="assign-students" element={<Navigate to="/center/students/student-allocation" replace />} />
          <Route path="assign-faculty" element={<Navigate to="/center/faculty/faculty-allocation" replace />} />
        </Route>

        {/* Faculty */}
        <Route path="faculty">
          <Route path="all" element={<AllFaculty />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="add" element={<AddFaculty />} />
          <Route path="batch-assignment" element={<Navigate to="/center/faculty/faculty-allocation" replace />} />
          <Route path="faculty-allocation" element={<FacultyAllocation />} />
          <Route path=":id/edit" element={<EditFaculty />} />
          <Route path=":id" element={<FacultyDetails />} />
          <Route path="courses" element={<Navigate to="/center/courses/course-assignment" replace />} />
          <Route path="attendance" element={<FacultyAttendance />} />
          <Route path="ratings" element={<FacultyRatings />} />
        </Route>

        {/* Schedule */}
        <Route path="schedule">
          <Route path="classes" element={<Classes />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="live" element={<LiveClasses />} />
          <Route path="recordings" element={<Recordings />} />
          <Route path="assignments" element={<AdminAssignments />} />
        </Route>

        <Route path="assignments">
          <Route index element={<AssignmentList />} />
          <Route path="create" element={<CreateAssignment />} />
          <Route path="submissions" element={<SubmissionsQueue />} />
          <Route path="reviews" element={<ReviewsQueue />} />
        </Route>

        <Route path="batches">
          <Route index element={<AllBatches />} />
          <Route path="create" element={<CreateBatch />} />
          <Route path="student-allocation" element={<Navigate to="/center/students/student-allocation" replace />} />
          <Route path="faculty-allocation" element={<Navigate to="/center/faculty/faculty-allocation" replace />} />
          <Route path=":id" element={<BatchDetails />} />
        </Route>

        {/* Fees */}
        <Route path="fees">
          <Route path="plans" element={<FeePlans />} />
          <Route path="student-fees" element={<StudentFees />} />
          <Route path="payments" element={<Payments />} />
          <Route path="pending" element={<PendingFees />} />
          <Route path="receipts" element={<Receipts />} />
          <Route path="reports" element={<FeeReports />} />
        </Route>

        {/* Admissions */}
        <Route path="admissions">
          <Route path="all" element={<AllAdmissions />} />
          <Route path="direct-entry" element={<DirectAdmissionEntry />} />
          <Route path="applications" element={<Applications />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="documents" element={<AdmissionDocuments />} />
        </Route>

        {/* Courses */}
        <Route path="courses">
          <Route path="all" element={<AllCourses />} />
          <Route path="add" element={<AddCourse />} />
          <Route path=":id/edit" element={<EditCourse />} />
          <Route path="batches" element={<Batches />} />
          <Route path="curriculum" element={<Curriculum />} />
          <Route path="modules" element={<Navigate to="/center/courses/curriculum" replace />} />
          <Route path="course-assignment" element={<CourseAssignment />} />
        </Route>

        {/* Reports */}
        <Route path="reports">
          <Route path="students" element={<StudentReports />} />
          <Route path="admissions" element={<AdmissionReports />} />
          <Route path="attendance" element={<AttendanceReports />} />
          <Route path="faculty" element={<FacultyReports />} />
          <Route path="courses" element={<CourseReports />} />
          <Route path="examinations" element={<ExaminationReports />} />
          <Route path="financial" element={<FinancialReports />} />
          <Route path="placement" element={<PlacementExport />} />
        </Route>

        <Route path="communication">
          <Route path="email" element={<EmailManagement />} />
          <Route path="automation" element={<AutomationRules />} />
        </Route>

        <Route path="placement">
          <Route path="eligible" element={<EligibleStudents />} />
          <Route path="companies" element={<Companies />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="applications" element={<PlacementApplications />} />
          <Route path="interviews" element={<Interviews />} />
          <Route path="placements" element={<Placements />} />
        </Route>

        {/* Settings, Notifications & Masters */}
        <Route path="masters" element={<MasterSetup />} />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="notifications/whatsapp" element={<WhatsAppHub />} />

        {/* Center Manager: Leads (branch-filtered) */}
        <Route path="leads">
          <Route index element={<AllLeadsList />} />
          <Route path="all" element={<AllLeadsList />} />
          <Route path="call-history" element={<CallHistory />} />
          <Route path="enquiries" element={<Navigate to="/center/admissions/enquiries" replace />} />
          <Route path="ai-calling" element={<AiCallingQualification />} />
          <Route path="follow-ups" element={<FollowUps />} />
          <Route path="add" element={<AddLead />} />
          <Route path=":id" element={<LeadDetails />} />
        </Route>

        {/* Target & Incentive Management System */}
        <Route path="targets" element={<TargetManagement />} />
        <Route path="targets/assignments" element={<Navigate to="/center/targets" replace />} />
        <Route path="targets/leaderboard" element={<TargetPerformance />} />
        <Route path="performance" element={<Navigate to="/center/targets/leaderboard" replace />} />
        <Route path="incentives" element={<IncentiveManagement />} />

        {/* Examination Management System (Branch Scoped) */}
        <Route path="exams">
          <Route index element={<ExamManagement />} />
          <Route path="all" element={<ExamManagement />} />
          <Route path="create" element={<CreateExam />} />
          <Route path="question-bank" element={<QuestionBank />} />
          <Route path="results" element={<ExamResults />} />
          <Route path="questions/create" element={<CreateQuestion />} />
          <Route path="questions/:id/edit" element={<EditQuestion />} />
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
          <Route path="enquiries" element={<Enquiries />} />
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
          <Route path=":id/edit" element={<EditFaculty />} />
          <Route path=":id" element={<FacultyDetails />} />
          <Route path="courses" element={<CourseAssignment />} />
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
          <Route index element={<AllLeadsList />} />
          <Route path="all" element={<AllLeadsList />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="ai-calling" element={<AiCallingQualification />} />
          <Route path="follow-ups" element={<FollowUps />} />
          <Route path="add" element={<AddLead />} />
          <Route path=":id" element={<LeadDetails />} />
        </Route>

        {/* Personal Performance & Target Rewards */}
        <Route path="performance" element={<CounselorPerformance />} />
        <Route path="targets" element={<CounselorPerformance />} />

        {/* Examination Management (view-only for counsellors) */}
        <Route path="exams">
          <Route index element={<ExamManagement />} />
          <Route path="all" element={<ExamManagement />} />
          <Route path=":id" element={<ExamDetails />} />
        </Route>
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
        <Route path="courses" element={<CourseAssignment />} />
        <Route path="class-session" element={<FacultyClassSession />} />
        <Route path="classes/:id" element={<FacultyClassSession />} />
        <Route path="attendance" element={<FacultyClassSession />} />
        <Route path="students">
          <Route path="attendance" element={<FacultyMarkAttendance />} />
          <Route path="attendance-records" element={<FacultyMarkAttendance />} />
          <Route path="all" element={<FacultyMyStudents />} />
        </Route>
        <Route path="feedback" element={<FacultyFeedback />} />
        <Route path="timetable" element={<FacultyMySchedule />} />
        <Route path="classes" element={<FacultyMySchedule />} />
        <Route path="recordings" element={<FacultyRecordings />} />
        <Route path="schedule">
          <Route path="classes" element={<FacultyMySchedule />} />
          <Route path="timetable" element={<FacultyMySchedule />} />
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
        <Route path="certificates" element={<StudentCertificates />} />
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
