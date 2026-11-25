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
// Spreads the first wave of warnings over several runs
const DEFAULT_MAX_EMAILS_PER_RUN = 500;

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
 * Upcoming deadlines first (soonest first), then accounts already past their disabling date:
 * those are only disabled once DISABLE_INACTIVE_ACCOUNTS is active, so they can wait a few days.
 */
const compareByDeadlineUrgency =
  (now: Date) =>
  (
    a: { scheduledDisablingDate: Date },
    b: { scheduledDisablingDate: Date },
  ) => {
    const aIsPastDue = a.scheduledDisablingDate < now;
    const bIsPastDue = b.scheduledDisablingDate < now;
    if (aIsPastDue !== bIsPastDue) {
      return aIsPastDue ? 1 : -1;
    }
    return (
      a.scheduledDisablingDate.getTime() - b.scheduledDisablingDate.getTime()
    );
  };

/**
 * Warns inactive accounts by email 6 weeks, 2 weeks and 24h before their automatic disabling.
 * Only the most urgent applicable warning is sent: an account already past its disabling date
 * only receives the 24h warning. Each warning is sent once per inactivity cycle.
 * At most maxEmailsPerRun emails are sent; the remaining warnings are sent on the next runs.
 */
export const sendInactiveAccountsDisablingWarningEmails = async ({
  maxEmailsPerRun = DEFAULT_MAX_EMAILS_PER_RUN,
}: { maxEmailsPerRun?: number } = {}) => {
  const now = new Date();

  const inactiveAccounts = await prismaClient.account.findMany({
    where: inactiveSinceWhereClause(
      subYears(
        addWeeks(now, FIRST_WARNING_DELAY_IN_WEEKS),
        INACTIVITY_PERIOD_IN_YEARS,
      ),
    ),
    include: { inactivityWarnings: true },
  });

  const pendingWarnings = inactiveAccounts
    .map((account) => {
      const scheduledDisablingDate = getScheduledDisablingDate(account);
      return {
        account,
        scheduledDisablingDate,
        timeBeforeDisabling: getTimeBeforeDisablingToWarnAbout(
          scheduledDisablingDate,
          now,
        ),
      };
    })
    .filter(
      ({ account, timeBeforeDisabling }) =>
        !isWarningAlreadySent(
          timeBeforeDisabling,
          getCurrentInactivityCycleWarnings(account).map(
            (w) => w.timeBeforeDisabling,
          ),
        ),
    )
    .sort(compareByDeadlineUrgency(now));

  const warningsToSend = pendingWarnings.slice(0, maxEmailsPerRun);

  const sentCountByTimeBeforeDisabling: Record<
    TimeBeforeAccountDisabling,
    number
  > = {
    SIX_WEEKS: 0,
    TWO_WEEKS: 0,
    ONE_DAY: 0,
  };
  let failedCount = 0;

  for (const {
    account,
    scheduledDisablingDate,
    timeBeforeDisabling,
  } of warningsToSend) {
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
    {
      sentCountByTimeBeforeDisabling,
      failedCount,
      postponedToNextRunCount: pendingWarnings.length - warningsToSend.length,
    },
    "Envoi des mails d'avertissement de désactivation des comptes inactifs terminé",
  );
};
