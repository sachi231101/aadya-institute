import React from "react";
import { Route, Navigate } from "react-router-dom";

import { AdminDashboard } from "../pages/admin/Dashboard";
import { AiHome } from "../pages/admin/ai/AiHome";
import { AskMe } from "../pages/admin/ai/AskMe";
import { BranchPerformance } from "../pages/admin/branch/BranchPerformance";
import { BranchRevenueDetails } from "../pages/admin/branch/BranchRevenueDetails";

import { AllStudents } from "../pages/admin/students/AllStudents";
import { AddStudent } from "../pages/admin/students/AddStudent";
import { StudentDetails } from "../pages/admin/students/StudentDetails";
import { EditStudent } from "../pages/admin/students/EditStudent";
import { StudentAttendance } from "../pages/admin/students/StudentAttendance";
import { StudentPerformance } from "../pages/admin/students/StudentPerformance";
import { DiscontinuationRisk } from "../pages/admin/students/DiscontinuationRisk";
import { StudentDocuments } from "../pages/admin/students/StudentDocuments";
import { BatchAllocation as StudentBatchAllocation } from "../pages/admin/students/BatchAllocation";

import { AllFaculty } from "../pages/admin/faculty/AllFaculty";
import { AddFaculty } from "../pages/admin/faculty/AddFaculty";
import { EditFaculty } from "../pages/admin/faculty/EditFaculty";
import { FacultyDetails } from "../pages/admin/faculty/FacultyDetails";
import { FacultyCourses } from "../pages/admin/faculty/FacultyCourses";
import { FacultyAttendance } from "../pages/admin/faculty/FacultyAttendance";
import { FacultyRatings } from "../pages/admin/faculty/FacultyRatings";

import { AllCourses } from "../pages/admin/courses/AllCourses";
import { AddCourse } from "../pages/admin/courses/AddCourse";
import { EditCourse } from "../pages/admin/courses/EditCourse";
import { Curriculum } from "../pages/admin/courses/Curriculum";
import { CourseDetails } from "../pages/admin/courses/CourseDetails";
import { Modules } from "../pages/admin/courses/Modules";

import { AllBatches } from "../pages/admin/batches/AllBatches";
import { CreateBatch } from "../pages/admin/batches/CreateBatch";
import { BatchDetails } from "../pages/admin/batches/BatchDetails";
import { BatchStudentAllocationPage, BatchFacultyAllocationPage } from "../pages/admin/batches/BatchAllocationPages";

import { Applications } from "../pages/admin/admissions/Applications";
import { AllAdmissions } from "../pages/admin/admissions/AllAdmissions";
import { DirectAdmissionEntry } from "../pages/admin/admissions/DirectAdmissionEntry";
import { AdmissionDocuments } from "../pages/admin/admissions/AdmissionDocuments";

import { AllCounsellors } from "../pages/admin/counselor/AllCounsellors";
import { LeadAllocation } from "../pages/admin/counsellors/LeadAllocation";
import { StudentAllocation as CounsellorStudentAllocation } from "../pages/admin/counsellors/StudentAllocation";
import { CounsellorPerformance } from "../pages/admin/counsellors/CounsellorPerformance";

import { Classes } from "../pages/admin/schedule/Classes";
import { Timetable } from "../pages/admin/schedule/Timetable";
import { Recordings } from "../pages/admin/schedule/Recordings";
import { LiveClasses } from "../pages/admin/schedule/LiveClasses";

import { AssignmentList } from "../pages/admin/assignments/AssignmentList";
import { CreateAssignment } from "../pages/admin/assignments/CreateAssignment";
import { SubmissionsQueue } from "../pages/admin/assignments/SubmissionsQueue";
import { ReviewsQueue } from "../pages/admin/assignments/ReviewsQueue";

import { ExamManagement } from "../pages/admin/exams/ExamManagement";
import { CreateExam } from "../pages/admin/exams/CreateExam";
import { ExamDetails } from "../pages/admin/exams/ExamDetails";
import { EditExam } from "../pages/admin/exams/EditExam";
import { QuestionBank } from "../pages/admin/exams/QuestionBank";
import { CreateQuestion } from "../pages/admin/exams/CreateQuestion";
import { ExamAttempts } from "../pages/admin/exams/ExamAttempts";
import { AttemptProctoringDetails } from "../pages/admin/exams/AttemptProctoringDetails";
import { ExamResults } from "../pages/admin/exams/ExamResults";

