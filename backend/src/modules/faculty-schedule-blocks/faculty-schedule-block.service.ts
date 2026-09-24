import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import { hasBranchAccess } from "../../utils/branch-isolation.util";
import { resolveOptionalMasterFields } from "../masters/master-resolve.service";
import type { AuthUser } from "../auth/auth.types";
import { facultyScheduleBlockRepository } from "./faculty-schedule-block.repository";
import type {
  DeleteFacultyScheduleBlockByKeyDto,
  QueryFacultyScheduleBlocksDto,
  UpsertFacultyScheduleBlockDto,
} from "./faculty-schedule-block.types";

export const facultyScheduleBlockService = {
  list: async (
    instituteId: string,
    branchId: string | undefined,
    filters?: QueryFacultyScheduleBlocksDto
  ) => {
    const result = await facultyScheduleBlockRepository.findMany(instituteId, branchId, filters);
    return {
      data: result.data,
      meta: buildMeta(result.total, result.page, result.limit),
    };
  },

  upsert: async (
    currentUser: AuthUser,
    instituteId: string,
    data: UpsertFacultyScheduleBlockDto
  ) => {
    const faculty = await prisma.faculty.findFirst({
      where: { id: data.facultyId, instituteId },
      select: { id: true, branchId: true },
    });
    if (!faculty) {
      throw new AppError("Faculty not found", 404);
    }

    const branchId = data.branchId || faculty.branchId;
    if (!branchId) {
      throw new AppError("Branch is required to set a schedule block", 400);
    }

    if (!hasBranchAccess(currentUser, branchId)) {
      throw new AppError("You do not have access to this branch", 403);
    }

    let timeslotMasterId = data.timeslotMasterId || undefined;
    if (timeslotMasterId) {
      const timeslot = await resolveOptionalMasterFields({
        instituteId,
        entityType: "timeslot",
        masterRecordId: timeslotMasterId,
        branchId,
      });
      timeslotMasterId = timeslot?.masterId;
    }

    // BREAK/LUNCH replaces any overlapping class session for this faculty/slot.
    await facultyScheduleBlockRepository.deleteOverlappingSessions({
      instituteId,
      facultyId: data.facultyId,
      scheduledDate: data.scheduledDate,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    return facultyScheduleBlockRepository.upsert(instituteId, {
      ...data,
      branchId,
      timeslotMasterId,
    });
  },

  deleteById: async (currentUser: AuthUser, instituteId: string, id: string) => {
    const existing = await facultyScheduleBlockRepository.findById(id, instituteId);
    if (!existing) {
      throw new AppError("Schedule block not found", 404);
    }
    if (!hasBranchAccess(currentUser, existing.branchId)) {
      throw new AppError("You do not have access to this branch", 403);
    }
    await facultyScheduleBlockRepository.deleteById(id, instituteId);
    return { id };
  },

  deleteByKey: async (
    currentUser: AuthUser,
    instituteId: string,
    data: DeleteFacultyScheduleBlockByKeyDto
  ) => {
    const existing = await facultyScheduleBlockRepository.findByKey({
      instituteId,
      facultyId: data.facultyId,
      scheduledDate: data.scheduledDate,
      startTime: data.startTime,
    });
    if (!existing) {
      return { deleted: 0 };
    }
    if (!hasBranchAccess(currentUser, existing.branchId)) {
      throw new AppError("You do not have access to this branch", 403);
    }
    const result = await facultyScheduleBlockRepository.deleteByKey({
      instituteId,
      facultyId: data.facultyId,
      scheduledDate: data.scheduledDate,
      startTime: data.startTime,
    });
    return { deleted: result.count };
  },
};
