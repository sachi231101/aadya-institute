import type { ToolFunctionDefinition } from "../../../integrations/llm/llm.types";
import { AISecurityScopeService, type AIToolAuthContext } from "../security/ai-scope.service";
import { AppError } from "../../../middlewares/error.middleware";
import {
  executeGetStudentSummary,
  executeSearchStudents,
  executeGetStudentDetails,
} from "./student.tools";
import {
  executeGetAttendanceSummary,
  executeGetLowAttendanceStudents,
  executeGetBatchAttendance,
} from "./attendance.tools";
import {
  executeGetLeadSummary,
  executeGetCounsellorPerformance,
  executeGetLeadFollowups,
} from "./lead.tools";
import {
  executeGetAdmissionSummary,
  executeGetRecentAdmissions,
} from "./admission.tools";
import {
  executeGetFeeSummary,
  executeGetOverdueFees,
} from "./fee.tools";
import {
  executeGetCourseSummary,
  executeGetBatchSummary,
} from "./course.tools";
import {
  executeGetBranchSummary,
  executeGetDailyOperationsSummary,
} from "./dashboard.tools";

export const AI_TOOL_DEFINITIONS: ToolFunctionDefinition[] = [
  // 1. Student Tools
  {
    name: "get_student_summary",
    description: "Get aggregate counts of students (total, active, inactive, and by course) for the authorized branch/institute.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_students",
    description: "Search students by name, email, phone, or student code within authorized scope.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name, email, phone, or student code to search for" },
        limit: { type: "number", description: "Maximum number of results to return (default 5, max 10)" },
      },
    },
  },
  {
    name: "get_student_details",
    description: "Get detailed profile, attendance percentage, and pending fee status for a specific student.",
    parameters: {
      type: "object",
      properties: {
        studentId: { type: "string", description: "Specific student ID" },
        studentCode: { type: "string", description: "Student code (e.g. STU-001)" },
      },
    },
  },

  // 2. Attendance Tools
  {
    name: "get_attendance_summary",
    description: "Get overall attendance percentage and breakdown (present, absent, leave) for the authorized branch/institute.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_low_attendance_students",
    description: "Get the count and list of active students whose attendance rate is below a specified percentage threshold (default 75%).",
    parameters: {
      type: "object",
      properties: {
        threshold: { type: "number", description: "Attendance threshold percentage (default: 75)" },
        limit: { type: "number", description: "Max students to return (default: 10, max: 20)" },
      },
    },
  },
  {
    name: "get_batch_attendance",
    description: "Get attendance rate and session metrics for a specific batch.",
    parameters: {
      type: "object",
      properties: {
        batchId: { type: "string", description: "Specific batch ID" },
        batchName: { type: "string", description: "Batch name to match" },
      },
    },
  },

  // 3. Lead Tools
  {
    name: "get_lead_summary",
    description: "Get total leads and stage breakdown (new, assigned, contacted, interested, follow-up, converted, lost) for today, this week, or this month.",
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "week", "month", "all"], description: "Time period (default: month)" },
      },
    },
  },
  {
    name: "get_counsellor_performance",
    description: "Get lead assignment, conversion numbers, and conversion rates grouped by counsellor.",
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["month", "all"], description: "Time period (default: month)" },
      },
    },
  },
  {
    name: "get_lead_followups",
    description: "Get count and list of follow-up tasks (overdue, due today, upcoming).",
    parameters: {
      type: "object",
      properties: {},
    },
  },

  // 4. Admission Tools
  {
    name: "get_admission_summary",
    description: "Get total admissions count and breakdown by course for today, this week, or this month.",
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "week", "month", "all"], description: "Time period (default: month)" },
      },
    },
  },
  {
    name: "get_recent_admissions",
    description: "Get list of recent confirmed and provisional admissions.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results to return (default: 5, max: 15)" },
      },
    },
  },

  // 5. Fee Tools
  {
    name: "get_fee_summary",
    description: "Get financial summary of total collected fees and total pending/overdue fees.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_overdue_fees",
    description: "Get list and count of students with overdue or pending fee payments.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max students to return (default: 10, max: 20)" },
      },
    },
  },

  // 6. Course & Batch Tools
  {
    name: "get_course_summary",
    description: "Get list of courses with duration, module count, and number of enrolled students.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_batch_summary",
    description: "Get list of active batches with student count, assigned faculty, and module progress.",
    parameters: {
      type: "object",
      properties: {},
    },
  },

  // 7. Dashboard & Operations Tools
  {
    name: "get_branch_summary",
    description: "Get a comprehensive operational summary of the authorized branch/institute (students, batches, leads, follow-ups, pending fees).",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_daily_operations_summary",
    description: "Get today's operational summary: scheduled classes, new admissions, and follow-ups due today.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];

export async function executeAITool(
  toolName: string,
  rawArgs: any,
  context: AIToolAuthContext
): Promise<{ success: boolean; data: any; summaryText?: string }> {
  // Sanitize input arguments (strip any attempted branchId/instituteId/userId overrides)
  const args = AISecurityScopeService.sanitizeToolArgs(rawArgs, context);

  switch (toolName) {
    // Student tools
    case "get_student_summary":
      return { success: true, data: await executeGetStudentSummary(context, args) };
    case "search_students":
      return { success: true, data: await executeSearchStudents(context, args) };
    case "get_student_details":
      return { success: true, data: await executeGetStudentDetails(context, args) };

    // Attendance tools
    case "get_attendance_summary":
      return { success: true, data: await executeGetAttendanceSummary(context, args) };
    case "get_low_attendance_students":
      return { success: true, data: await executeGetLowAttendanceStudents(context, args) };
    case "get_batch_attendance":
      return { success: true, data: await executeGetBatchAttendance(context, args) };

    // Lead tools
    case "get_lead_summary":
      return { success: true, data: await executeGetLeadSummary(context, args) };
    case "get_counsellor_performance":
      return { success: true, data: await executeGetCounsellorPerformance(context, args) };
    case "get_lead_followups":
      return { success: true, data: await executeGetLeadFollowups(context, args) };

    // Admission tools
    case "get_admission_summary":
      return { success: true, data: await executeGetAdmissionSummary(context, args) };
    case "get_recent_admissions":
      return { success: true, data: await executeGetRecentAdmissions(context, args) };

    // Fee tools
    case "get_fee_summary":
      return { success: true, data: await executeGetFeeSummary(context, args) };
    case "get_overdue_fees":
      return { success: true, data: await executeGetOverdueFees(context, args) };

    // Course tools
    case "get_course_summary":
      return { success: true, data: await executeGetCourseSummary(context, args) };
    case "get_batch_summary":
      return { success: true, data: await executeGetBatchSummary(context, args) };

    // Dashboard tools
    case "get_branch_summary":
      return { success: true, data: await executeGetBranchSummary(context, args) };
    case "get_daily_operations_summary":
      return { success: true, data: await executeGetDailyOperationsSummary(context, args) };

    default:
      throw new AppError(`Unknown tool: ${toolName}`, 400);
  }
}
