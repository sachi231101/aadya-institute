import { create } from "zustand";

export interface TestScore {
  testName: string;
  score: number;
  maxScore: number;
}

export interface EnrolledCourse {
  courseId: string;
  courseName: string;
  completionPercentage: number;
  grade?: string;
}

export interface StudentPerformanceMetrics {
  studentId: string;
  testScores: TestScore[];
  enrolledCourses: EnrolledCourse[];
  overallAttendancePercent: number;
}

interface PerformanceState {
  getPerformanceForStudent: (studentId: string) => StudentPerformanceMetrics;
}

// Mock database mapping studentId -> performance data
const mockPerformanceData: Record<string, StudentPerformanceMetrics> = {
  "STD001": {
    studentId: "STD001",
    overallAttendancePercent: 92,
    testScores: [
      { testName: "Test 1", score: 85, maxScore: 100 },
      { testName: "Test 2", score: 88, maxScore: 100 },
      { testName: "Test 3", score: 94, maxScore: 100 },
    ],
    enrolledCourses: [
      { courseId: "C101", courseName: "Introduction to Web Development", completionPercentage: 100, grade: "A" },
      { courseId: "C102", courseName: "Advanced React Patterns", completionPercentage: 60 },
      { courseId: "C103", courseName: "Backend API Design", completionPercentage: 20 },
    ],
  },
  "STD002": {
    studentId: "STD002",
    overallAttendancePercent: 85,
    testScores: [
      { testName: "Test 1", score: 72, maxScore: 100 },
      { testName: "Test 2", score: 78, maxScore: 100 },
      { testName: "Test 3", score: 81, maxScore: 100 },
    ],
    enrolledCourses: [
      { courseId: "C201", courseName: "Data Structures & Algorithms", completionPercentage: 100, grade: "B+" },
      { courseId: "C202", courseName: "System Design Basics", completionPercentage: 45 },
    ],
  },
};

export const usePerformanceStore = create<PerformanceState>(() => ({
  getPerformanceForStudent: (studentId: string) => {
    // If we have mock data, return it
    if (mockPerformanceData[studentId]) {
      return mockPerformanceData[studentId];
    }
    
    // Otherwise return some generic fallback data
    return {
      studentId,
      overallAttendancePercent: Math.floor(Math.random() * 30) + 70, // 70-100%
      testScores: [
        { testName: "Test 1", score: Math.floor(Math.random() * 40) + 60, maxScore: 100 },
        { testName: "Test 2", score: Math.floor(Math.random() * 40) + 60, maxScore: 100 },
        { testName: "Test 3", score: Math.floor(Math.random() * 40) + 60, maxScore: 100 },
      ],
      enrolledCourses: [
        { courseId: "C000", courseName: "General Programming Foundations", completionPercentage: Math.floor(Math.random() * 100) },
      ],
    };
  },
}));
