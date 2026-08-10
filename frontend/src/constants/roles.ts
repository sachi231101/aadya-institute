export const UserRole = {
  ADMIN: "ADMIN",
  CENTER_MANAGER: "CENTER_MANAGER",
  COUNSELLOR: "COUNSELLOR",
  FACULTY: "FACULTY",
  STUDENT: "STUDENT",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "Super Administrator",
  [UserRole.CENTER_MANAGER]: "Center Manager",
  [UserRole.COUNSELLOR]: "Counselor",
  [UserRole.FACULTY]: "Faculty",
  [UserRole.STUDENT]: "Student",
};
