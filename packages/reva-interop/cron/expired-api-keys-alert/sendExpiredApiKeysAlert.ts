import { format, subYears } from "date-fns";

import { sendEmailUsingTemplate } from "../../utils/email/sendEmailUsingTemplate.js";
import { logger } from "../../utils/logger.js";

import { findActiveSessionsCreatedBefore } from "./findActiveSessionsCreatedBefore.js";

const recipient = process.env.EXPIRED_API_KEYS_ALERT_RECIPIENT;

const KEY_PREFIX_LENGTH = 6;

const getAlertRecipient = () => {
  if (!recipient) {
    throw new Error("EXPIRED_API_KEYS_ALERT_RECIPIENT is not set");
  }
  return recipient;
};

export const sendExpiredApiKeysAlert = async () => {
  const recipient = getAlertRecipient();

  const expiredSessions = await findActiveSessionsCreatedBefore(
    subYears(new Date(), 1),
  );

  if (expiredSessions.length === 0) {
    logger.info("Aucune clé d'interopérabilité expirée");
    return;
  }

  await sendEmailUsingTemplate({
    to: { email: recipient },
    templateId: 794,
    params: {
      apiKeys: expiredSessions.map((session) => ({
        // Never send the full key by email
        keyPrefix: session.id.slice(0, KEY_PREFIX_LENGTH),
        createdAt: format(session.createdAt, "dd/MM/yyyy"),
      })),
    },
  });
};
