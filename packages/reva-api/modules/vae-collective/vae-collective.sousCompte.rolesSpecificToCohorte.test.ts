import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../graphql/generated";

const vaeCollective_getCommanditaireVaeCollectiveSousComptes = graphql(`
  query vaeCollective_getCommanditaireVaeCollectiveSousComptesRolesSpecificToCohorte(
    $commanditaireVaeCollectiveId: ID!
    $cohorteVaeCollectiveId: ID!
  ) {
    vaeCollective_getCommanditaireVaeCollective(
      commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
    ) {
      sousComptes {
        rows {
          id
          rolesSpecificToCohorte(
            cohorteVaeCollectiveId: $cohorteVaeCollectiveId
          )
        }
      }
    }
  }
`);

const getSousComptes = ({
  commanditaireVaeCollectiveId,
  cohorteVaeCollectiveId,
  keycloakId,
}: {
  commanditaireVaeCollectiveId: string;
  cohorteVaeCollectiveId: string;
  keycloakId: string;
}) => {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId,
      }),
    },
  });

  return graphqlClient.request(
    vaeCollective_getCommanditaireVaeCollectiveSousComptes,
    { commanditaireVaeCollectiveId, cohorteVaeCollectiveId },
  );
};

const createSousCompte = async ({
  commanditaireVaeCollectiveId,
}: {
  commanditaireVaeCollectiveId: string;
}) => {
  const account = await createAccountHelper();
  return prismaClient.sousCompteVaeCollective.create({
    data: { commanditaireVaeCollectiveId, accountId: account.id },
  });
};

describe("SousCompteVaeCollective.rolesSpecificToCohorte", () => {
  test("should return the roles specific to the given sous compte and cohorte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const sousCompte = await createSousCompte({ commanditaireVaeCollectiveId });
    await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.create({
      data: {
        sousCompteVaeCollectiveId: sousCompte.id,
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
        role: "CREATEUR_COHORTE",
      },
    });

    const res = await getSousComptes({
      commanditaireVaeCollectiveId,
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    expect(
      res.vaeCollective_getCommanditaireVaeCollective.sousComptes.rows,
    ).toContainEqual({
      id: sousCompte.id,
      rolesSpecificToCohorte: ["CREATEUR_COHORTE"],
    });
  });

  test("should return an empty array when the sous compte has no role specific to the given cohorte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const sousCompte = await createSousCompte({ commanditaireVaeCollectiveId });

    const res = await getSousComptes({
      commanditaireVaeCollectiveId,
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    expect(
      res.vaeCollective_getCommanditaireVaeCollective.sousComptes.rows,
    ).toContainEqual({
      id: sousCompte.id,
      rolesSpecificToCohorte: [],
    });
  });

  test("should only return roles specific to the requested cohorte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const otherCohorteVaeCollective = await createCohorteVaeCollectiveHelper({
      commanditaireVaeCollective: {
        connect: { id: cohorteVaeCollective.commanditaireVaeCollectiveId },
      },
    });
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const sousCompte = await createSousCompte({ commanditaireVaeCollectiveId });
    await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.create({
      data: {
        sousCompteVaeCollectiveId: sousCompte.id,
        cohorteVaeCollectiveId: otherCohorteVaeCollective.id,
        role: "CREATEUR_COHORTE",
      },
    });

    const res = await getSousComptes({
      commanditaireVaeCollectiveId,
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    expect(
      res.vaeCollective_getCommanditaireVaeCollective.sousComptes.rows,
    ).toContainEqual({
      id: sousCompte.id,
      rolesSpecificToCohorte: [],
    });
  });
});
