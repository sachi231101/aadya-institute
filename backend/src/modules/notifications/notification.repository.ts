import { prisma } from "../../config/database";
import type {
  NotificationListResponse,
  UnreadCountResponse,
  CreateNotificationPayload,
  NotificationQueryFilters,
  NotificationType,
} from "./notification.types";

export const CENTER_MANAGER_ALLOWED_MODULES = [
  "dashboard",
  "students",
  "counsellor",
  "faculty",
  "fees",
  "admissions",
  "courses",
  "settings",
] as const;

export const FACULTY_ALLOWED_MODULES = [
  "dashboard",
  "courses",
  "students",
  "schedule",
  "assignments",
  "reports",
  "settings",
] as const;

export const STUDENT_ALLOWED_MODULES = [
  "dashboard",
  "attendance",
  "schedule",
  "assignments",
  "recordings",
  "settings",
] as const;

export const inferNotificationModule = (
  item: {
    type?: string | null;
    link?: string | null;
    title?: string | null;
    message?: string | null;
    metadata?: any;
  },
  roleContext?: string
): string => {
  if (item.metadata && typeof item.metadata === "object" && item.metadata.module) {
    const mod = String(item.metadata.module).toLowerCase();
    if (mod === "counselor") return "counsellor";
    if (mod === "leads") return "admissions";
    return mod;
  }
  const link = item.link || "";
  const title = (item.title || "").toLowerCase();
  const type = item.type || "";

  if (roleContext === "STUDENT") {
    if (link.includes("/attendance") || type === "ATTENDANCE" || title.includes("attendance")) return "attendance";
    if (link.includes("/assignments") || type === "ASSIGNMENT" || title.includes("assignment") || title.includes("homework") || title.includes("submission")) return "assignments";
    if (link.includes("/recordings") || title.includes("recording") || title.includes("video")) return "recordings";
    if (link.includes("/schedule") || type === "CLASS_SESSION" || title.includes("class") || title.includes("reminder") || title.includes("lecture") || title.includes("session")) return "schedule";
    if (link.includes("/settings") || title.includes("setting") || title.includes("preference")) return "settings";
    return "dashboard";
  }

  if (roleContext === "FACULTY") {
    if (link.includes("/reports") || title.includes("report") || title.includes("performance") || title.includes("insight")) return "reports";
    if (link.includes("/assignments") || type === "ASSIGNMENT" || title.includes("assignment") || title.includes("submission") || title.includes("grading")) return "assignments";
    if (link.includes("/courses") || title.includes("course") || title.includes("curriculum") || title.includes("syllabus")) return "courses";
    if (link.includes("/schedule") || type === "CLASS_SESSION" || title.includes("schedule") || title.includes("timetable") || title.includes("lecture")) return "schedule";
    if (link.includes("/students") || type === "ATTENDANCE" || type === "DISCONTINUATION_RISK" || title.includes("student") || title.includes("attendance")) return "students";
    if (link.includes("/settings") || title.includes("setting") || title.includes("preference")) return "settings";
    return "dashboard";
  }

  // Default / Center Manager / Admin
  if (link.includes("/fees") || type === "PAYMENT" || title.includes("fee") || title.includes("payment")) {
    return "fees";
  }
  if (
    link.includes("/admissions") ||
    link.includes("/leads") ||
    type === "ADMISSION" ||
    title.includes("admission") ||
    title.includes("enquiry") ||
    title.includes("lead") ||
    title.includes("application")
  ) {
    return "admissions";
  }
  if (link.includes("/counselor") || title.includes("counsellor") || title.includes("counselor")) {
    return "counsellor";
  }
  if (link.includes("/faculty") || title.includes("faculty") || title.includes("instructor") || title.includes("prof.")) {
    return "faculty";
  }
  if (
    link.includes("/students") ||
    type === "ATTENDANCE" ||
    type === "DISCONTINUATION_RISK" ||
    title.includes("student") ||
    title.includes("attendance") ||
    title.includes("discontinuation")
  ) {
    return "students";
  }
  if (
    link.includes("/courses") ||
    link.includes("/batches") ||
    link.includes("/curriculum") ||
    link.includes("/schedule") ||
    type === "CLASS_SESSION" ||
    title.includes("course") ||
    title.includes("batch") ||
    title.includes("curriculum")
  ) {
    return "courses";
  }
  if (link.includes("/settings") || title.includes("setting") || title.includes("preference") || title.includes("config")) {
    return "settings";
  }
  return "dashboard";
};

