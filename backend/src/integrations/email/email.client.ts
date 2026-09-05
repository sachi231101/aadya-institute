import { logger } from "../../config/logger";
import { resolveEmailSmtpConfig } from "../../modules/integrations/integration.service";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  instituteId?: string;
  text?: string;
}

/**
 * Email client — uses institute EMAIL Integration (SMTP) when configured,
 * otherwise logs a stub send (backward compatible).
 */
export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  if (!options.instituteId) {
    logger.info(
      { to: options.to, subject: options.subject },
      "[email] sendEmail (stub — no instituteId)"
    );
    return;
  }

  const smtp = await resolveEmailSmtpConfig(options.instituteId);
  if (!smtp.isEnabled || !smtp.host || !smtp.username || !smtp.password) {
    logger.info(
      { to: options.to, subject: options.subject, instituteId: options.instituteId },
      "[email] sendEmail (stub — SMTP not configured)"
    );
    return;
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.username, pass: smtp.password },
    });

    await transporter.sendMail({
      from: smtp.fromEmail
        ? `"${smtp.fromName || smtp.fromEmail}" <${smtp.fromEmail}>`
        : smtp.username,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  } catch (err) {
    logger.error({ err, to: options.to }, "[email] SMTP send failed");
    throw err;
  }
};
