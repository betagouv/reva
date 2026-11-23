import { subMonths, subYears } from "date-fns";

import * as getKeycloakAdminModule from "@/modules/shared/auth/getKeycloakAdmin";
import { prismaClient } from "@/prisma/client";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";

import { disableInactiveAccounts } from "./disableInactiveAccounts";

const THREE_YEARS_AGO = subYears(new Date(), 3);
const ONE_MONTH_AGO = subMonths(new Date(), 1);

const mockKeycloakAdmin = (groups: { name: string }[] = []) =>
  vi.spyOn(getKeycloakAdminModule, "getKeycloakAdmin").mockImplementation(
    () =>
      Promise.resolve({
        users: {
          findOne: vi.fn().mockResolvedValue({}),
          listGroups: vi.fn().mockResolvedValue(groups),
          update: vi.fn().mockResolvedValue(undefined),
        },
      }) as unknown as ReturnType<
        typeof getKeycloakAdminModule.getKeycloakAdmin
      >,
  );

const getDisabledAt = async (accountId: string) =>
  (await prismaClient.account.findUniqueOrThrow({ where: { id: accountId } }))
    .disabledAt;

describe("disableInactiveAccounts", () => {
  beforeEach(() => {
    mockKeycloakAdmin();
  });

  test("disables an account created and last logged in more than 2 years ago", async () => {
    const account = await createAccountHelper({
      createdAt: THREE_YEARS_AGO,
      lastLoginAt: THREE_YEARS_AGO,
    });

    const { disabledAccounts, failedAccounts } =
      await disableInactiveAccounts();

    expect(disabledAccounts.map((a) => a.id)).toEqual([account.id]);
    expect(failedAccounts).toEqual([]);
    expect(await getDisabledAt(account.id)).not.toBeNull();
  });

  test("treats a NULL createdAt as old and a NULL lastLoginAt as never logged in", async () => {
    const nullCreatedAt = await createAccountHelper({
      createdAt: null,
      lastLoginAt: THREE_YEARS_AGO,
    });
    const nullLastLoginAt = await createAccountHelper({
      createdAt: THREE_YEARS_AGO,
      lastLoginAt: null,
    });
    const bothNull = await createAccountHelper({
      createdAt: null,
      lastLoginAt: null,
    });

    const { disabledAccounts } = await disableInactiveAccounts();

    expect(disabledAccounts.map((a) => a.id).sort()).toEqual(
      [nullCreatedAt.id, nullLastLoginAt.id, bothNull.id].sort(),
    );
  });

  test("keeps an account that logged in within the last 2 years", async () => {
    const account = await createAccountHelper({
      createdAt: null,
      lastLoginAt: ONE_MONTH_AGO,
    });

    const { disabledAccounts } = await disableInactiveAccounts();

    expect(disabledAccounts).toEqual([]);
    expect(await getDisabledAt(account.id)).toBeNull();
  });

  test("keeps an account created within the last 2 years", async () => {
    const account = await createAccountHelper({
      createdAt: ONE_MONTH_AGO,
      lastLoginAt: null,
    });

    const { disabledAccounts } = await disableInactiveAccounts();

    expect(disabledAccounts).toEqual([]);
    expect(await getDisabledAt(account.id)).toBeNull();
  });

  test("keeps API accounts", async () => {
    const account = await createAccountHelper({
      isApiUser: true,
      createdAt: THREE_YEARS_AGO,
      lastLoginAt: null,
    });

    const { disabledAccounts } = await disableInactiveAccounts();

    expect(disabledAccounts).toEqual([]);
    expect(await getDisabledAt(account.id)).toBeNull();
  });

  test("ignores already disabled accounts", async () => {
    await createAccountHelper({
      createdAt: THREE_YEARS_AGO,
      lastLoginAt: null,
      disabledAt: ONE_MONTH_AGO,
    });

    expect(await disableInactiveAccounts()).toEqual({
      disabledAccounts: [],
      failedAccounts: [],
    });
  });

  test("disables inactive accounts in the keycloak admin group", async () => {
    mockKeycloakAdmin([{ name: "admin" }]);
    const adminAccount = await createAccountHelper({
      createdAt: THREE_YEARS_AGO,
      lastLoginAt: null,
    });

    const { disabledAccounts, failedAccounts } =
      await disableInactiveAccounts();

    expect(disabledAccounts.map((a) => a.id)).toEqual([adminAccount.id]);
    expect(failedAccounts).toEqual([]);
  });
});
