import { TimeBeforeAccountDisabling } from "@prisma/client";
import { addDays, addHours, format, max, subDays, subYears } from "date-fns";

import * as EmailModule from "@/modules/shared/email/sendEmailUsingTemplate";
import { prismaClient } from "@/prisma/client";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";

import { sendInactiveAccountsDisablingWarningEmails } from "./sendInactiveAccountsDisablingWarningEmails";

const TEMPLATE_ID = 791;

// Creates an account whose scheduled disabling date is at the given date
const createAccountDisabledAt = (
  disablingDate: Date,
  overrides: Parameters<typeof createAccountHelper>[0] = {},
) =>
  createAccountHelper({
    createdAt: subYears(new Date(), 5),
    lastLoginAt: subYears(disablingDate, 2),
    ...overrides,
  });

const getWarnedTimesBeforeDisabling = async (accountId: string) =>
  (
    await prismaClient.accountInactivityWarning.findMany({
      where: { accountId },
      orderBy: { sentAt: "asc" },
    })
  ).map((w) => w.timeBeforeDisabling);

const createWarning = (
  accountId: string,
  timeBeforeDisabling: TimeBeforeAccountDisabling,
  sentAt: Date,
) =>
  prismaClient.accountInactivityWarning.create({
    data: { accountId, timeBeforeDisabling, sentAt },
  });

