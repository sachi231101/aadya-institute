import { AppError } from "../../middlewares/error.middleware";
import type { AuthUser } from "../auth/auth.types";
import * as instituteRepo from "../institutes/institute.repository";
import { toOrganizationContext } from "./organization.mapper";
import type { OrganizationContextDto } from "./organization.types";

/**
 * Returns safe organization branding/contact/localization for the
 * authenticated user's institute. Never trusts client-supplied institute IDs.
 */
export const getOrganizationContext = async (
  currentUser: AuthUser
): Promise<OrganizationContextDto> => {
  const institute = await instituteRepo.findInstituteById(currentUser.instituteId);
  if (!institute) {
    throw new AppError("Organization not found", 404);
  }
  return toOrganizationContext(institute);
};
