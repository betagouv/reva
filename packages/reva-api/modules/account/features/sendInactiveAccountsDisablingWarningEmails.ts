import { TimeBeforeAccountDisabling } from "@prisma/client";
import { addDays, addWeeks, max, subYears } from "date-fns";

import { logger } from "@/modules/shared/logger/logger";
import { prismaClient } from "@/prisma/client";

import { sendInactiveAccountDisablingWarningEmail } from "../mail/send-inactive-account-disabling-warning-email";
import {
  getCurrentInactivityCycleWarnings,
  getScheduledDisablingDate,
  INACTIVITY_PERIOD_IN_YEARS,
  inactiveSinceWhereClause,
} from "../utils/inactiveAccounts";

const FIRST_WARNING_DELAY_IN_WEEKS = 6;

// Ordered from least to most urgent
const TIMES_BEFORE_DISABLING_BY_URGENCY: TimeBeforeAccountDisabling[] = [
  "SIX_WEEKS",
  "TWO_WEEKS",
  "ONE_DAY",
];

const getTimeBeforeDisablingToWarnAbout = (
  scheduledDisablingDate: Date,
  now: Date,
): TimeBeforeAccountDisabling => {
  if (scheduledDisablingDate <= addDays(now, 1)) {
    return "ONE_DAY";
  }
  if (scheduledDisablingDate <= addWeeks(now, 2)) {
    return "TWO_WEEKS";
  }
  return "SIX_WEEKS";
};

const isWarningAlreadySent = (
  timeBeforeDisabling: TimeBeforeAccountDisabling,
  alreadyWarnedTimesBeforeDisabling: TimeBeforeAccountDisabling[],
) => {
  const urgency =
    TIMES_BEFORE_DISABLING_BY_URGENCY.indexOf(timeBeforeDisabling);
  return alreadyWarnedTimesBeforeDisabling.some(
    (sent) => TIMES_BEFORE_DISABLING_BY_URGENCY.indexOf(sent) >= urgency,
  );
};

/**
 * Warns inactive accounts by email 6 weeks, 2 weeks and 24h before their automatic disabling.
 * Only the most urgent applicable warning is sent: an account already past its disabling date
 * only receives the 24h warning. Each warning is sent once per inactivity cycle.
 */
export const sendInactiveAccountsDisablingWarningEmails = async () => {
  const now = new Date();

  const accountsToWarn = await prismaClient.account.findMany({
    where: inactiveSinceWhereClause(
      subYears(
        addWeeks(now, FIRST_WARNING_DELAY_IN_WEEKS),
        INACTIVITY_PERIOD_IN_YEARS,
      ),
    ),
    include: { inactivityWarnings: true },
  });

  const sentCountByTimeBeforeDisabling: Record<
    TimeBeforeAccountDisabling,
    number
  > = {
    SIX_WEEKS: 0,
    TWO_WEEKS: 0,
    ONE_DAY: 0,
  };
  let failedCount = 0;

  for (const account of accountsToWarn) {
    const scheduledDisablingDate = getScheduledDisablingDate(account);
    const timeBeforeDisabling = getTimeBeforeDisablingToWarnAbout(
      scheduledDisablingDate,
      now,
    );
    const alreadyWarnedTimesBeforeDisabling = getCurrentInactivityCycleWarnings(
      account,
    ).map((w) => w.timeBeforeDisabling);

    if (
      isWarningAlreadySent(
        timeBeforeDisabling,
        alreadyWarnedTimesBeforeDisabling,
      )
    ) {
      continue;
    }

    try {
      const emailSent = await sendInactiveAccountDisablingWarningEmail({
        email: account.email,
        accountFullName: [account.firstname, account.lastname]
          .filter(Boolean)
          .join(" "),
        // Accounts already past their disabling date are disabled at the earliest the next day
        accountDisablingDate: max([scheduledDisablingDate, addDays(now, 1)]),
        accountLastLoginDate: account.lastLoginAt,
      });

      // An unsent warning is not recorded, so it is retried on the next run
      if (!emailSent) {
        failedCount++;
        logger.error(
          { accountId: account.id, timeBeforeDisabling },
          "Le mail d'avertissement de désactivation du compte n'a pas pu être envoyé",
        );
        continue;
      }

      await prismaClient.accountInactivityWarning.create({
        data: { accountId: account.id, timeBeforeDisabling },
      });
      sentCountByTimeBeforeDisabling[timeBeforeDisabling]++;
    } catch (error) {
      failedCount++;
      logger.error(
        { accountId: account.id, timeBeforeDisabling, error },
        "Impossible d'envoyer le mail d'avertissement de désactivation du compte",
      );
    }
  }

  logger.info(
    { sentCountByTimeBeforeDisabling, failedCount },
    "Envoi des mails d'avertissement de désactivation des comptes inactifs terminé",
  );
};
