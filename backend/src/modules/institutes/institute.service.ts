import { AppError } from "../../middlewares/error.middleware";
import * as repo from "./institute.repository";
import type { CreateInstituteDto, UpdateInstituteDto } from "./institute.validation";

export const getAllInstitutes = () => repo.findAllInstitutes();

export const getInstituteById = async (id: string) => {
  const institute = await repo.findInstituteById(id);
  if (!institute) throw new AppError("Institute not found", 404);
  return institute;
};

export const createInstitute = async (data: CreateInstituteDto) => {
  return repo.createInstitute(data);
};

export const updateInstitute = async (id: string, data: UpdateInstituteDto) => {
  await getInstituteById(id);
  return repo.updateInstitute(id, data);
};

export const deleteInstitute = async (id: string) => {
  await getInstituteById(id);
  return repo.deleteInstitute(id);
};
