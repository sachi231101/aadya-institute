export type QuestionType = 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'NUMERICAL' | 'FILL_BLANK';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionStatus = 'ACTIVE' | 'INACTIVE';

export interface QuestionOptionDto {
  optionText: string;
  isCorrect: boolean;
  displayOrder?: number;
}

export interface CreateQuestionDto {
  questionType: QuestionType;
  questionText: string;
  difficulty?: DifficultyLevel;
  marks?: number;
  negativeMarks?: number;
  explanation?: string;
  questionBankId?: string;
  courseId?: string;
  moduleId?: string;
  branchId?: string;
  options?: QuestionOptionDto[];
}

export interface UpdateQuestionDto {
  questionType?: QuestionType;
  questionText?: string;
  difficulty?: DifficultyLevel;
  marks?: number;
  negativeMarks?: number;
  explanation?: string;
  questionBankId?: string;
  courseId?: string;
  moduleId?: string;
  status?: QuestionStatus;
  options?: QuestionOptionDto[];
}

export interface QuestionQueryFilters {
  search?: string;
  questionType?: string;
  difficulty?: string;
  status?: string;
  questionBankId?: string;
  courseId?: string;
  moduleId?: string;
  page?: number;
  limit?: number;
}
