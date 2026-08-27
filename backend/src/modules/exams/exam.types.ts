export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'LIVE' | 'ENDED' | 'COMPLETED' | 'ARCHIVED' | 'CANCELLED';
export type ExamType = 'ONLINE' | 'OFFLINE';

export interface CreateExamDto {
  name: string;
  description?: string;
  instructions?: string;
  courseId?: string;
  moduleId?: string;
  branchId?: string;
  durationMinutes: number;
  totalMarks?: number;
  passingMarks?: number;
  attemptsAllowed?: number;
  examType?: ExamType;
  negativeMarkingEnabled?: boolean;
  showResults?: boolean;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  proctoringEnabled?: boolean;
  fullscreenRequired?: boolean;
  maxWarnings?: number;
}

export interface UpdateExamDto {
  name?: string;
  description?: string;
  instructions?: string;
  courseId?: string;
  moduleId?: string;
  branchId?: string;
  durationMinutes?: number;
  passingMarks?: number;
  attemptsAllowed?: number;
  examType?: ExamType;
  negativeMarkingEnabled?: boolean;
  showResults?: boolean;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  proctoringEnabled?: boolean;
  fullscreenRequired?: boolean;
  maxWarnings?: number;
}

export interface ScheduleExamDto {
  startAt: string; // ISO string
  endAt: string;   // ISO string
}

export interface ExamQueryFilters {
  search?: string;
  status?: string;
  courseId?: string;
  moduleId?: string;
  batchId?: string;
  createdById?: string;
  page?: number;
  limit?: number;
}

export interface AddQuestionToExamDto {
  questionId: string;
  displayOrder?: number;
  marksOverride?: number;
}

export interface ReorderQuestionsDto {
  questions: Array<{ questionId: string; displayOrder: number }>;
}
