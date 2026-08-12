import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import * as service from "./course.service";

export const getAll = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const filters = {
      search: req.query.search as string,
      status: req.query.status as string,
    };
    const courses = await service.getCourses(instituteId, filters);
    res.json({
      success: true,
      message: "Courses retrieved successfully",
      data: courses,
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
    const course = await service.getCourseById(req.params.id as string, instituteId);
    res.json({
      success: true,
      message: "Course details retrieved successfully",
      data: course,
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
    const course = await service.createCourse(instituteId, req.body);
    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course,
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
    await service.updateCourse(req.params.id as string, instituteId, req.body);
    res.json({
      success: true,
      message: "Course updated successfully",
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
    await service.deleteCourse(req.params.id as string, instituteId);
    res.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
