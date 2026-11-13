// Must stay the first import: loads .env before the modules below read process.env
import "dotenv/config";

import { CronJob } from "cron";

import { logger } from "../utils/logger.js";

import { sendExpiredApiKeysAlert } from "./expired-api-keys-alert/sendExpiredApiKeysAlert.js";

const EVERY_MONDAY_AT_9_AM = "0 9 * * 1";

CronJob.from({
  cronTime: process.env.EXPIRED_API_KEYS_ALERT_CRONTIME || EVERY_MONDAY_AT_9_AM,
  onTick: async () => {
    try {
      await sendExpiredApiKeysAlert();
    } catch (error) {
      logger.error(error, "Expired interop API keys alert failed");
    }
  },
  start: true,
  timeZone: "Europe/Paris",
});

logger.info("Interop cron started");
