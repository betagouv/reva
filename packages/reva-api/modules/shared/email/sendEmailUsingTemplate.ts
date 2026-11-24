import { BrevoClient, BrevoError } from "@getbrevo/brevo";

import { logger } from "../logger/logger";

const brevo = new BrevoClient({
  apiKey: process.env.SENDINBLUE_API_KEY || "",
  logging: {
    level: "info",
    logger: logger,
  },
  maxRetries: 3,
});

/**
 * Sends a Brevo template email. Errors are logged, not thrown.
 * Returns false when the email could not be sent, so callers can react if they need to.
 */
export const sendEmailUsingTemplate = async ({
  to,
  templateId,
  params,
  attachment,
}: {
  to: { email: string } | { email: string }[];
  templateId: number;
  params?: Record<string, unknown>;
  attachment?: { name: string; content: string }[];
}): Promise<boolean> => {
  const emailAddresses = Array.isArray(to)
    ? to.map((t) => t.email).join(", ")
    : to.email;

  if (process.env.NODE_ENV === "test") {
    logger.info(`email sent to ${emailAddresses}`);
  }

  if (process.env.NODE_ENV !== "production") {
    logger.info("======= EMAIL CONTENT =======");
    logger.info({ params });
    logger.info("=========================");
    logger.info(`email sent to ${emailAddresses}`);
    return true;
  }

  try {
    await brevo.transactionalEmails
      .sendTransacEmail({
        templateId,
        to: Array.isArray(to) ? to : [to],
        params,
        attachment,
      })
      .withRawResponse();
    logger.info(`email sent to ${emailAddresses}`);
    return true;
  } catch (e: any) {
    if (e instanceof BrevoError) {
      logger.error(`Brevo API error ${e.statusCode}: ${e.message}`);
    } else {
      logger.error(`error sending email to ${emailAddresses}`);
      logger.error(e);
    }
    return false;
  }
};
