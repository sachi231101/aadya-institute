import { prisma } from "../../config/database";
import type { CreateInstituteDto, UpdateInstituteDto } from "./institute.validation";

export const findAllInstitutes = () =>
  prisma.institute.findMany({ orderBy: { createdAt: "desc" } });

export const findInstituteById = (id: string) =>
  prisma.institute.findUnique({ where: { id } });

export const createInstitute = (data: CreateInstituteDto) =>
  prisma.institute.create({ data });

export const updateInstitute = (id: string, data: UpdateInstituteDto) =>
  prisma.institute.update({ where: { id }, data });

export const deleteInstitute = (id: string) =>
  prisma.institute.update({ where: { id }, data: { status: "DELETED" } });
