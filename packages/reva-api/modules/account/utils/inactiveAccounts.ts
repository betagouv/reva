import { AccountInactivityWarning } from "@prisma/client";
import { addYears, max } from "date-fns";

export const INACTIVITY_PERIOD_IN_YEARS = 2;

type AccountActivityDates = {
  createdAt: Date | null;
  lastLoginAt: Date | null;
};

/**
 * Most recent activity of an account: its creation or its last login.
 * A NULL date (account created before the column existed / never logged in) counts as the epoch.
 */
export const getLastActivityDate = ({
  createdAt,
  lastLoginAt,
}: AccountActivityDates) => max([createdAt ?? 0, lastLoginAt ?? 0]);

export const getScheduledDisablingDate = (account: AccountActivityDates) =>
  addYears(getLastActivityDate(account), INACTIVITY_PERIOD_IN_YEARS);

/**
 * Warnings sent during the current inactivity cycle.
 * A warning sent before the last activity belongs to a previous cycle and is ignored.
 */
export const getCurrentInactivityCycleWarnings = (
  account: AccountActivityDates & {
    inactivityWarnings: AccountInactivityWarning[];
  },
) => {
  const lastActivityDate = getLastActivityDate(account);
  return account.inactivityWarnings.filter(
    (warning) => warning.sentAt >= lastActivityDate,
  );
};

/**
 * Prisma filter for non-API, enabled accounts whose creation and last login are both before the given date.
 */
export const inactiveSinceWhereClause = (date: Date) => ({
  isApiUser: false,
  disabledAt: null,
  OR: [{ createdAt: null }, { createdAt: { lt: date } }],
  AND: [{ OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: date } }] }],
});