export class NotificationRepository {
  /**
   * Fetch notifications list with filters, role/module scoping and pagination
   */
  static async listNotifications(
    instituteId: string,
    userId: string,
    filters: NotificationQueryFilters = {},
    userRoles: string[] = [],
    userBranchId?: string | null
  ): Promise<NotificationListResponse> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const isCenterManager =
      (userRoles.includes("CENTER_MANAGER") && !userRoles.includes("ADMIN")) ||
      filters.role === "CENTER_MANAGER";
    const isFaculty =
      (userRoles.includes("FACULTY") && !userRoles.includes("ADMIN")) ||
      filters.role === "FACULTY";
    const isStudent =
      (userRoles.includes("STUDENT") && !userRoles.includes("ADMIN")) ||
      filters.role === "STUDENT";

    const effectiveRole = isStudent ? "STUDENT" : isFaculty ? "FACULTY" : isCenterManager ? "CENTER_MANAGER" : undefined;

    const whereCondition: any = {
      instituteId,
      OR: [
        { userId: userId },
        { userId: null },
      ],
    };

    // Branch isolation for Center Manager
    if (isCenterManager && userBranchId) {
      whereCondition.AND = [
        ...(whereCondition.AND || []),
        {
          OR: [
            { branchId: userBranchId },
            { branchId: null },
          ],
        },
      ];
    }

    if (filters.type) {
      whereCondition.type = filters.type;
    }

    if (filters.unreadOnly) {
      whereCondition.isRead = false;
    }

