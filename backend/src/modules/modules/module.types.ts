export interface TopicItem {
  id: string;
  title: string;
  durationHours: number;
  description?: string;
  isCompleted: boolean;
}

export interface CreateModuleDto {
  courseId: string;
  name: string;
  code?: string;
  description?: string;
  sequence?: number;
  duration?: number;
}

export interface UpdateModuleDto {
  name?: string;
  code?: string;
  description?: string;
  sequence?: number;
  duration?: number;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
}

export interface AddTopicDto {
  title: string;
  durationHours?: number;
  description?: string;
}
