export interface ActiveSessionItem {
  id: string;
  tokenHashPreview: string;
  expiresAt: string;
  createdAt: string;
}

export interface UserSettingsResponse {
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
