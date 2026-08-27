import { AttemptStatus, ProctoringEventType } from '@prisma/client';

export interface StartExamDto {
  clientDeviceInfo?: {
    userAgent?: string;
    screenResolution?: string;
    browserName?: string;
  };
}

export interface SaveAnswerDto {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
  numericalAnswer?: number;
  isFlagged?: boolean;
}

export interface BatchSaveAnswersDto {
  answers: SaveAnswerDto[];
}

export interface RecordProctoringEventDto {
  eventType: ProctoringEventType;
  clientEventId?: string;
  occurredAt: string; // ISO string
  metadata?: Record<string, unknown>;
}

export interface TerminateAttemptDto {
  reason: string;
  notes?: string;
}

export interface AttemptFilters {
  status?: AttemptStatus;
  search?: string;
  batchId?: string;
  page?: number;
  limit?: number;
}

export interface PublicExamQuestion {
  id: string;
  questionText: string;
  questionType: string;
  marks: number;
  negativeMarks: number;
  displayOrder: number;
  options?: {
    id: string;
    optionText: string;
    displayOrder: number;
  }[];
}
