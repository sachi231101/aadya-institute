export interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
  duration?: number;
  status: "ACTIVE" | "INACTIVE";
}
