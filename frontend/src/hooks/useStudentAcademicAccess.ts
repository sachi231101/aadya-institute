import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { studentsApi } from "@/services/students.api";
import { coursesApi } from "@/services/courses.api";
import { useStudentDashboard } from "./useStudentDashboard";
import type { StudentDetail } from "@/types/student.types";

export interface StudentAssignedCourse {
  id: string;
  name: string;
  code: string;
  admissionStatus?: string;
  admissionDate?: string;
}

export interface StudentAssignedBatch {
  id: string;
  name: string;
  code: string;
  courseId?: string;
  status?: string;
  timeSlot?: string;
  schedulePattern?: string;
  facultyName?: string;
}

export interface StudentAssignedModule {
  id: string;
  name: string;
  code?: string;
  courseId: string;
  courseName: string;
  sequence?: number;
}

export interface StudentAcademicAccess {
  isLoading: boolean;
  studentId: string | null;
  studentCode: string | null;
  studentName: string;
  studentDetail: StudentDetail | null;
  hasActiveEnrollment: boolean;
  assignedCourses: StudentAssignedCourse[];
  assignedCourseIds: string[];
  assignedCourseNames: string[];
  assignedBatches: StudentAssignedBatch[];
  assignedBatchIds: string[];
  assignedBatchCodes: string[];
  assignedModules: StudentAssignedModule[];
  assignedModuleNames: string[];
  primaryCourse: StudentAssignedCourse | null;
  primaryBatch: StudentAssignedBatch | null;
  isAuthorizedForCourse: (courseIdOrName?: string | null) => boolean;
  isAuthorizedForBatch: (batchIdOrCode?: string | null) => boolean;
  isAuthorizedForModule: (moduleNameOrId?: string | null) => boolean;
  isAuthorizedForSession: (session: {
    courseId?: string | null;
    batchId?: string | null;
    courseName?: string | null;
    batch?: { id?: string; code?: string; courseId?: string };
  }) => boolean;
}