describe("sendInactiveAccountsDisablingWarningEmails", () => {
  const mockSendEmail = () =>
    vi.spyOn(EmailModule, "sendEmailUsingTemplate").mockResolvedValue(true);
  let sendEmailSpy: ReturnType<typeof mockSendEmail>;

  beforeEach(() => {
    sendEmailSpy = mockSendEmail();
  });

  test.each([
    ["6 weeks", 41, "SIX_WEEKS"],
    ["2 weeks", 13, "TWO_WEEKS"],
    ["24h", 0.5, "ONE_DAY"],
  ] as const)(
    "sends the %s warning when the disabling is %s days away",
    async (
      _label: string,
      daysLeft: number,
      expectedTimeBeforeDisabling: TimeBeforeAccountDisabling,
    ) => {
      const disablingDate = addHours(new Date(), daysLeft * 24);
      const account = await createAccountDisabledAt(disablingDate);

      await sendInactiveAccountsDisablingWarningEmails();

      expect(await getWarnedTimesBeforeDisabling(account.id)).toEqual([
        expectedTimeBeforeDisabling,
      ]);
      expect(sendEmailSpy).toHaveBeenCalledExactlyOnceWith({
        to: { email: account.email },
        templateId: TEMPLATE_ID,
        params: {
          accountEmail: account.email,
          accountFullName: `${account.firstname} ${account.lastname}`,
          accountDisablingDate: format(
            max([disablingDate, addDays(new Date(), 1)]),
            "dd/MM/yyyy",
          ),
          accountLastLoginDate: format(account.lastLoginAt!, "dd/MM/yyyy"),
        },
      });
    },
  );

  test("sends nothing when the disabling is more than 6 weeks away", async () => {
    const account = await createAccountDisabledAt(addDays(new Date(), 50));

    await sendInactiveAccountsDisablingWarningEmails();

    expect(await getWarnedTimesBeforeDisabling(account.id)).toEqual([]);
    expect(sendEmailSpy).not.toHaveBeenCalled();
  });

  test("only sends the 24h warning, dated tomorrow, to accounts inactive for more than 2 years", async () => {
    const account = await createAccountHelper({
      createdAt: subYears(new Date(), 3),
      lastLoginAt: null,
    });

    await sendInactiveAccountsDisablingWarningEmails();
    await sendInactiveAccountsDisablingWarningEmails();

    expect(await getWarnedTimesBeforeDisabling(account.id)).toEqual([
      "ONE_DAY",
    ]);
    expect(sendEmailSpy).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        params: expect.objectContaining({
          accountDisablingDate: format(addDays(new Date(), 1), "dd/MM/yyyy"),
          accountLastLoginDate: "inconnue",
        }),
      }),
    );
  });

  test("does not resend a warning already sent", async () => {
    const account = await createAccountDisabledAt(addDays(new Date(), 30));

    await sendInactiveAccountsDisablingWarningEmails();
    await sendInactiveAccountsDisablingWarningEmails();

    expect(await getWarnedTimesBeforeDisabling(account.id)).toEqual([
      "SIX_WEEKS",
    ]);
    expect(sendEmailSpy).toHaveBeenCalledOnce();
  });

  test("sends the 2 weeks warning to an account that already received the 6 weeks one", async () => {
    const account = await createAccountDisabledAt(addDays(new Date(), 10));
    await createWarning(account.id, "SIX_WEEKS", subDays(new Date(), 32));

    await sendInactiveAccountsDisablingWarningEmails();

    expect(await getWarnedTimesBeforeDisabling(account.id)).toEqual([
      "SIX_WEEKS",
      "TWO_WEEKS",
    ]);
  });

  test("does not send a less urgent warning after a more urgent one", async () => {
    const account = await createAccountDisabledAt(addDays(new Date(), 10));
    await createWarning(account.id, "ONE_DAY", subDays(new Date(), 1));

    await sendInactiveAccountsDisablingWarningEmails();

    expect(sendEmailSpy).not.toHaveBeenCalled();
  });

  test("ignores warnings sent before the last login", async () => {
    const disablingDate = addDays(new Date(), 30);
    const account = await createAccountDisabledAt(disablingDate);
    await createWarning(
      account.id,
      "SIX_WEEKS",
      subDays(account.lastLoginAt!, 1),
    );

    await sendInactiveAccountsDisablingWarningEmails();

    expect(await getWarnedTimesBeforeDisabling(account.id)).toEqual([
      "SIX_WEEKS",
      "SIX_WEEKS",
    ]);
  });

  test("ignores API accounts and disabled accounts", async () => {
    const disablingDate = addDays(new Date(), 10);
    await createAccountDisabledAt(disablingDate, { isApiUser: true });
    await createAccountDisabledAt(disablingDate, {
      disabledAt: subDays(new Date(), 1),
    });

    await sendInactiveAccountsDisablingWarningEmails();

    expect(sendEmailSpy).not.toHaveBeenCalled();
  });

  test("keeps warning the other accounts when an email fails", async () => {
    const failing = await createAccountDisabledAt(addDays(new Date(), 10));
    const succeeding = await createAccountDisabledAt(addDays(new Date(), 10));
    sendEmailSpy.mockImplementation(
      async ({
        to,
      }: Parameters<typeof EmailModule.sendEmailUsingTemplate>[0]) =>
        Array.isArray(to) || to.email !== failing.email,
    );

    await sendInactiveAccountsDisablingWarningEmails();

    expect(await getWarnedTimesBeforeDisabling(failing.id)).toEqual([]);
    expect(await getWarnedTimesBeforeDisabling(succeeding.id)).toEqual([
      "TWO_WEEKS",
    ]);
  });

  test("does not record a warning whose email could not be sent, so it is retried on the next run", async () => {
    const account = await createAccountDisabledAt(addDays(new Date(), 10));
    sendEmailSpy.mockResolvedValueOnce(false);

    await sendInactiveAccountsDisablingWarningEmails();
    expect(await getWarnedTimesBeforeDisabling(account.id)).toEqual([]);

    await sendInactiveAccountsDisablingWarningEmails();
    expect(await getWarnedTimesBeforeDisabling(account.id)).toEqual([
      "TWO_WEEKS",
    ]);
    expect(sendEmailSpy).toHaveBeenCalledTimes(2);
  });

  describe("max emails per run", () => {
    test("sends at most maxEmailsPerRun emails and sends the rest on the next run", async () => {
      await createAccountDisabledAt(addDays(new Date(), 10));
      await createAccountDisabledAt(addDays(new Date(), 20));
      await createAccountDisabledAt(addDays(new Date(), 30));

      await sendInactiveAccountsDisablingWarningEmails({ maxEmailsPerRun: 2 });
      expect(sendEmailSpy).toHaveBeenCalledTimes(2);

      await sendInactiveAccountsDisablingWarningEmails({ maxEmailsPerRun: 2 });
      expect(sendEmailSpy).toHaveBeenCalledTimes(3);
      expect(await prismaClient.accountInactivityWarning.count()).toBe(3);
    });

    test("warns upcoming deadlines first, soonest first, before accounts already past their disabling date", async () => {
      const pastDue = await createAccountHelper({
        createdAt: subYears(new Date(), 3),
        lastLoginAt: null,
      });
      const inThirtyDays = await createAccountDisabledAt(
        addDays(new Date(), 30),
      );
      const inTenDays = await createAccountDisabledAt(addDays(new Date(), 10));

      await sendInactiveAccountsDisablingWarningEmails({ maxEmailsPerRun: 2 });

      expect(
        sendEmailSpy.mock.calls.map(
          ([{ to }]: Parameters<typeof EmailModule.sendEmailUsingTemplate>) =>
            Array.isArray(to) ? undefined : to.email,
        ),
      ).toEqual([inTenDays.email, inThirtyDays.email]);
      expect(await getWarnedTimesBeforeDisabling(pastDue.id)).toEqual([]);
    });
  });
});