import { Payments } from "../pages/admin/fees/Payments";
import { PendingFees } from "../pages/admin/fees/PendingFees";
import { FeeReports } from "../pages/admin/fees/FeeReports";
import { FeePlans } from "../pages/admin/fees/FeePlans";
import { StudentFees } from "../pages/admin/fees/StudentFees";
import { Receipts } from "../pages/admin/fees/Receipts";

import { StudentReports } from "../pages/admin/reports/StudentReports";
import { FacultyReports } from "../pages/admin/reports/FacultyReports";
import { CourseReports } from "../pages/admin/reports/CourseReports";
import { FinancialReports } from "../pages/admin/reports/FinancialReports";
import { AdmissionReports } from "../pages/admin/reports/AdmissionReports";
import { AttendanceReports } from "../pages/admin/reports/AttendanceReports";
import { ExaminationReports } from "../pages/admin/reports/ExaminationReports";

import { NotificationsHub } from "../pages/admin/communication/NotificationsHub";
import { WhatsAppHub } from "../pages/admin/communication/WhatsAppHub";
import { EmailManagement } from "../pages/admin/communication/EmailManagement";
import { AutomationRules } from "../pages/admin/communication/AutomationRules";

import { EligibleStudents } from "../pages/admin/placement/EligibleStudents";
import { Companies } from "../pages/admin/placement/Companies";
import { Jobs } from "../pages/admin/placement/Jobs";
import { Applications as PlacementApplications } from "../pages/admin/placement/Applications";
import { Interviews } from "../pages/admin/placement/Interviews";
import { Placements } from "../pages/admin/placement/Placements";

import { Organization } from "../pages/admin/administration/Organization";
import { Branches } from "../pages/admin/administration/Branches";
import { UsersManagement } from "../pages/admin/administration/UsersManagement";
import { RolesPermissions } from "../pages/admin/administration/RolesPermissions";
import { MastersHub } from "../pages/admin/administration/MastersHub";
import { Integrations } from "../pages/admin/administration/Integrations";
import { Billing } from "../pages/admin/administration/Billing";
import { AuditLogs } from "../pages/admin/administration/AuditLogs";
import { SettingsHub } from "../pages/admin/administration/SettingsHub";
import { AddAdmin } from "../pages/admin/administration/AddAdmin";
import { ViewAdmin } from "../pages/admin/administration/ViewAdmin";
import { EditAdmin } from "../pages/admin/administration/EditAdmin";

import { AllLeadsList } from "../pages/admin/leads/AllLeadsList";
import { LeadDetails } from "../pages/admin/leads/LeadDetails";
import { AddLead } from "../pages/admin/leads/AddLead";
import { CallHistory } from "../pages/admin/leads/CallHistory";
import { FollowUps } from "../pages/admin/leads/FollowUps";
import { AiCallingQualification } from "../pages/counselor/AiCallingQualification";

import { TargetManagement } from "../pages/admin/targets/TargetManagement";
import { TargetPerformance } from "../pages/admin/targets/TargetPerformance";
import { IncentiveManagement } from "../pages/admin/targets/IncentiveManagement";

