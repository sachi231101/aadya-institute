export enum UserRole {
  ADMIN = "ADMIN",
  CENTER_MANAGER = "CENTER_MANAGER",
  COUNSELLOR = "COUNSELLOR",
  FACULTY = "FACULTY",
  STUDENT = "STUDENT",
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "Super Administrator",
  [UserRole.CENTER_MANAGER]: "Center Manager",
  [UserRole.COUNSELLOR]: "Counselor",
  [UserRole.FACULTY]: "Faculty",
  [UserRole.STUDENT]: "Student",
};
