export type AnnouncementType =
  | "Important Notice"
  | "Assignment Reminder"
  | "Module Update"
  | "Class Schedule Update"
  | "General Announcement"
  | "Placement Alert"
  | "Career Guidance"
  | "Fee Clearance Notice";

export type AnnouncementStatus = "Published" | "Draft";

export type AuthorRole = "Faculty" | "Counsellor" | "Admin" | "Center Manager" | string;

export interface StudentReadRecord {
  studentId: string;
  studentName: string;
  readAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  authorRole: AuthorRole;
  courseName: string;
  batchCode: string;
  batchName: string;
  facultyName: string;
  facultyDesignation: string;
  studentCount: number;
  status: AnnouncementStatus;
  createdAt: string;
  publishedAt?: string;
  sentCount: number;
  readCount: number;
  isImportant?: boolean;
  attachmentName?: string;
  attachmentSize?: string;
  iconBg: string;
  iconColor: string;
  readBy: StudentReadRecord[];
}
