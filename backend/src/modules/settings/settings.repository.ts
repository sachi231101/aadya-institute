import bcrypt from "bcrypt";
import { prisma } from "../../config/database";
import type {
  UserSettingsResponse,
  UpdatePersonalPayload,
  ChangePasswordPayload,
  UpdateNotificationPayload,
  UpdateSystemPayload,
} from "./settings.types";

export class SettingsRepository {
  /**
   * Fetch current user settings, profile metadata, and active refresh sessions strictly from DB
   */
  static async getUserSettings(userId: string): Promise<UserSettingsResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        branch: { select: { name: true } },
        userRoles: {
          include: {
            role: true,
          },
        },
        settings: true,
        refreshTokens: {
          where: {
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const primaryRole = user.userRoles[0]?.role?.name || "ADMIN";

    // Ensure default settings exist or create them with empty defaults
    let settings = user.settings;
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          designation: "",
          department: "",
          primaryBranch: user.branch?.name || "",
        },
      });
    }

    const activeSessions = user.refreshTokens.map((rt) => ({
      id: rt.id,
      tokenHashPreview: `••••${rt.tokenHash.slice(-6)}`,
      expiresAt: rt.expiresAt.toISOString(),
      createdAt: rt.createdAt.toISOString(),
    }));

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email || "",
        phone: user.phone || "",
        role: primaryRole,
        status: user.status,
      },
      settings: {
        designation: settings.designation || "",
        department: settings.department || "",
        language: settings.language || "English (US)",
        timezone: settings.timezone || "(GMT+05:30) India Standard Time",
        twoFactorEnabled: settings.twoFactorEnabled,
        emailAdmissions: settings.emailAdmissions,
        emailFeeAlerts: settings.emailFeeAlerts,
        emailAttendance: settings.emailAttendance,
        whatsappReminders: settings.whatsappReminders,
        aiCallAlerts: settings.aiCallAlerts,
        primaryBranch: settings.primaryBranch || user.branch?.name || "",
        currencyFormat: settings.currencyFormat || "INR (₹)",
        themeMode: settings.themeMode || "LIGHT",
        autoLogoutMinutes: settings.autoLogoutMinutes || 30,
      },
      activeSessions,
    };
  }

  /**
   * Update Personal Information in User and UserSettings tables
   */
  static async updatePersonalInfo(userId: string, payload: UpdatePersonalPayload) {
    const { name, email, phone, designation, department, language, timezone } = payload;

    // 1. Update User basic info
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone,
      },
    });

    // 2. Upsert UserSettings metadata
    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        designation: designation || "",
        department: department || "",
        language: language || "English (US)",
        timezone: timezone || "(GMT+05:30) India Standard Time",
      },
      update: {
        ...(designation !== undefined && { designation }),
        ...(department !== undefined && { department }),
        ...(language !== undefined && { language }),
        ...(timezone !== undefined && { timezone }),
      },
    });

    return {
      user: updatedUser,
      settings: updatedSettings,
    };
  }

  /**
   * Verify current password and update password hash
   */
  static async changePassword(userId: string, payload: ChangePasswordPayload) {
    const { currentPassword, newPassword } = payload;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error("Invalid current password");
    }

    const { loadInstitutePolicy } = await import("../security/security.service");
    const { validatePasswordAgainstPolicy } = await import(
      "../../utils/password-policy.util"
    );
    const policy = await loadInstitutePolicy(user.instituteId);
    const policyError = validatePasswordAgainstPolicy(newPassword, policy);
    if (policyError) {
      throw new Error(policyError);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return { success: true, message: "Password updated successfully" };
  }

  /**
   * Update Notification Preferences with explicit property mapping
   */
  static async updateNotificationPreferences(userId: string, payload: UpdateNotificationPayload) {
    const dataToUpdate: Record<string, boolean> = {};
    if (payload.emailAdmissions !== undefined) dataToUpdate.emailAdmissions = payload.emailAdmissions;
    if (payload.emailFeeAlerts !== undefined) dataToUpdate.emailFeeAlerts = payload.emailFeeAlerts;
    if (payload.emailAttendance !== undefined) dataToUpdate.emailAttendance = payload.emailAttendance;
    if (payload.whatsappReminders !== undefined) dataToUpdate.whatsappReminders = payload.whatsappReminders;
    if (payload.aiCallAlerts !== undefined) dataToUpdate.aiCallAlerts = payload.aiCallAlerts;

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...dataToUpdate,
      },
      update: dataToUpdate,
    });

    return updatedSettings;
  }

  /**
   * Update System Preferences with explicit property mapping
   */
  static async updateSystemPreferences(userId: string, payload: UpdateSystemPayload) {
    const dataToUpdate: Record<string, any> = {};
    if (payload.primaryBranch !== undefined) dataToUpdate.primaryBranch = payload.primaryBranch;
    if (payload.currencyFormat !== undefined) dataToUpdate.currencyFormat = payload.currencyFormat;
    if (payload.themeMode !== undefined) dataToUpdate.themeMode = payload.themeMode;
    if (payload.autoLogoutMinutes !== undefined) dataToUpdate.autoLogoutMinutes = payload.autoLogoutMinutes;

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...dataToUpdate,
      },
      update: dataToUpdate,
    });

    return updatedSettings;
  }

  /**
   * Revoke an active refresh token session
   */
  static async revokeSession(userId: string, sessionId: string) {
    const session = await prisma.refreshToken.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error("Session not found or unauthorized");
    }

    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    return { success: true, message: "Session revoked successfully" };
  }

  static async getSystemSettingsByCategory(instituteId: string, category: string) {
    const rows = await prisma.systemSetting.findMany({
      where: { instituteId, category },
      orderBy: { key: "asc" },
    });
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return { category, settings, rows };
  }

  static async upsertSystemSettings(
    instituteId: string,
    category: string,
    settings: Record<string, unknown>
  ) {
    const entries = Object.entries(settings);
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.systemSetting.upsert({
          where: {
            instituteId_category_key: { instituteId, category, key },
          },
          create: {
            instituteId,
            category,
            key,
            value: value as import("@prisma/client").Prisma.InputJsonValue,
          },
          update: {
            value: value as import("@prisma/client").Prisma.InputJsonValue,
          },
        })
      )
    );
    return this.getSystemSettingsByCategory(instituteId, category);
  }
}
