import {
  NOT_AUTHORIZED,
  NOT_AUTHORIZED_RESOURCE_ACCESS,
} from "@/modules/shared/security/messages";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";
import { createSousCompteVaeCollectiveHelper } from "@/test/helpers/entities/create-sous-compte-vae-collective-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../graphql/generated";

const vaeCollective_getCommanditaireVaeCollective = graphql(`
  query vaeCollective_getCommanditaireVaeCollective(
    $commanditaireVaeCollectiveId: ID!
  ) {
    vaeCollective_getCommanditaireVaeCollective(
      commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
    ) {
      id
      raisonSociale
    }
  }
`);

const getCommanditaireVaeCollective = (
  commanditaireVaeCollectiveId: string,
  role: KeyCloakUserRole,
  keycloakId?: string,
) => {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role,
        keycloakId,
      }),
    },
  });

  return graphqlClient.request(vaeCollective_getCommanditaireVaeCollective, {
    commanditaireVaeCollectiveId,
  });
};

describe("get commanditaire vae collective", () => {
  test("should let the gestionnaire get their own commanditaire vae collective", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;
    const userKeycloakId =
      cohorteVaeCollective.commanditaireVaeCollective?.gestionnaire?.keycloakId;

    if (!userKeycloakId) {
      throw new Error("Compte gestionnaire non trouvé");
    }

    const res = await getCommanditaireVaeCollective(
      commanditaireVaeCollectiveId,
      "manage_vae_collective",
      userKeycloakId,
    );

    expect(res).toMatchObject({
      vaeCollective_getCommanditaireVaeCollective: {
        id: commanditaireVaeCollectiveId,
        raisonSociale:
          cohorteVaeCollective.commanditaireVaeCollective?.raisonSociale,
      },
    });
  });

  test("should let a sous compte get the commanditaire vae collective it belongs to", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;
    const sousCompteAccount = await createAccountHelper();
    await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId,
      accountId: sousCompteAccount.id,
    });

    const res = await getCommanditaireVaeCollective(
      commanditaireVaeCollectiveId,
      "manage_vae_collective",
      sousCompteAccount.keycloakId,
    );

    expect(res).toMatchObject({
      vaeCollective_getCommanditaireVaeCollective: {
        id: commanditaireVaeCollectiveId,
        raisonSociale:
          cohorteVaeCollective.commanditaireVaeCollective?.raisonSociale,
      },
    });
  });

  test("should not let a sous compte get a commanditaire vae collective it doesn't belong to", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const anotherCohorteVaeCollective =
      await createCohorteVaeCollectiveHelper();
    const sousCompteAccount = await createAccountHelper();
    await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId:
        cohorteVaeCollective.commanditaireVaeCollectiveId,
      accountId: sousCompteAccount.id,
    });

    await expect(
      getCommanditaireVaeCollective(
        anotherCohorteVaeCollective.commanditaireVaeCollectiveId,
        "manage_vae_collective",
        sousCompteAccount.keycloakId,
      ),
    ).rejects.toThrowError(NOT_AUTHORIZED_RESOURCE_ACCESS);
  });

  test("should let an admin get any commanditaire vae collective", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const res = await getCommanditaireVaeCollective(
      commanditaireVaeCollectiveId,
      "admin",
      "1b0e7046-ca61-4259-b716-785f36ab79b2",
    );

    expect(res).toMatchObject({
      vaeCollective_getCommanditaireVaeCollective: {
        id: commanditaireVaeCollectiveId,
      },
    });
  });

  test("should not let a gestionnaire get a commanditaire vae collective they don't manage", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const anotherCohorteVaeCollective =
      await createCohorteVaeCollectiveHelper();

    const userKeycloakId =
      cohorteVaeCollective.commanditaireVaeCollective?.gestionnaire?.keycloakId;

    if (!userKeycloakId) {
      throw new Error("Compte gestionnaire non trouvé");
    }

    await expect(
      getCommanditaireVaeCollective(
        anotherCohorteVaeCollective.commanditaireVaeCollectiveId,
        "manage_vae_collective",
        userKeycloakId,
      ),
    ).rejects.toThrowError(NOT_AUTHORIZED_RESOURCE_ACCESS);
  });

  test("should not let a user without an authorized role get a commanditaire vae collective", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    await expect(
      getCommanditaireVaeCollective(
        cohorteVaeCollective.commanditaireVaeCollectiveId,
        "manage_candidacy",
      ),
    ).rejects.toThrowError(NOT_AUTHORIZED);
  });
});
