import { prisma } from "../../config/database";
import type {
  StudentReportResponse,
  FacultyReportResponse,
  CourseReportResponse,
  FinancialReportResponse,
} from "./report.types";

export class ReportRepository {
  /**
   * Get aggregated Student analytics & directory data strictly from PostgreSQL
   */
  static async getStudentReportData(instituteId: string, branchId?: string): Promise<StudentReportResponse> {
    const whereBranch = branchId ? { branchId } : {};

    const students = await prisma.student.findMany({
      where: {
        instituteId,
        ...whereBranch,
      },
      include: {
        user: { select: { name: true, email: true } },
        branch: { select: { name: true } },
        admissions: {
          include: {
            course: { select: { name: true, code: true } },
          },
        },
        studentAttendances: true,
        assignmentSubmissions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const totalStudents = students.length;

    let sumAttendance = 0;
    let totalAssignmentsAvailable = 0;
    let totalAssignmentsCompleted = 0;
    let discontinuationRiskCount = 0;

    let countRange90_100 = 0;
    let countRange75_89 = 0;
    let countRange50_74 = 0;
    let countRangeBelow50 = 0;

    const studentRows = students.map((s) => {
      const studentName = s.user?.name || `Student ${s.studentCode}`;
      const courseName = s.admissions[0]?.course?.name || "Unassigned";
      const branchName = s.branch?.name || "Main Branch";

      const totalClasses = s.studentAttendances.length;
      const presentClasses = s.studentAttendances.filter((a) => a.status === "PRESENT").length;
      const attendancePct = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

      if (totalClasses > 0) {
        sumAttendance += attendancePct;
      }

      if (attendancePct >= 90 && totalClasses > 0) countRange90_100++;
      else if (attendancePct >= 75 && totalClasses > 0) countRange75_89++;
      else if (attendancePct >= 50 && totalClasses > 0) countRange50_74++;
      else if (totalClasses > 0) countRangeBelow50++;

      const submittedCount = s.assignmentSubmissions.length;
      const totalCount = submittedCount;
      totalAssignmentsCompleted += submittedCount;
      totalAssignmentsAvailable += totalCount;

      let riskFlag: "Normal" | "At Risk" | "Triggered" = "Normal";
      if (attendancePct < 50 && totalClasses > 0) {
        riskFlag = "Triggered";
        discontinuationRiskCount++;
      } else if (attendancePct < 75 && totalClasses > 0) {
        riskFlag = "At Risk";
      }

      return {
        id: s.id,
        studentCode: s.studentCode,
        name: studentName,
        branchName,
        courseName,
        attendancePercentage: attendancePct,
        assignmentsSubmitted: submittedCount,
        totalAssignments: totalCount,
        riskFlag,
      };
    });

    const studentsWithClasses = students.filter((s) => s.studentAttendances.length > 0).length;
    const avgAttendance = studentsWithClasses > 0 ? Math.round(sumAttendance / studentsWithClasses) : 0;
    const assignmentCompletionRate =
      totalAssignmentsAvailable > 0
        ? Math.round((totalAssignmentsCompleted / totalAssignmentsAvailable) * 100)
        : 0;

    // Monthly Enrollment Growth Trend (Last 6 Months strictly from DB)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const enrollmentTrend = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const countInMonth = students.filter((s) => new Date(s.createdAt) <= endOfMonth).length;

      enrollmentTrend.push({
        month: mLabel,
        students: countInMonth,
      });
    }

    // Attendance Distribution strictly from DB counts
    const attendanceDistribution = [
      { range: "90-100% Attendance", count: countRange90_100, color: "#10b981" },
      { range: "75-89% Attendance", count: countRange75_89, color: "#1769AA" },
      { range: "50-74% Attendance", count: countRange50_74, color: "#f59e0b" },
      { range: "Below 50% (Risk)", count: countRangeBelow50, color: "#ef4444" },
    ];

    // Course Share strictly from DB
    const courseMap = new Map<string, number>();
    students.forEach((s) => {
      const cName = s.admissions[0]?.course?.name || "Unassigned";
      courseMap.set(cName, (courseMap.get(cName) || 0) + 1);
    });

    const colors = ["#1769AA", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#3b82f6"];
    let colorIdx = 0;
    const courseShare = Array.from(courseMap.entries()).map(([name, value]) => ({
      name,
      value,
      color: colors[colorIdx++ % colors.length],
    }));

    return {
      summary: {
        totalStudents,
        avgAttendanceRate: avgAttendance,
        assignmentCompletionRate,
        discontinuationRiskCount,
      },
      enrollmentTrend,
      attendanceDistribution,
      courseShare,
      students: studentRows,
    };
  }

  /**
   * Get aggregated Faculty analytics & directory data strictly from PostgreSQL
   */
  static async getFacultyReportData(instituteId: string, branchId?: string): Promise<FacultyReportResponse> {
    const whereBranch = branchId ? { branchId } : {};

    const faculty = await prisma.faculty.findMany({
      where: {
        instituteId,
        ...whereBranch,
      },
      include: {
        user: { select: { name: true, email: true } },
        batches: { select: { id: true, name: true } },
        classSessions: { select: { id: true, startTime: true, endTime: true, status: true } },
      },
    });

    const totalActiveFaculty = faculty.filter((f) => f.status === "ACTIVE").length;

    // Fetch Feedback ratings from database
    const feedbacks = await prisma.feedback.findMany({
      where: {
        classSession: {
          batch: {
            instituteId,
            ...(branchId ? { branchId } : {}),
          },
        },
      },
      select: { rating: true },
    });

    let totalRatingSum = 0;
    let rating5 = 0;
    let rating4 = 0;
    let rating3 = 0;
    let ratingBelow3 = 0;

    feedbacks.forEach((fb) => {
      totalRatingSum += fb.rating;
      if (fb.rating === 5) rating5++;
      else if (fb.rating === 4) rating4++;
      else if (fb.rating === 3) rating3++;
      else ratingBelow3++;
    });

    const avgStudentRating = feedbacks.length > 0 ? Number((totalRatingSum / feedbacks.length).toFixed(1)) : 0;

    // Fetch Class Sessions for Session Compliance calculation
    const allClassSessions = await prisma.classSession.findMany({
      where: {
        batch: {
          instituteId,
          ...(branchId ? { branchId } : {}),
        },
      },
      select: { id: true, status: true, sessionStatus: true, startTime: true, endTime: true },

    });

    const completedSessions = allClassSessions.filter((cs) => cs.sessionStatus === "COMPLETED").length;

    const sessionCompliancePercentage =
      allClassSessions.length > 0 ? Math.round((completedSessions / allClassSessions.length) * 100) : 0;

    let totalMonthlyTeachingHours = 0;
    const workloadList: { name: string; hours: number; batches: number }[] = [];

    const facultyRows = faculty.map((f) => {
      const name = f.user?.name || `Faculty ${f.employeeCode}`;
      const batchesCount = f.batches.length;

      let hours = 0;
      f.classSessions.forEach((cs) => {
        if (cs.startTime && cs.endTime) {
          const start = new Date(cs.startTime).getTime();
          const end = new Date(cs.endTime).getTime();
          if (!isNaN(start) && !isNaN(end) && end > start) {
            hours += (end - start) / (1000 * 60 * 60);
          } else {
            hours += 2;
          }
        } else {
          hours += 2;
        }
      });
      hours = Math.round(hours);
      totalMonthlyTeachingHours += hours;

      workloadList.push({
        name,
        hours,
        batches: batchesCount,
      });

      return {
        id: f.id,
        facultyCode: f.employeeCode,
        name,
        specialization: f.specialization || "Unspecified",
        assignedBatchesCount: batchesCount,
        teachingHours: hours,
        avgRating: avgStudentRating,
        status: f.status,
      };
    });

    const ratingDistribution = [
      { rating: "5 Stars (Excellent)", count: rating5, color: "#10b981" },
      { rating: "4 Stars (Good)", count: rating4, color: "#1769AA" },
      { rating: "3 Stars (Average)", count: rating3, color: "#f59e0b" },
      { rating: "Below 3 Stars", count: ratingBelow3, color: "#ef4444" },
    ];

    return {
      summary: {
        totalActiveFaculty,
        avgStudentRating,
        monthlyTeachingHours: totalMonthlyTeachingHours,
        sessionCompliancePercentage,
      },
      workload: workloadList,
      ratingDistribution,
      faculty: facultyRows,
    };
  }

  /**
   * Get aggregated Course analytics & directory data strictly from PostgreSQL
   */
  static async getCourseReportData(instituteId: string): Promise<CourseReportResponse> {
    const courses = await prisma.course.findMany({
      where: { instituteId },
      include: {
        modules: true,
        batches: {
          include: {
            enrollments: true,
          },
        },
        admissions: true,
      },
    });

    const totalCourses = courses.length;
    let activeBatches = 0;
    let totalCapacity = 0;
    let totalEnrolled = 0;
    let totalModules = 0;

    const courseComparison: { course: string; students: number; capacity: number }[] = [];

    const courseRows = courses.map((c) => {
      const cBatches = c.batches || [];
      const activeBatchesCount = cBatches.filter((b) => b.status === "ACTIVE").length;
      activeBatches += activeBatchesCount;

      let cEnrolled = 0;
      let cCapacity = 0;

      cBatches.forEach((b) => {
        cEnrolled += b.enrollments?.length || 0;
        cCapacity += b.capacity || 0;
      });

      if (cEnrolled === 0) cEnrolled = c.admissions.length;

      totalEnrolled += cEnrolled;
      totalCapacity += cCapacity;

      const mCount = c.modules?.length || 0;
      totalModules += mCount;

      courseComparison.push({
        course: c.code || c.name,
        students: cEnrolled,
        capacity: cCapacity,
      });

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        category: c.category || "General",
        durationMonths: c.duration || 0,
        modulesCount: mCount,
        enrolledStudents: cEnrolled,
        batchesCount: cBatches.length,
        status: c.status,
      };
    });

    const avgOccupancy = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

    const structureOverview = [
      { status: "Total Active Modules", count: totalModules, color: "#10b981" },
      { status: "Active Cohort Batches", count: activeBatches, color: "#1769AA" },
      { status: "Total Academy Courses", count: totalCourses, color: "#f59e0b" },
    ];

    return {
      summary: {
        totalCourses,
        activeBatches,
        avgBatchOccupancy: avgOccupancy,
        totalModules,
      },
      enrollmentComparison: courseComparison,
      structureOverview,
      courses: courseRows,
    };
  }

  /**
   * Get aggregated Financial health & revenue data strictly from PostgreSQL
   */
  static async getFinancialReportData(instituteId: string, branchId?: string): Promise<FinancialReportResponse> {
    const whereBranch = branchId ? { branchId } : {};

    // Payments strictly from DB
    const payments = await prisma.payment.findMany({
      where: {
        instituteId,
        ...whereBranch,
      },
    });

    // Pending Fees strictly from DB
    const pendingFees = await prisma.pendingFee.findMany({
      where: {
        instituteId,
        ...whereBranch,
      },
    });

    let totalCollected = 0;
    let upiAmount = 0;
    let netbankingAmount = 0;
    let cardAmount = 0;
    let cashAmount = 0;

    payments.forEach((p) => {
      if (p.status === "SUCCESS") {
        totalCollected += p.amount;
        if (p.method === "UPI") upiAmount += p.amount;
        else if (p.method === "NET_BANKING") netbankingAmount += p.amount;
        else if (p.method === "CARD") cardAmount += p.amount;
        else cashAmount += p.amount;
      }
    });

    let totalPending = 0;
    pendingFees.forEach((pf) => {
      totalPending += pf.dueAmount;
    });

    const totalPotential = totalCollected + totalPending;
    const collectionRate = totalPotential > 0 ? Math.round((totalCollected / totalPotential) * 100) : 0;

    // Monthly Trend (Last 6 Months strictly from DB)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthlyTrend = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const monthCollected = payments
        .filter((p) => {
          const pDate = p.date ? new Date(p.date) : new Date(p.createdAt);
          return p.status === "SUCCESS" && pDate >= startOfMonth && pDate <= endOfMonth;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const monthPending = pendingFees
        .filter((pf) => {
          const pfDate = new Date(pf.createdAt);
          return pfDate >= startOfMonth && pfDate <= endOfMonth;
        })
        .reduce((sum, pf) => sum + pf.dueAmount, 0);

      monthlyTrend.push({
        month: mLabel,
        collected: monthCollected,
        pending: monthPending,
      });
    }

    const paymentMethodShare = [
      { name: "UPI / QR", value: upiAmount, color: "#10b981" },
      { name: "NetBanking", value: netbankingAmount, color: "#1769AA" },
      { name: "Credit/Debit Card", value: cardAmount, color: "#8b5cf6" },
      { name: "Cash / Desk", value: cashAmount, color: "#f59e0b" },
    ];

    return {
      summary: {
        totalCollected,
        totalPending,
        collectionRate,
        projectedRevenue: totalPotential,
      },
      monthlyTrend,
      paymentMethodShare,
      monthlyBreakdown: monthlyTrend,
    };
  }
}
