import { AccountInactivityWarning } from "@prisma/client";

import {
  getCurrentInactivityCycleWarnings,
  getLastActivityDate,
} from "./inactiveAccounts";

const JAN_2024 = new Date("2024-01-15T10:00:00Z");
const JUN_2024 = new Date("2024-06-15T10:00:00Z");

describe("getLastActivityDate", () => {
  test("returns the most recent of createdAt and lastLoginAt", () => {
    expect(
      getLastActivityDate({ createdAt: JAN_2024, lastLoginAt: JUN_2024 }),
    ).toEqual(JUN_2024);
    expect(
      getLastActivityDate({ createdAt: JUN_2024, lastLoginAt: JAN_2024 }),
    ).toEqual(JUN_2024);
  });

  test("treats NULL dates as the epoch", () => {
    expect(
      getLastActivityDate({ createdAt: null, lastLoginAt: JAN_2024 }),
    ).toEqual(JAN_2024);
    expect(getLastActivityDate({ createdAt: null, lastLoginAt: null })).toEqual(
      new Date(0),
    );
  });
});

describe("getCurrentInactivityCycleWarnings", () => {
  test("keeps only the warnings sent since the last activity", () => {
    const warning = (sentAt: Date) =>
      ({
        sentAt,
        timeBeforeDisabling: "SIX_WEEKS",
      }) as AccountInactivityWarning;
    const oldWarning = warning(new Date("2024-03-01T00:00:00Z"));
    const currentWarning = warning(new Date("2024-07-01T00:00:00Z"));

    expect(
      getCurrentInactivityCycleWarnings({
        createdAt: JAN_2024,
        lastLoginAt: JUN_2024,
        inactivityWarnings: [oldWarning, currentWarning],
      }),
    ).toEqual([currentWarning]);
  });
});