export const useStudentAcademicAccess = (): StudentAcademicAccess => {
  const { user } = useAuthStore();
  const { data: dashRes, isLoading: isDashLoading } = useStudentDashboard();
  const dashData = dashRes?.data;

  // 1. Resolve student ID from authStore or dashboard profile
  const resolvedStudentId = user?.studentId || dashData?.profile?.id || null;

  // 2. Fetch full student details if ID is available
  const { data: studentDetailRes, isLoading: isStudentDetailLoading } = useQuery({
    queryKey: ["student", "academic-access", resolvedStudentId],
    queryFn: () => studentsApi.getById(resolvedStudentId!),
    enabled: !!resolvedStudentId,
    staleTime: 5 * 60 * 1000,
  });

  const studentDetail: StudentDetail | null = studentDetailRes?.data ?? null;

  // 3. Fetch courses list to resolve modules for assigned courses
  const { data: allCoursesRes, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["courses", "all-published"],
    queryFn: () => coursesApi.getAll({ status: "ACTIVE" }),
    staleTime: 10 * 60 * 1000,
  });
  const allCourses = allCoursesRes?.data ?? [];

  return useMemo(() => {
    const coursesMap = new Map<string, StudentAssignedCourse>();
    const batchesMap = new Map<string, StudentAssignedBatch>();

    // A. Extract from studentDetail.admissions
    if (studentDetail?.admissions) {
      studentDetail.admissions.forEach((adm) => {
        if (adm.course) {
          coursesMap.set(adm.course.id, {
            id: adm.course.id,
            name: adm.course.name,
            code: adm.course.code,
            admissionStatus: adm.status,
            admissionDate: adm.admissionDate,
          });
        }
      });
    }

    // B. Extract from studentDetail.batchEnrollments
    if (studentDetail?.batchEnrollments) {
      studentDetail.batchEnrollments.forEach((be) => {
        if (be.batch) {
          batchesMap.set(be.batch.id, {
            id: be.batch.id,
            name: be.batch.name,
            code: be.batch.code,
            courseId: be.batch.course?.id,
            status: be.batch.status,
            timeSlot: be.batch.timeSlot,
            schedulePattern: be.batch.schedulePattern,
            facultyName: be.batch.faculty?.user?.name,
          });

          if (be.batch.course) {
            coursesMap.set(be.batch.course.id, {
              id: be.batch.course.id,
              name: be.batch.course.name,
              code: be.batch.course.code,
            });
          }
        }
      });
    }

    // C. Extract from dashboard fallback if admissions not loaded
    if (dashData?.course) {
      if (!coursesMap.has(dashData.course.id)) {
        coursesMap.set(dashData.course.id, {
          id: dashData.course.id,
          name: dashData.course.name,
          code: dashData.course.code,
        });
      }
      if (dashData.course.batchName) {
        const matchingBatch = Array.from(batchesMap.values()).find(
          (b) => b.name === dashData.course?.batchName || b.code === dashData.course?.batchName
        );
        if (!matchingBatch) {
          batchesMap.set("dash-batch", {
            id: "dash-batch",
            name: dashData.course.batchName,
            code: dashData.course.batchName,
            courseId: dashData.course.id,
          });
        }
      }
    }

    const assignedCourses = Array.from(coursesMap.values());
    const assignedCourseIds = assignedCourses.map((c) => c.id);
    const assignedCourseNames = assignedCourses.map((c) => c.name);

    const assignedBatches = Array.from(batchesMap.values());
    const assignedBatchIds = assignedBatches.map((b) => b.id);
    const assignedBatchCodes = assignedBatches.map((b) => b.code);

    // D. Extract modules belonging to assigned courses
    const modulesList: StudentAssignedModule[] = [];
    assignedCourses.forEach((c) => {
      const fullCourse = allCourses.find((fc) => fc.id === c.id || fc.name.toLowerCase() === c.name.toLowerCase());
      if (fullCourse?.modules && fullCourse.modules.length > 0) {
        fullCourse.modules.forEach((mod) => {
          modulesList.push({
            id: mod.id,
            name: mod.name,
            code: mod.code,
            courseId: c.id,
            courseName: c.name,
            sequence: mod.sequence,
          });
        });
      } else if (studentDetail?.courseModules && studentDetail.courseModules.length > 0) {
        studentDetail.courseModules.forEach((mod, idx) => {
          if (!modulesList.some((m) => m.name.toLowerCase() === mod.name.toLowerCase())) {
            modulesList.push({
              id: `mod-${idx}`,
              name: mod.name,
              courseId: c.id,
              courseName: c.name,
              sequence: idx + 1,
            });
          }
        });
      }
    });

    const assignedModuleNames = Array.from(new Set(modulesList.map((m) => m.name)));

    const primaryCourse = assignedCourses[0] || null;
    const primaryBatch = assignedBatches[0] || null;
    const hasActiveEnrollment = assignedCourses.length > 0;

    const isAuthorizedForCourse = (courseIdOrName?: string | null): boolean => {
      if (!courseIdOrName) return false;
      const lower = courseIdOrName.toLowerCase().trim();
      return assignedCourses.some(
        (c) => c.id === courseIdOrName || c.name.toLowerCase() === lower || c.code.toLowerCase() === lower
      );
    };

    const isAuthorizedForBatch = (batchIdOrCode?: string | null): boolean => {
      if (!batchIdOrCode) return false;
      const lower = batchIdOrCode.toLowerCase().trim();
      return assignedBatches.some(
        (b) => b.id === batchIdOrCode || b.name.toLowerCase() === lower || b.code.toLowerCase() === lower
      );
    };

    const isAuthorizedForModule = (moduleNameOrId?: string | null): boolean => {
      if (!moduleNameOrId) return false;
      const lower = moduleNameOrId.toLowerCase().trim();
      return (
        modulesList.some(
          (m) => m.id === moduleNameOrId || m.name.toLowerCase() === lower || (m.code && m.code.toLowerCase() === lower)
        ) || assignedModuleNames.some((n) => n.toLowerCase() === lower)
      );
    };

    const isAuthorizedForSession = (session: {
      courseId?: string | null;
      batchId?: string | null;
      courseName?: string | null;
      batch?: { id?: string; code?: string; courseId?: string };
    }): boolean => {
      if (session.batchId && assignedBatchIds.includes(session.batchId)) return true;
      if (session.batch?.id && assignedBatchIds.includes(session.batch.id)) return true;
      if (session.batch?.code && assignedBatchCodes.includes(session.batch.code)) return true;
      if (session.courseId && assignedCourseIds.includes(session.courseId)) return true;
      if (session.batch?.courseId && assignedCourseIds.includes(session.batch.courseId)) return true;
      if (session.courseName && isAuthorizedForCourse(session.courseName)) return true;
      return false;
    };

    return {
      isLoading: isDashLoading || (!!resolvedStudentId && isStudentDetailLoading) || isCoursesLoading,
      studentId: resolvedStudentId,
      studentCode: studentDetail?.studentCode || dashData?.profile?.studentCode || user?.id || null,
      studentName: studentDetail?.user?.name || dashData?.profile?.name || user?.name || "Student",
      studentDetail,
      hasActiveEnrollment,
      assignedCourses,
      assignedCourseIds,
      assignedCourseNames,
      assignedBatches,
      assignedBatchIds,
      assignedBatchCodes,
      assignedModules: modulesList,
      assignedModuleNames,
      primaryCourse,
      primaryBatch,
      isAuthorizedForCourse,
      isAuthorizedForBatch,
      isAuthorizedForModule,
      isAuthorizedForSession,
    };
  }, [
    user,
    resolvedStudentId,
    dashData,
    studentDetail,
    allCourses,
    isDashLoading,
    isStudentDetailLoading,
    isCoursesLoading,
  ]);
};
