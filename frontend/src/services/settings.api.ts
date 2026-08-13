import { api } from "./api";

export interface ActiveSessionItem {
  id: string;
  tokenHashPreview: string;
  expiresAt: string;
  createdAt: string;
}

export interface UserSettingsData {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    status: string;
  };
  settings: {
    designation: string;
    department: string;
    language: string;
    timezone: string;
    twoFactorEnabled: boolean;
    emailAdmissions: boolean;
    emailFeeAlerts: boolean;
    emailAttendance: boolean;
    whatsappReminders: boolean;
    aiCallAlerts: boolean;
    primaryBranch: string;
    currencyFormat: string;
    themeMode: string;
    autoLogoutMinutes: number;
  };
  activeSessions: ActiveSessionItem[];
}

export interface UpdatePersonalPayload {
  name: string;
  email: string;
  phone: string;
  designation?: string;
  department?: string;
  language?: string;
  timezone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateNotificationPayload {
  emailAdmissions?: boolean;
  emailFeeAlerts?: boolean;
  emailAttendance?: boolean;
  whatsappReminders?: boolean;
  aiCallAlerts?: boolean;
}

export interface UpdateSystemPayload {
  primaryBranch?: string;
  currencyFormat?: string;
  themeMode?: string;
  autoLogoutMinutes?: number;
}

export const settingsApi = {
  getSettings: async (): Promise<UserSettingsData> => {
    const response = await api.get("/settings/me");
    return response.data.data;
  },

  updatePersonal: async (payload: UpdatePersonalPayload) => {
    const response = await api.put("/settings/personal", payload);
    return response.data.data;
  },

  changePassword: async (payload: ChangePasswordPayload) => {
    const response = await api.put("/settings/security/password", payload);
    return response.data.data;
  },

  updateNotifications: async (payload: UpdateNotificationPayload) => {
    const response = await api.put("/settings/notifications", payload);
    return response.data.data;
  },

  updateSystem: async (payload: UpdateSystemPayload) => {
    const response = await api.put("/settings/system", payload);
    return response.data.data;
  },

  revokeSession: async (sessionId: string) => {
    const response = await api.delete(`/settings/security/sessions/${sessionId}`);
    return response.data.data;
  },
};