export const adminChildRoutes = (
  <>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="home" element={<AiHome />} />
    <Route path="dashboard" element={<AdminDashboard />} />
    <Route path="ask-me" element={<AskMe />} />
    <Route path="branch/:id/performance" element={<BranchPerformance />} />
    <Route path="branch/:id/revenue" element={<BranchRevenueDetails />} />

    {/* Lead Management */}
    <Route path="leads">
      <Route index element={<AllLeadsList />} />
      <Route path="all" element={<AllLeadsList />} />
      <Route path="new" element={<AddLead />} />
      <Route path="add" element={<Navigate to="/admin/leads/new" replace />} />
      <Route path="ai-calling" element={<AiCallingQualification />} />
      <Route path="follow-ups" element={<FollowUps />} />
      <Route path="call-history" element={<CallHistory />} />
      <Route path=":id" element={<LeadDetails />} />
    </Route>

    {/* Admission Management */}
    <Route path="admissions">
      <Route path="enquiries" element={<Navigate to="/admin/leads" replace />} />
      <Route path="applications" element={<Applications />} />
      <Route path="all" element={<AllAdmissions />} />
      <Route path="direct-entry" element={<DirectAdmissionEntry />} />
      <Route path="documents" element={<AdmissionDocuments />} />
    </Route>

    {/* Counsellor Management */}
    <Route path="counsellors">
      <Route index element={<AllCounsellors />} />
      <Route path="lead-allocation" element={<LeadAllocation />} />
      <Route path="student-allocation" element={<CounsellorStudentAllocation />} />
      <Route path="performance" element={<CounsellorPerformance />} />
    </Route>

    {/* Student Management */}
    <Route path="students">
      <Route path="all" element={<AllStudents />} />
      <Route path="add" element={<AddStudent />} />
      <Route path="documents" element={<StudentDocuments />} />
      <Route path="batch-allocation" element={<StudentBatchAllocation />} />
      <Route path="attendance" element={<StudentAttendance />} />
      <Route path="performance" element={<StudentPerformance />} />
      <Route path="discontinuation-risk" element={<DiscontinuationRisk />} />
      <Route path=":id/edit" element={<EditStudent />} />
      <Route path=":id" element={<StudentDetails />} />
    </Route>

    {/* Faculty Management */}
    <Route path="faculty">
      <Route path="all" element={<AllFaculty />} />
      <Route path="add" element={<AddFaculty />} />
      <Route path="course-assignment" element={<FacultyCourses />} />
      <Route path="batch-assignment" element={<BatchFacultyAllocationPage />} />
      <Route path="attendance" element={<FacultyAttendance />} />
      <Route path="performance" element={<FacultyRatings />} />
      <Route path="courses" element={<Navigate to="/admin/faculty/course-assignment" replace />} />
      <Route path="ratings" element={<Navigate to="/admin/faculty/performance" replace />} />
      <Route path="timetable" element={<Timetable />} />
      <Route path=":id/edit" element={<EditFaculty />} />
      <Route path=":id" element={<FacultyDetails />} />
    </Route>

    {/* Course Management */}
    <Route path="courses">
      <Route path="all" element={<AllCourses />} />
      <Route path="add" element={<AddCourse />} />
      <Route path="curriculum" element={<Curriculum />} />
      <Route path="modules" element={<Modules />} />
      <Route path="batches" element={<Navigate to="/admin/batches" replace />} />
      <Route path=":id/edit" element={<EditCourse />} />
      <Route path=":id" element={<CourseDetails />} />
    </Route>

    {/* Batch Management */}
    <Route path="batches">
      <Route index element={<AllBatches />} />
      <Route path="create" element={<CreateBatch />} />
      <Route path="student-allocation" element={<BatchStudentAllocationPage />} />
      <Route path="faculty-allocation" element={<BatchFacultyAllocationPage />} />
      <Route path=":id" element={<BatchDetails />} />
    </Route>

    {/* Class & Schedule Management */}
    <Route path="schedule">
      <Route path="timetable" element={<Timetable />} />
      <Route path="classes" element={<Classes />} />
      <Route path="live" element={<LiveClasses />} />
      <Route path="recordings" element={<Recordings />} />
      <Route path="assignments" element={<Navigate to="/admin/assignments" replace />} />
    </Route>

    {/* Assignment Management */}
    <Route path="assignments">
      <Route index element={<AssignmentList />} />
      <Route path="create" element={<CreateAssignment />} />
      <Route path="submissions" element={<SubmissionsQueue />} />
      <Route path="reviews" element={<ReviewsQueue />} />
    </Route>

    {/* Examination Management */}
    <Route path="exams">
      <Route index element={<ExamManagement />} />
      <Route path="all" element={<ExamManagement />} />
      <Route path="create" element={<CreateExam />} />
      <Route path="question-bank" element={<QuestionBank />} />
      <Route path="questions/create" element={<CreateQuestion />} />
      <Route path="results" element={<ExamResults />} />
      <Route path="attempts/:attemptId/proctoring" element={<AttemptProctoringDetails />} />
      <Route path=":id/edit" element={<EditExam />} />
      <Route path=":id/attempts" element={<ExamAttempts />} />
      <Route path=":id" element={<ExamDetails />} />
    </Route>

    {/* Fee Management */}
    <Route path="fees">
      <Route path="plans" element={<FeePlans />} />
      <Route path="student-fees" element={<StudentFees />} />
      <Route path="payments" element={<Payments />} />
      <Route path="pending" element={<PendingFees />} />
      <Route path="receipts" element={<Receipts />} />
      <Route path="reports" element={<FeeReports />} />
    </Route>

    {/* Target & Incentive Management */}
    <Route path="targets">
      <Route index element={<TargetManagement />} />
      <Route path="assignments" element={<TargetManagement />} />
      <Route path="leaderboard" element={<TargetPerformance />} />
      <Route path="incentives" element={<IncentiveManagement />} />
    </Route>
    <Route path="performance" element={<Navigate to="/admin/targets/leaderboard" replace />} />
    <Route path="incentives" element={<Navigate to="/admin/targets/incentives" replace />} />

    {/* Report Management */}
    <Route path="reports">
      <Route path="students" element={<StudentReports />} />
      <Route path="admissions" element={<AdmissionReports />} />
      <Route path="attendance" element={<AttendanceReports />} />
      <Route path="faculty" element={<FacultyReports />} />
      <Route path="courses" element={<CourseReports />} />
      <Route path="examinations" element={<ExaminationReports />} />
      <Route path="finance" element={<FinancialReports />} />
      <Route path="financial" element={<Navigate to="/admin/reports/finance" replace />} />
      <Route path="placement" element={<Navigate to="/admin/placement/eligible" replace />} />
    </Route>

    {/* Communication Management */}
    <Route path="communication">
      <Route path="notifications" element={<NotificationsHub />} />
      <Route path="whatsapp" element={<WhatsAppHub />} />
      <Route path="email" element={<EmailManagement />} />
      <Route path="automation" element={<AutomationRules />} />
    </Route>

    {/* Placement Management */}
    <Route path="placement">
      <Route path="eligible" element={<EligibleStudents />} />
      <Route path="companies" element={<Companies />} />
      <Route path="jobs" element={<Jobs />} />
      <Route path="applications" element={<PlacementApplications />} />
      <Route path="interviews" element={<Interviews />} />
      <Route path="placements" element={<Placements />} />
    </Route>

    {/* Administration */}
    <Route path="administration">
      <Route path="organization" element={<Organization />} />
      <Route path="branches" element={<Branches />} />
      <Route path="users" element={<UsersManagement />} />
      <Route path="roles" element={<RolesPermissions />} />
      <Route path="masters" element={<MastersHub />} />
      <Route path="integrations" element={<Integrations />} />
      <Route path="billing" element={<Billing />} />
      <Route path="audit-logs" element={<AuditLogs />} />
      <Route path="settings" element={<SettingsHub />} />
      <Route path="admins/new" element={<AddAdmin />} />
      <Route path="admins/:id/edit" element={<EditAdmin />} />
      <Route path="admins/:id" element={<ViewAdmin />} />
    </Route>

    {/* Legacy redirects */}
    <Route path="counselor">
      <Route path="overview" element={<Navigate to="/admin/counsellors/performance" replace />} />
      <Route path="all" element={<Navigate to="/admin/counsellors" replace />} />
      <Route path="batches" element={<Navigate to="/admin/batches" replace />} />
      <Route path="assign-students" element={<Navigate to="/admin/counsellors/student-allocation" replace />} />
      <Route path="assign-faculty" element={<Navigate to="/admin/batches/faculty-allocation" replace />} />
    </Route>
    <Route path="masters" element={<Navigate to="/admin/administration/masters" replace />} />
    <Route path="settings" element={<Navigate to="/admin/administration/settings" replace />} />
    <Route path="notifications" element={<Navigate to="/admin/communication/notifications" replace />} />
    <Route path="notifications/whatsapp" element={<Navigate to="/admin/communication/whatsapp" replace />} />
  </>
);
