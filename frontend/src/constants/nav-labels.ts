/**
 * Canonical human-facing nav labels keyed by permission itemKey.
 * Keep permission keys stable; update labels here and in backend permission-catalog.ts.
 */
export const NAV_ITEM_LABELS: Record<string, string> = {
  // Admission
  "admissions.enquiries": "Enquiries",
  "admissions.applications": "Admission Applications",
  "admissions.all": "Admissions",
  "admissions.direct": "Direct Admission",
  "admissions.documents": "Admission Documents",

  // Counsellor
  "counsellor.all": "All Counsellors",
  "counsellor.lead_allocation": "Assign Leads to Counsellors",
  "counsellor.performance": "Counsellor Performance",

  // Students
  "students.all": "All Students",
  "students.documents": "Student Documents",
  "students.student_allocation": "Assign Students to Batches",
  "students.attendance": "Student Attendance",
  "students.performance": "Academic Performance",
  "students.discontinuation": "Discontinuation Risk",

  // Faculty
  "faculty.all": "All Faculty",
  "faculty.faculty_allocation": "Assign Faculty to Batches",
  "faculty.attendance": "Faculty Attendance",
  "faculty.performance": "Faculty Ratings & Feedback",

  // Courses
  "courses.all": "All Courses",
  "courses.curriculum": "Course Curriculum",
  "courses.modules": "Course Curriculum",
  "courses.course_assignment": "Assign Faculty to Courses",

  // Targets
  "targets.all": "Target Plans & Assignments",
  "targets.assignments": "Target Plans & Assignments",
  "targets.leaderboard": "Leaderboard",
  "targets.incentives": "Incentive Approvals",
  "targets.performance": "My Targets & Rewards",

  // Assignments
  "assignments.all": "All Assignments",
  "assignments.create": "Create Assignment",
  "assignments.submissions": "Submissions Queue",
  "assignments.reviews": "Grading Queue",

  // Fees & reports
  "fees.reports": "Fee Collection Reports",
  "reports.financial": "Revenue & Finance Reports",

  // Communication
  "communication.automation": "Message Automation Rules",

  // Placement
  "placement.applications": "Job Applications",
};

/** Resolve label by itemKey with fallback. */
export const navLabel = (itemKey: string, fallback: string): string =>
  NAV_ITEM_LABELS[itemKey] ?? fallback;
