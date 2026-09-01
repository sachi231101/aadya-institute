import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import { logger } from "../../config/logger";
import type { AuthUser } from "../auth/auth.types";
import { EmailRepository, interpolateTemplate } from "./email.repository";
import type {
  ListEmailTemplatesQuery,
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput,
  SendTestEmailInput,
  ListEmailLogsQuery,
} from "./email.validation";

export const EmailService = {
  async listTemplates(currentUser: AuthUser, query: ListEmailTemplatesQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { total, data } = await EmailRepository.findTemplates(currentUser.instituteId, {
      search: query.search,
      status: query.status,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: buildMeta(total, page, limit) };
  },

  async getTemplate(currentUser: AuthUser, id: string) {
    const template = await EmailRepository.findTemplateById(id, currentUser.instituteId);
    if (!template) throw new AppError("Email template not found", 404);
    return template;
  },

  async createTemplate(currentUser: AuthUser, input: CreateEmailTemplateInput) {
    return EmailRepository.createTemplate({
      institute: { connect: { id: currentUser.instituteId } },
      name: input.name,
      subject: input.subject,
      body: input.body,
      variables: input.variables,
    });
  },

  async updateTemplate(currentUser: AuthUser, id: string, input: UpdateEmailTemplateInput) {
    await EmailService.getTemplate(currentUser, id);
    return EmailRepository.updateTemplate(id, currentUser.instituteId, input);
  },

  async deleteTemplate(currentUser: AuthUser, id: string) {
    await EmailService.getTemplate(currentUser, id);
    await EmailRepository.deleteTemplate(id, currentUser.instituteId);
  },

  async listLogs(currentUser: AuthUser, query: ListEmailLogsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { total, data } = await EmailRepository.findLogs(currentUser.instituteId, {
      templateId: query.templateId,
      status: query.status,
      search: query.search,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: buildMeta(total, page, limit) };
  },

  async sendTest(currentUser: AuthUser, input: SendTestEmailInput) {
    const template = await EmailService.getTemplate(currentUser, input.templateId);
    if (template.status !== "ACTIVE") {
      throw new AppError("Email template is not active", 400);
    }

    const variables = input.variables || {};
    const subject = interpolateTemplate(template.subject, variables);
    const body = interpolateTemplate(template.body, variables);
    const userId = currentUser.userId || currentUser.id;

    const log = await EmailRepository.createLog({
      institute: { connect: { id: currentUser.instituteId } },
      template: { connect: { id: template.id } },
      toEmail: input.toEmail,
      subject,
      body,
      status: "PENDING",
      sentBy: { connect: { id: userId } },
    });

    try {
      // Provider integration placeholder — log success for test sends
      logger.info(
        { toEmail: input.toEmail, templateId: template.id, subject },
        "[EmailService] Test email queued (provider stub)"
      );

      const updated = await EmailRepository.updateLog(log.id, {
        status: "SENT",
        sentAt: new Date(),
      });

      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email send failed";
      await EmailRepository.updateLog(log.id, {
        status: "FAILED",
        error: message,
      });
      throw new AppError(message, 502);
    }
  },
};
