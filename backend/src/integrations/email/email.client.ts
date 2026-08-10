// Email client — stub, integrate with NodeMailer / SendGrid / Resend
export const sendEmail = async (options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> => {
  // TODO: Wire up real SMTP / API transport
  console.info("[email] sendEmail (stub):", options.to, options.subject);
};
