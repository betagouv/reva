import { subYears } from "date-fns";

import { logger } from "@/modules/shared/logger/logger";
import { prismaClient } from "@/prisma/client";

import { disableAccounts } from "./disableAccounts";

const INACTIVITY_PERIOD_IN_YEARS = 2;

/**
 * Disables every non-API account created more than 2 years ago that has not logged in for 2 years.
 * A NULL createdAt (account created before the column existed) counts as old,
 * and a NULL lastLoginAt counts as never logged in.
 */
export const disableInactiveAccounts = async () => {
  const threshold = subYears(new Date(), INACTIVITY_PERIOD_IN_YEARS);

  const inactiveAccounts = await prismaClient.account.findMany({
    select: { id: true },
    where: {
      isApiUser: false,
      disabledAt: null,
      OR: [{ createdAt: null }, { createdAt: { lt: threshold } }],
      AND: [
        { OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: threshold } }] },
      ],
    },
  });

  const result = await disableAccounts({
    accountIds: inactiveAccounts.map((a) => a.id),
    allowAdminAccountDisabling: true,
  });

  logger.info(
    {
      inactiveAccountsCount: inactiveAccounts.length,
      disabledAccountsCount: result.disabledAccounts.length,
      failedAccountsCount: result.failedAccounts.length,
    },
    "Désactivation des comptes inactifs terminée",
  );

  return result;
};
