import {
  NOT_AUTHORIZED,
  NOT_AUTHORIZED_RESOURCE_ACCESS,
} from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createSousCompteVaeCollectiveHelper } from "@/test/helpers/entities/create-sous-compte-vae-collective-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../graphql/generated";

describe("delete cohorte vae collective", () => {
  test("should not let me delete cohorte vae collective if it is not in draft status", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper({
      status: "PUBLIE",
    });

    const userKeycloakId =
      cohorteVaeCollective.commanditaireVaeCollective?.gestionnaire?.keycloakId;

    if (!userKeycloakId) {
      throw new Error("Compte gestionnaire non trouvé");
    }

    const vaeCollective_deleteCohorteVaeCollective = graphql(`
      mutation vaeCollective_deleteCohorteVaeCollective(
        $commanditaireVaeCollectiveId: ID!
        $cohorteVaeCollectiveId: ID!
      ) {
        vaeCollective_deleteCohorteVaeCollective(
          commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
          cohorteVaeCollectiveId: $cohorteVaeCollectiveId
        )
      }
    `);

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "manage_vae_collective",
          keycloakId: userKeycloakId,
        }),
      },
    });

    await expect(
      graphqlClient.request(vaeCollective_deleteCohorteVaeCollective, {
        commanditaireVaeCollectiveId:
          cohorteVaeCollective.commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
      }),
    ).rejects.toThrowError(
      "Impossible de supprimer si elle n'est plus à l'état brouillon",
    );
  });

  test("should let me delete cohorte vae collective owned by commanditaire vae collective", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    const userKeycloakId =
      cohorteVaeCollective.commanditaireVaeCollective?.gestionnaire?.keycloakId;

    if (!userKeycloakId) {
      throw new Error("Compte gestionnaire non trouvé");
    }

    const vaeCollective_deleteCohorteVaeCollective = graphql(`
      mutation vaeCollective_deleteCohorteVaeCollective(
        $commanditaireVaeCollectiveId: ID!
        $cohorteVaeCollectiveId: ID!
      ) {
        vaeCollective_deleteCohorteVaeCollective(
          commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
          cohorteVaeCollectiveId: $cohorteVaeCollectiveId
        )
      }
    `);

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "manage_vae_collective",
          keycloakId: userKeycloakId,
        }),
      },
    });

    const res = await graphqlClient.request(
      vaeCollective_deleteCohorteVaeCollective,
      {
        commanditaireVaeCollectiveId:
          cohorteVaeCollective.commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
      },
    );

    expect(res).toMatchObject({
      vaeCollective_deleteCohorteVaeCollective: "",
    });
  });

  test("should not let me delete cohorte vae collective not owned by commanditaire vae collective", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const anotherCohorteVaeCollective =
      await createCohorteVaeCollectiveHelper();

    const userKeycloakId =
      cohorteVaeCollective.commanditaireVaeCollective?.gestionnaire?.keycloakId;

    if (!userKeycloakId) {
      throw new Error("Compte gestionnaire non trouvé");
    }

    const vaeCollective_deleteCohorteVaeCollective = graphql(`
      mutation vaeCollective_deleteCohorteVaeCollective(
        $commanditaireVaeCollectiveId: ID!
        $cohorteVaeCollectiveId: ID!
      ) {
        vaeCollective_deleteCohorteVaeCollective(
          commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
          cohorteVaeCollectiveId: $cohorteVaeCollectiveId
        )
      }
    `);

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "manage_vae_collective",
          keycloakId: userKeycloakId,
        }),
      },
    });

    await expect(
      graphqlClient.request(vaeCollective_deleteCohorteVaeCollective, {
        commanditaireVaeCollectiveId:
          cohorteVaeCollective.commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId: anotherCohorteVaeCollective.id,
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED_RESOURCE_ACCESS);
  });

  test("should let an admin delete any cohorte vae collective", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    const vaeCollective_deleteCohorteVaeCollective = graphql(`
      mutation vaeCollective_deleteCohorteVaeCollectiveAsAdmin(
        $commanditaireVaeCollectiveId: ID!
        $cohorteVaeCollectiveId: ID!
      ) {
        vaeCollective_deleteCohorteVaeCollective(
          commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
          cohorteVaeCollectiveId: $cohorteVaeCollectiveId
        )
      }
    `);

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "admin",
          keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
        }),
      },
    });

    const res = await graphqlClient.request(
      vaeCollective_deleteCohorteVaeCollective,
      {
        commanditaireVaeCollectiveId:
          cohorteVaeCollective.commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
      },
    );

    expect(res).toMatchObject({
      vaeCollective_deleteCohorteVaeCollective: "",
    });
  });

  test("should delete the cohorte vae collective and its roles specific to sous comptes", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const sousCompte = await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId:
        cohorteVaeCollective.commanditaireVaeCollectiveId,
      roleSpecificToSousCompteAndCohorteVaeCollectives: {
        create: [
          {
            cohorteVaeCollectiveId: cohorteVaeCollective.id,
            role: "CREATEUR_COHORTE",
          },
        ],
      },
    });

    const vaeCollective_deleteCohorteVaeCollective = graphql(`
      mutation vaeCollective_deleteCohorteVaeCollectiveWithRoles(
        $commanditaireVaeCollectiveId: ID!
        $cohorteVaeCollectiveId: ID!
      ) {
        vaeCollective_deleteCohorteVaeCollective(
          commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
          cohorteVaeCollectiveId: $cohorteVaeCollectiveId
        )
      }
    `);

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "admin",
          keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
        }),
      },
    });

    await graphqlClient.request(vaeCollective_deleteCohorteVaeCollective, {
      commanditaireVaeCollectiveId:
        cohorteVaeCollective.commanditaireVaeCollectiveId,
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
    });

    expect(
      await prismaClient.cohorteVaeCollective.findUnique({
        where: { id: cohorteVaeCollective.id },
      }),
    ).toBeNull();
    expect(
      await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.count({
        where: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
      }),
    ).toBe(0);
    expect(
      await prismaClient.sousCompteVaeCollective.findUnique({
        where: { id: sousCompte.id },
      }),
    ).not.toBeNull();
  });

  test("should not let a user without an authorized role delete a cohorte vae collective", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    const vaeCollective_deleteCohorteVaeCollective = graphql(`
      mutation vaeCollective_deleteCohorteVaeCollectiveUnauthorized(
        $commanditaireVaeCollectiveId: ID!
        $cohorteVaeCollectiveId: ID!
      ) {
        vaeCollective_deleteCohorteVaeCollective(
          commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
          cohorteVaeCollectiveId: $cohorteVaeCollectiveId
        )
      }
    `);

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "manage_candidacy",
        }),
      },
    });

    await expect(
      graphqlClient.request(vaeCollective_deleteCohorteVaeCollective, {
        commanditaireVaeCollectiveId:
          cohorteVaeCollective.commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED);
  });
});