    if (filters.search) {
      whereCondition.AND = [
        ...(whereCondition.AND || []),
        {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { message: { contains: filters.search, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Fetch notifications from database
    const [rawTotal, allNotifications] = await Promise.all([
      prisma.notification.count({ where: whereCondition }),
      prisma.notification.findMany({
        where: whereCondition,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // If zero notifications exist in database, seed initial system notifications
    if (rawTotal === 0 && !filters.search && !filters.type) {
      await this.seedInitialNotifications(instituteId, userId, userRoles, userBranchId);
      return this.listNotifications(instituteId, userId, filters, userRoles, userBranchId);
    }

    // Filter and map notifications
    let filteredList = allNotifications;

    if (isCenterManager) {
      // Strictly restrict to notifications belonging to Center Manager's 8 modules
      filteredList = filteredList.filter((n) => {
        const link = n.link || "";
        if (link.startsWith("/student") || link.startsWith("/administration")) {
          return false;
        }
        const metadata = (n.metadata as any) || {};
        if (metadata.targetRole === "STUDENT" || metadata.targetRole === "ADMIN_SUPER") {
          return false;
        }
        const mod = inferNotificationModule(n, "CENTER_MANAGER");
        return CENTER_MANAGER_ALLOWED_MODULES.includes(mod as any);
      });
    } else if (isFaculty) {
      // Strictly restrict to notifications belonging to Faculty modules
      filteredList = filteredList.filter((n) => {
        const link = n.link || "";
        if (link.startsWith("/student") || link.startsWith("/administration") || link.startsWith("/center/fees") || link.startsWith("/center/admissions") || link.startsWith("/admin/fees")) {
          return false;
        }
        const metadata = (n.metadata as any) || {};
        if (metadata.targetRole === "STUDENT" || metadata.targetRole === "ADMIN_SUPER" || metadata.targetRole === "COUNSELLOR") {
          return false;
        }
        if (n.type === "PAYMENT" || n.type === "AI_CALL") {
          return false;
        }
        const mod = inferNotificationModule(n, "FACULTY");
        return FACULTY_ALLOWED_MODULES.includes(mod as any);
      });
    } else if (isStudent) {
      // Strictly restrict to notifications belonging to Student modules
      filteredList = filteredList.filter((n) => {
        const link = n.link || "";
        if (link.startsWith("/admin") || link.startsWith("/center") || link.startsWith("/faculty") || link.startsWith("/counselor") || link.startsWith("/administration")) {
          return false;
        }
        const metadata = (n.metadata as any) || {};
        if (metadata.targetRole && metadata.targetRole !== "STUDENT") {
          return false;
        }
        if (n.type === "PAYMENT" || n.type === "AI_CALL" || n.type === "DISCONTINUATION_RISK") {
          // If it's a general staff alert, exclude
          if (!n.userId) return false;
        }
        const mod = inferNotificationModule(n, "STUDENT");
        return STUDENT_ALLOWED_MODULES.includes(mod as any);
      });
    }

    // Filter by specific module if requested
    if (filters.module) {
      const targetMod = filters.module.toLowerCase();
      filteredList = filteredList.filter((n) => {
        const mod = inferNotificationModule(n, effectiveRole);
        return mod === targetMod;
      });
    }

    const total = filteredList.length;
    const unreadCount = filteredList.filter((n) => !n.isRead).length;
    const paginatedItems = filteredList.slice(skip, skip + limit);

    const formattedItems = paginatedItems.map((n) => {
      const mod = inferNotificationModule(n, effectiveRole);
      let link = n.link;
      if (effectiveRole) {
        const rolePrefix = isStudent ? "/student" : isFaculty ? "/faculty" : isCenterManager ? "/center" : "/admin";
        if (link) {
          link = link.replace(/^\/(admin|center|counselor|faculty|student)/, rolePrefix);
        }
      }

      return {
        id: n.id,
        userId: n.userId,
        instituteId: n.instituteId,
        branchId: n.branchId,
        title: n.title || "Notification",
        message: n.message || "",
        type: n.type as NotificationType,
        module: mod,
        link,
        isRead: n.isRead,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        metadata: n.metadata,
        createdAt: n.createdAt.toISOString(),
      };
    });

    return {
      notifications: formattedItems,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get total unread count for user header badge with role & module scoping
   */
  static async getUnreadCount(
    instituteId: string,
    userId: string,
    userRoles: string[] = [],
    userBranchId?: string | null
  ): Promise<UnreadCountResponse> {
    const isCenterManager =
      userRoles.includes("CENTER_MANAGER") && !userRoles.includes("ADMIN");
    const isFaculty =
      userRoles.includes("FACULTY") && !userRoles.includes("ADMIN");
    const isStudent =
      userRoles.includes("STUDENT") && !userRoles.includes("ADMIN");

    const whereCondition: any = {
      instituteId,
      OR: [{ userId: userId }, { userId: null }],
      isRead: false,
    };

    if (isCenterManager && userBranchId) {
      whereCondition.AND = [
        {
          OR: [{ branchId: userBranchId }, { branchId: null }],
        },
      ];
    }

    const unreadNotifications = await prisma.notification.findMany({
      where: whereCondition,
    });

    if (isCenterManager) {
      const filtered = unreadNotifications.filter((n) => {
        const link = n.link || "";
        if (link.startsWith("/student") || link.startsWith("/administration")) {
          return false;
        }
        const metadata = (n.metadata as any) || {};
        if (metadata.targetRole === "STUDENT" || metadata.targetRole === "ADMIN_SUPER") {
          return false;
        }
        const mod = inferNotificationModule(n, "CENTER_MANAGER");
        return CENTER_MANAGER_ALLOWED_MODULES.includes(mod as any);
      });
      return { unreadCount: filtered.length };
    }

    if (isFaculty) {
      const filtered = unreadNotifications.filter((n) => {
        const link = n.link || "";
        if (link.startsWith("/student") || link.startsWith("/administration") || link.startsWith("/center/fees") || link.startsWith("/center/admissions") || link.startsWith("/admin/fees")) {
          return false;
        }
        const metadata = (n.metadata as any) || {};
        if (metadata.targetRole === "STUDENT" || metadata.targetRole === "ADMIN_SUPER" || metadata.targetRole === "COUNSELLOR") {
          return false;
        }
        if (n.type === "PAYMENT" || n.type === "AI_CALL") {
          return false;
        }
        const mod = inferNotificationModule(n, "FACULTY");
        return FACULTY_ALLOWED_MODULES.includes(mod as any);
      });
      return { unreadCount: filtered.length };
    }

    if (isStudent) {
      const filtered = unreadNotifications.filter((n) => {
        const link = n.link || "";
        if (link.startsWith("/admin") || link.startsWith("/center") || link.startsWith("/faculty") || link.startsWith("/counselor") || link.startsWith("/administration")) {
          return false;
        }
        const metadata = (n.metadata as any) || {};
        if (metadata.targetRole && metadata.targetRole !== "STUDENT") {
          return false;
        }
        if (n.type === "PAYMENT" || n.type === "AI_CALL" || n.type === "DISCONTINUATION_RISK") {
          if (!n.userId) return false;
        }
        const mod = inferNotificationModule(n, "STUDENT");
        return STUDENT_ALLOWED_MODULES.includes(mod as any);
      });
      return { unreadCount: filtered.length };
    }

    return { unreadCount: unreadNotifications.length };
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      id: updated.id,
      isRead: updated.isRead,
      readAt: updated.readAt?.toISOString(),
    };
  }

  /**
   * Mark all unread notifications as read
   */
  static async markAllAsRead(
    instituteId: string,
    userId: string,
    userRoles: string[] = [],
    userBranchId?: string | null
  ) {
    const isCenterManager =
      userRoles.includes("CENTER_MANAGER") && !userRoles.includes("ADMIN");

    const whereCondition: any = {
      instituteId,
      OR: [{ userId: userId }, { userId: null }],
      isRead: false,
    };

    if (isCenterManager && userBranchId) {
      whereCondition.AND = [
        {
          OR: [{ branchId: userBranchId }, { branchId: null }],
        },
      ];
    }

    const result = await prisma.notification.updateMany({
      where: whereCondition,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true, count: result.count };
  }

  /**
   * Create a new notification (used by event triggers)
   */
  static async createNotification(payload: CreateNotificationPayload) {
    const metadata = payload.metadata || {};
    if (payload.module) {
      metadata.module = payload.module;
    }

    return prisma.notification.create({
      data: {
        userId: payload.userId || null,
        instituteId: payload.instituteId,
        branchId: payload.branchId || null,
        title: payload.title,
        message: payload.message,
        type: payload.type || "SYSTEM",
        link: payload.link || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        isRead: false,
      },
    });
  }

  /**
   * Delete a notification entry
   */
  static async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true, message: "Notification deleted" };
  }

  /**
   * Seed realistic initial system notifications matching user role
   */
  private static async seedInitialNotifications(
    instituteId: string,
    userId: string,
    userRoles: string[] = [],
    userBranchId?: string | null
  ) {
    const isCounselor = userRoles.includes("COUNSELLOR") && !userRoles.includes("ADMIN");
    const isCenterManager = userRoles.includes("CENTER_MANAGER") && !userRoles.includes("ADMIN");
    const isFaculty = userRoles.includes("FACULTY") && !userRoles.includes("ADMIN");
    const isStudent = userRoles.includes("STUDENT") && !userRoles.includes("ADMIN");

    const now = new Date();

    let initialEvents: Array<{
      title: string;
      message: string;
      type: NotificationType;
      module: string;
      link: string;
      createdAt: Date;
    }> = [];

    if (isStudent) {
      initialEvents = [
        {
          title: "Welcome to Aadya Student Portal",
          message: "Explore your enrolled courses, daily attendance, class timetable, and learning resources.",
          type: "SYSTEM",
          module: "dashboard",
          link: "/student/dashboard",
          createdAt: new Date(now.getTime() - 1000 * 60 * 10),
        },
        {
          title: "Upcoming Class Reminder",
          message: "'React Hooks & State Management' starts in 2 hours at 10:00 AM.",
          type: "CLASS_SESSION",
          module: "schedule",
          link: "/student/dashboard",
          createdAt: new Date(now.getTime() - 1000 * 60 * 30),
        },
        {
          title: "Attendance Record Updated",
          message: "Your attendance for yesterday's Full-Stack Web Dev class was recorded as PRESENT.",
          type: "ATTENDANCE",
          module: "attendance",
          link: "/student/attendance",
          createdAt: new Date(now.getTime() - 1000 * 60 * 120),
        },
        {
          title: "New Assignment Published",
          message: "'Build a Responsive Dashboard with Tailwind CSS' has been assigned. Due in 5 days.",
          type: "ASSIGNMENT",
          module: "assignments",
          link: "/student/dashboard",
          createdAt: new Date(now.getTime() - 1000 * 60 * 240),
        },
        {
          title: "Class Recording Available",
          message: "Video recording for 'TypeScript Generics & APIs' is now ready for review.",
          type: "SYSTEM",
          module: "recordings",
          link: "/student/dashboard",
          createdAt: new Date(now.getTime() - 1000 * 60 * 360),
        },
        {
          title: "Notification Settings Configured",
          message: "WhatsApp class reminders and session notifications are enabled.",
          type: "SYSTEM",
          module: "settings",
          link: "/student/settings",
          createdAt: new Date(now.getTime() - 1000 * 60 * 600),
        },
      ];
    } else if (isFaculty) {
      initialEvents = [
        {
          title: "Teaching Desk Daily Summary",
          message: "You have 2 lecture sessions scheduled for today across active batches.",
          type: "SYSTEM",
          module: "dashboard",
          link: "/faculty/dashboard",
          createdAt: new Date(now.getTime() - 1000 * 60 * 10),
        },
        {
          title: "Assigned Batch Curriculum Update",
          message: "Full-Stack Web Development Batch A syllabus progress is now at 65%.",
          type: "CLASS_SESSION",
          module: "courses",
          link: "/faculty/courses",
          createdAt: new Date(now.getTime() - 1000 * 60 * 45),
        },
        {
          title: "Attendance Desk Reminder",
          message: "Please mark and submit attendance for today's 10:00 AM Data Science lecture session.",
          type: "ATTENDANCE",
          module: "students",
          link: "/faculty/students/attendance",
          createdAt: new Date(now.getTime() - 1000 * 60 * 120),
        },
        {
          title: "Class Session Timetable",
          message: "Tomorrow's 'Advanced React Patterns & Optimization' class starts at 09:30 AM.",
          type: "CLASS_SESSION",
          module: "schedule",
          link: "/faculty/schedule/classes",
          createdAt: new Date(now.getTime() - 1000 * 60 * 240),
        },
        {
          title: "Student Batch Performance Insights",
          message: "Monthly student evaluation and quiz results have been compiled for your batches.",
          type: "SYSTEM",
          module: "reports",
          link: "/faculty/reports/students",
          createdAt: new Date(now.getTime() - 1000 * 60 * 360),
        },
        {
          title: "Faculty Availability Settings",
          message: "Update your weekly teaching availability and notification alerts.",
          type: "SYSTEM",
          module: "settings",
          link: "/faculty/settings",
          createdAt: new Date(now.getTime() - 1000 * 60 * 600),
        },
      ];
    } else if (isCenterManager) {
      initialEvents = [
        {
          title: "Branch Operations Overview",
          message: "Daily center operations summary is available. 94% attendance across active batches today.",
          type: "SYSTEM",
          module: "dashboard",
          link: "/center/dashboard",
          createdAt: new Date(now.getTime() - 1000 * 60 * 10),
        },
        {
          title: "Attendance Risk Alert",
          message: "Student Vikram Singh missed 3 consecutive theory classes in Data Science batch.",
          type: "DISCONTINUATION_RISK",
          module: "students",
          link: "/center/students/attendance",
          createdAt: new Date(now.getTime() - 1000 * 60 * 35),
        },
        {
          title: "Counsellor Lead Follow-up Pending",
          message: "5 new prospective student leads assigned to Counsellor Priya require initial contact.",
          type: "AI_CALL",
          module: "counsellor",
          link: "/center/counselor/overview",
          createdAt: new Date(now.getTime() - 1000 * 60 * 60),
        },
        {
          title: "Faculty Course Allocation",
          message: "Prof. Rajesh Kumar has been allocated to Full-Stack Web Development Batch A.",
          type: "SYSTEM",
          module: "faculty",
          link: "/center/faculty/courses",
          createdAt: new Date(now.getTime() - 1000 * 60 * 120),
        },
        {
          title: "Fee Payment Received",
          message: "Received ₹25,000 via UPI for Installment #1 from Priya Patel.",
          type: "PAYMENT",
          module: "fees",
          link: "/center/fees/payments",
          createdAt: new Date(now.getTime() - 1000 * 60 * 180),
        },
        {
          title: "New Admission Application",
          message: "Student Ananya Roy submitted an application for Data Science & AI batch.",
          type: "ADMISSION",
          module: "admissions",
          link: "/center/admissions/applications",
          createdAt: new Date(now.getTime() - 1000 * 60 * 300),
        },
        {
          title: "New Batch Scheduled",
          message: "React & TypeScript Masterclass batch scheduled to start on Monday at 10:00 AM.",
          type: "CLASS_SESSION",
          module: "courses",
          link: "/center/courses/batches",
          createdAt: new Date(now.getTime() - 1000 * 60 * 420),
        },
        {
          title: "Center Notification Preferences",
          message: "Automated WhatsApp and attendance notifications configured for this center.",
          type: "SYSTEM",
          module: "settings",
          link: "/center/settings",
          createdAt: new Date(now.getTime() - 1000 * 60 * 600),
        },
      ];
    } else if (isCounselor) {
      initialEvents = [
        {
          title: "New Lead Assigned",
          message: "Prospective student lead Ananya Roy assigned for counselling follow-up.",
          type: "AI_CALL",
          module: "admissions",
          link: "/counselor/admissions/enquiries",
          createdAt: new Date(now.getTime() - 1000 * 60 * 15),
        },
        {
          title: "AI Voice Call Summary Ready",
          message: "AI voice call completed with High Interest status for lead Ananya Roy.",
          type: "AI_CALL",
          module: "admissions",
          link: "/counselor/admissions/enquiries",
          createdAt: new Date(now.getTime() - 1000 * 60 * 45),
        },
        {
          title: "New Student Application",
          message: "Student Application submitted for Full-Stack Web Development course.",
          type: "ADMISSION",
          module: "admissions",
          link: "/counselor/admissions/applications",
          createdAt: new Date(now.getTime() - 1000 * 60 * 180),
        },
        {
          title: "Counsellor Follow-up Reminder",
          message: "Scheduled follow-up call with prospective student Rahul Verma.",
          type: "SYSTEM",
          module: "counsellor",
          link: "/counselor/dashboard",
          createdAt: new Date(now.getTime() - 1000 * 60 * 360),
        },
      ];
    } else {
      initialEvents = [
        {
          title: "New Admission Confirmed",
          message: "Student Rahul Sharma has completed enrollment for Full-Stack Web Development batch.",
          type: "ADMISSION",
          module: "admissions",
          link: "/admin/students",
          createdAt: new Date(now.getTime() - 1000 * 60 * 12),
        },
        {
          title: "Fee Payment Received",
          message: "Received ₹25,000 via UPI for Installment #1 from Priya Patel.",
          type: "PAYMENT",
          module: "fees",
          link: "/admin/fees/payments",
          createdAt: new Date(now.getTime() - 1000 * 60 * 45),
        },
        {
          title: "Attendance Risk Alert",
          message: "Student Vikram Singh missed 3 consecutive theory classes in Data Science batch.",
          type: "DISCONTINUATION_RISK",
          module: "students",
          link: "/admin/students/attendance",
          createdAt: new Date(now.getTime() - 1000 * 60 * 180),
        },
        {
          title: "AI Voice Call Completed",
          message: "Lead Ananya Roy indicated high admission intent during automated AI voice call.",
          type: "AI_CALL",
          module: "admissions",
          link: "/admin/admissions/enquiries",
          createdAt: new Date(now.getTime() - 1000 * 60 * 360),
        },
        {
          title: "Class Session Scheduled",
          message: "New Class Session 'React Hooks & State Management' scheduled for tomorrow 10:00 AM.",
          type: "CLASS_SESSION",
          module: "courses",
          link: "/admin/courses/batches",
          createdAt: new Date(now.getTime() - 1000 * 60 * 720),
        },
      ];
    }

    for (const item of initialEvents) {
      await prisma.notification.create({
        data: {
          instituteId,
          userId,
          branchId: userBranchId || null,
          title: item.title,
          message: item.message,
          type: item.type,
          link: item.link,
          metadata: { module: item.module },
          isRead: false,
          createdAt: item.createdAt,
        },
      });
    }
  }
}
