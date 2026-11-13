import { BrevoClient, BrevoError } from "@getbrevo/brevo";

import { logger } from "../logger.js";

const brevo = new BrevoClient({
  apiKey: process.env.SENDINBLUE_API_KEY || "",
  maxRetries: 3,
});

export const sendEmailUsingTemplate = async ({
  to,
  templateId,
  params,
}: {
  to: { email: string } | { email: string }[];
  templateId: number;
  params?: Record<string, unknown>;
}): Promise<void> => {
  const recipients = Array.isArray(to) ? to : [to];
  const emailAddresses = recipients.map((r) => r.email).join(", ");

  if (process.env.NODE_ENV !== "production") {
    logger.info({ templateId, params }, `email sent to ${emailAddresses}`);
    return;
  }

  try {
    await brevo.transactionalEmails.sendTransacEmail({
      templateId,
      to: recipients,
      params,
    });
    logger.info(`email sent to ${emailAddresses}`);
  } catch (e) {
    if (e instanceof BrevoError) {
      logger.error(`Brevo API error ${e.statusCode}: ${e.message}`);
    } else {
      logger.error(e, `error sending email to ${emailAddresses}`);
    }
  }
};
