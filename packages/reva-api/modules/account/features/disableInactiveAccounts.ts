import { subDays, subYears } from "date-fns";

import { logger } from "@/modules/shared/logger/logger";
import { prismaClient } from "@/prisma/client";

import {
  getCurrentInactivityCycleWarnings,
  INACTIVITY_PERIOD_IN_YEARS,
  inactiveSinceWhereClause,
} from "../utils/inactiveAccounts";

import { disableAccounts } from "./disableAccounts";

/**
 * Disables every non-API account created more than 2 years ago that has not logged in for 2 years,
 * provided its 24h warning email was sent at least 24h ago during the current inactivity cycle.
 * A NULL createdAt (account created before the column existed) counts as old,
 * and a NULL lastLoginAt counts as never logged in.
 */
export const disableInactiveAccounts = async () => {
  const now = new Date();
  const oneDayAgo = subDays(now, 1);

  const inactiveAccounts = await prismaClient.account.findMany({
    where: inactiveSinceWhereClause(subYears(now, INACTIVITY_PERIOD_IN_YEARS)),
    include: {
      inactivityWarnings: { where: { timeBeforeDisabling: "ONE_DAY" } },
    },
  });

  const warnedAccounts = inactiveAccounts.filter((account) =>
    getCurrentInactivityCycleWarnings(account).some(
      (warning) => warning.sentAt <= oneDayAgo,
    ),
  );

  const result = await disableAccounts({
    accountIds: warnedAccounts.map((a) => a.id),
    allowAdminAccountDisabling: true,
  });

  logger.info(
    {
      inactiveAccountsCount: inactiveAccounts.length,
      notYetWarnedAccountsCount:
        inactiveAccounts.length - warnedAccounts.length,
      disabledAccountsCount: result.disabledAccounts.length,
      failedAccountsCount: result.failedAccounts.length,
    },
    "Désactivation des comptes inactifs terminée",
  );

  return result;
};
