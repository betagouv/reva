import * as getKeycloakAdminModule from "@/modules/shared/auth/getKeycloakAdmin";
import { COMPTE_ADMIN_NON_MODIFIABLE } from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";

import { disableAccounts } from "./disableAccounts";

const mockKeycloakAdmin = ({
  findOne = vi.fn().mockResolvedValue({}),
  listGroups = vi.fn().mockResolvedValue([]),
  update = vi.fn().mockResolvedValue(undefined),
}: {
  findOne?: ReturnType<typeof vi.fn>;
  listGroups?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
} = {}) => {
  vi.spyOn(getKeycloakAdminModule, "getKeycloakAdmin").mockImplementation(
    () =>
      Promise.resolve({
        users: { findOne, listGroups, update },
      }) as unknown as ReturnType<
        typeof getKeycloakAdminModule.getKeycloakAdmin
      >,
  );
  return { findOne, listGroups, update };
};

const getDisabledAt = async (accountId: string) =>
  (await prismaClient.account.findUniqueOrThrow({ where: { id: accountId } }))
    .disabledAt;

const disableAccountsIds = async (accountIds: string[]) => {
  const { disabledAccounts, failedAccounts } = await disableAccounts({
    accountIds,
  });
  return {
    disabledIds: disabledAccounts.map((a) => a.id),
    failures: failedAccounts.map((f) => ({
      accountId: f.accountId,
      message: f.error.message,
    })),
  };
};

describe("disableAccounts", () => {
  test("disables every given account in keycloak and in the database", async () => {
    const { update } = mockKeycloakAdmin();
    const accountA = await createAccountHelper();
    const accountB = await createAccountHelper();

    const { disabledAccounts, failedAccounts } = await disableAccounts({
      accountIds: [accountA.id, accountB.id],
    });

    expect(disabledAccounts.map((a) => a.id)).toEqual([
      accountA.id,
      accountB.id,
    ]);
    expect(disabledAccounts.every((a) => a.disabledAt)).toBe(true);
    expect(failedAccounts).toEqual([]);
    expect(await getDisabledAt(accountA.id)).not.toBeNull();
    expect(await getDisabledAt(accountB.id)).not.toBeNull();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: accountA.keycloakId }),
      { enabled: false },
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: accountB.keycloakId }),
      { enabled: false },
    );
  });

  test("returns empty results without calling keycloak when no account ids are given", async () => {
    const getKeycloakAdminSpy = vi.spyOn(
      getKeycloakAdminModule,
      "getKeycloakAdmin",
    );

    expect(await disableAccounts({ accountIds: [] })).toEqual({
      disabledAccounts: [],
      failedAccounts: [],
    });
    expect(getKeycloakAdminSpy).not.toHaveBeenCalled();
  });

  test("processes accounts by chunks of 20 with a fresh keycloak client per chunk", async () => {
    const { update } = mockKeycloakAdmin();
    const accounts = await Promise.all(
      Array.from({ length: 21 }, () => createAccountHelper()),
    );

    const { disabledIds } = await disableAccountsIds([
      ...accounts.map((a) => a.id),
      accounts[0].id,
    ]);

    expect(disabledIds).toEqual(accounts.map((a) => a.id));
    expect(getKeycloakAdminModule.getKeycloakAdmin).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(21);
  });

  test("skips an account that does not exist and disables the others", async () => {
    mockKeycloakAdmin();
    const account = await createAccountHelper();
    const unknownId = "00000000-0000-0000-0000-000000000000";

    expect(await disableAccountsIds([unknownId, account.id])).toEqual({
      disabledIds: [account.id],
      failures: [
        {
          accountId: unknownId,
          message: `Compte utilisateur pour l'id ${unknownId} non trouvé`,
        },
      ],
    });
  });

  test("skips an account that is already disabled and disables the others", async () => {
    const { update } = mockKeycloakAdmin();
    const account = await createAccountHelper();
    const disabledAccount = await createAccountHelper({
      disabledAt: new Date(),
    });

    expect(await disableAccountsIds([disabledAccount.id, account.id])).toEqual({
      disabledIds: [account.id],
      failures: [
        {
          accountId: disabledAccount.id,
          message: `Compte utilisateur pour l'id ${disabledAccount.id} est déjà désactivé`,
        },
      ],
    });
    expect(update).toHaveBeenCalledTimes(1);
  });

  test("skips an account that is missing in keycloak and disables the others", async () => {
    const account = await createAccountHelper();
    const missingKeycloakAccount = await createAccountHelper();
    mockKeycloakAdmin({
      findOne: vi.fn(({ id }: { id: string }) =>
        Promise.resolve(
          id === missingKeycloakAccount.keycloakId ? undefined : {},
        ),
      ),
    });

    expect(
      await disableAccountsIds([missingKeycloakAccount.id, account.id]),
    ).toEqual({
      disabledIds: [account.id],
      failures: [
        {
          accountId: missingKeycloakAccount.id,
          message: `Compte utilisateur keycloak pour l'id ${missingKeycloakAccount.keycloakId} non trouvé`,
        },
      ],
    });
    expect(await getDisabledAt(missingKeycloakAccount.id)).toBeNull();
  });

  test("skips an admin account and disables the others", async () => {
    const account = await createAccountHelper();
    const adminAccount = await createAccountHelper();
    mockKeycloakAdmin({
      listGroups: vi.fn(({ id }: { id: string }) =>
        Promise.resolve(
          id === adminAccount.keycloakId ? [{ name: "admin" }] : [],
        ),
      ),
    });

    expect(await disableAccountsIds([adminAccount.id, account.id])).toEqual({
      disabledIds: [account.id],
      failures: [
        { accountId: adminAccount.id, message: COMPTE_ADMIN_NON_MODIFIABLE },
      ],
    });
    expect(await getDisabledAt(adminAccount.id)).toBeNull();
  });

  test("keeps the account active in the database when the keycloak update fails", async () => {
    const account = await createAccountHelper();
    const failingAccount = await createAccountHelper();
    mockKeycloakAdmin({
      update: vi.fn(({ id }: { id: string }) =>
        id === failingAccount.keycloakId
          ? Promise.reject(new Error("Keycloak unavailable"))
          : Promise.resolve(undefined),
      ),
    });

    expect(await disableAccountsIds([failingAccount.id, account.id])).toEqual({
      disabledIds: [account.id],
      failures: [
        { accountId: failingAccount.id, message: "Keycloak unavailable" },
      ],
    });
    expect(await getDisabledAt(failingAccount.id)).toBeNull();
  });
});
