import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import * as service from "./batch.service";

export const getAll = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const branchId = req.user!.branchId || undefined;
    const filters = {
      search: req.query.search as string,
      courseId: req.query.courseId as string,
      facultyId: req.query.facultyId as string,
      status: req.query.status as string,
    };
    const batches = await service.getBatches(instituteId, branchId, filters);
    res.json({
      success: true,
      message: "Batches retrieved successfully",
      data: batches,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const batch = await service.getBatchById(req.params.id as string, instituteId);
    res.json({
      success: true,
      message: "Batch details retrieved successfully",
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

export const create = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const branchId = req.user!.branchId || "";
    const batch = await service.createBatch(instituteId, branchId, req.body);
    res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    await service.updateBatch(req.params.id as string, instituteId, req.body);
    res.json({
      success: true,
      message: "Batch updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const assignFaculty = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    await service.assignFaculty(req.params.id as string, instituteId, req.body.facultyId);
    res.json({
      success: true,
      message: "Faculty assigned to batch successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getStudents = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const students = await service.getBatchStudents(req.params.id as string, instituteId);
    res.json({
      success: true,
      message: "Batch students retrieved successfully",
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

export const enrollStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const enrollment = await service.enrollStudent(
      req.params.id as string,
      instituteId,
      req.body.studentId,
      req.body.admissionId
    );
    res.status(201).json({
      success: true,
      message: "Student enrolled in batch successfully",
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

export const removeStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    await service.removeStudent(req.params.id as string, instituteId, req.params.studentId as string);
    res.json({
      success: true,
      message: "Student removed from batch successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    await service.deleteBatch(req.params.id as string, instituteId);
    res.json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
