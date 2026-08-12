import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import * as service from "./module.service";

export const getByCourse = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const courseId = req.query.courseId as string;
    if (!courseId) {
      res.status(400).json({ success: false, message: "courseId parameter is required" });
      return;
    }
    const modules = await service.getModulesByCourse(courseId);
    res.json({
      success: true,
      message: "Modules retrieved successfully",
      data: modules,
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
    const moduleItem = await service.createModule(req.body);
    res.status(201).json({
      success: true,
      message: "Module created successfully",
      data: moduleItem,
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
    const updated = await service.updateModule(req.params.id as string, req.body);
    res.json({
      success: true,
      message: "Module updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const addTopic = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const updated = await service.addTopic(req.params.id as string, req.body);
    res.json({
      success: true,
      message: "Topic added successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleTopic = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const updated = await service.toggleTopic(
      req.params.id as string,
      req.params.topicId as string
    );
    res.json({
      success: true,
      message: "Topic completion toggled",
      data: updated,
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
    await service.deleteModule(req.params.id as string);
    res.json({
      success: true,
      message: "Module deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
