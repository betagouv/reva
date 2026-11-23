import { chunk, uniq } from "lodash";

import { getKeycloakAdmin } from "@/modules/shared/auth/getKeycloakAdmin";
import { COMPTE_ADMIN_NON_MODIFIABLE } from "@/modules/shared/errors/messages";
import { logger } from "@/modules/shared/logger/logger";
import { prismaClient } from "@/prisma/client";

import { Account } from "../account.types";

// Each chunk gets a fresh Keycloak admin client so its access token never expires mid-run
const CHUNK_SIZE = 20;

type KeycloakAdmin = Awaited<ReturnType<typeof getKeycloakAdmin>>;

type FailedAccount = { accountId: string; error: Error };

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

const assertKeycloakAccountCanBeDisabled = async (
  keycloakAdmin: KeycloakAdmin,
  keycloakId: string,
) => {
  const keycloakAccount = await keycloakAdmin.users.findOne({
    id: keycloakId,
    realm: process.env.KEYCLOAK_ADMIN_REALM_REVA,
  });

  if (!keycloakAccount) {
    throw new Error(
      `Compte utilisateur keycloak pour l'id ${keycloakId} non trouvé`,
    );
  }

  const groups = await keycloakAdmin.users.listGroups({
    id: keycloakId,
    realm: process.env.KEYCLOAK_ADMIN_REALM_REVA,
  });

  if (groups.some((group) => group.name == "admin")) {
    throw new Error(COMPTE_ADMIN_NON_MODIFIABLE);
  }
};

/**
 * Disables an account in Keycloak first, then in the business DB.
 * If the Keycloak step fails, the account stays active in both and can be retried.
 */
const disableAccount = async (
  keycloakAdmin: KeycloakAdmin,
  accountId: string,
  account: Account | undefined,
): Promise<Account> => {
  if (!account) {
    throw new Error(`Compte utilisateur pour l'id ${accountId} non trouvé`);
  }

  if (account.disabledAt) {
    throw new Error(
      `Compte utilisateur pour l'id ${accountId} est déjà désactivé`,
    );
  }

  await assertKeycloakAccountCanBeDisabled(keycloakAdmin, account.keycloakId);

  await keycloakAdmin.users.update(
    {
      id: account.keycloakId,
      realm: process.env.KEYCLOAK_ADMIN_REALM_REVA,
    },
    { enabled: false },
  );

  return prismaClient.account.update({
    where: { id: account.id },
    data: { disabledAt: new Date() },
  });
};

/**
 * Disables the given accounts in Keycloak and in the business DB, by chunks of 20.
 * An account that cannot be disabled is logged and skipped; the others are still processed.
 */
export const disableAccounts = async (params: {
  accountIds: string[];
}): Promise<{
  disabledAccounts: Account[];
  failedAccounts: FailedAccount[];
}> => {
  const disabledAccounts: Account[] = [];
  const failedAccounts: FailedAccount[] = [];

  for (const accountIdsChunk of chunk(uniq(params.accountIds), CHUNK_SIZE)) {
    const accounts = await prismaClient.account.findMany({
      where: { id: { in: accountIdsChunk } },
    });
    const keycloakAdmin = await getKeycloakAdmin();

    for (const accountId of accountIdsChunk) {
      try {
        disabledAccounts.push(
          await disableAccount(
            keycloakAdmin,
            accountId,
            accounts.find((a) => a.id === accountId),
          ),
        );
      } catch (e) {
        const error = toError(e);
        logger.warn(
          { accountId, error: error.message },
          "Impossible de désactiver le compte utilisateur",
        );
        failedAccounts.push({ accountId, error });
      }
    }
  }

  return { disabledAccounts, failedAccounts };
};
