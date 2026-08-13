import { SettingsRepository } from "./settings.repository";
import type {
  UserSettingsResponse,
  UpdatePersonalPayload,
  ChangePasswordPayload,
  UpdateNotificationPayload,
  UpdateSystemPayload,
} from "./settings.types";

export class SettingsService {
  /**
   * Get user settings
   */
  static async getSettings(userId: string): Promise<UserSettingsResponse> {
    return SettingsRepository.getUserSettings(userId);
  }

  /**
   * Update personal profile info
   */
  static async updatePersonalInfo(userId: string, payload: UpdatePersonalPayload) {
    if (!payload.name || !payload.email) {
      throw new Error("Name and email are required fields");
    }
    return SettingsRepository.updatePersonalInfo(userId, payload);
  }

  /**
   * Change password
   */
  static async changePassword(userId: string, payload: ChangePasswordPayload) {
    if (!payload.currentPassword || !payload.newPassword) {
      throw new Error("Current password and new password are required");
    }
    if (payload.newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }
    return SettingsRepository.changePassword(userId, payload);
  }

  /**
   * Update notification preferences
   */
  static async updateNotifications(userId: string, payload: UpdateNotificationPayload) {
    return SettingsRepository.updateNotificationPreferences(userId, payload);
  }

  /**
   * Update system preferences
   */
  static async updateSystemPreferences(userId: string, payload: UpdateSystemPayload) {
    return SettingsRepository.updateSystemPreferences(userId, payload);
  }

  /**
   * Revoke active session
   */
  static async revokeSession(userId: string, sessionId: string) {
    return SettingsRepository.revokeSession(userId, sessionId);
  }
}
