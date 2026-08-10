import type { Request, Response, NextFunction } from "express";
import * as service from "./institute.service";
import { sendSuccess } from "../../utils/response";

export const getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.getAllInstitutes();
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.getInstituteById(req.params.id as string);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.createInstitute(req.body);
    sendSuccess(res, data, 201, "Institute created");
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.updateInstitute(req.params.id as string, req.body);
    sendSuccess(res, data, 200, "Institute updated");
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteInstitute(req.params.id as string);
    sendSuccess(res, null, 200, "Institute deleted");
  } catch (err) { next(err); }
};
