import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../graphql/generated";

import { canSousCompteCreateCohorteVaeCollective } from "./features/canSousCompteCreateCohorteVaeCollective";

const vaeCollective_getCommanditaireVaeCollectiveSousComptes = graphql(`
  query vaeCollective_getCommanditaireVaeCollectiveSousComptesCanCreateCohorte(
    $commanditaireVaeCollectiveId: ID!
  ) {
    vaeCollective_getCommanditaireVaeCollective(
      commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
    ) {
      sousComptes {
        rows {
          id
          canCreateCohorteVaeCollective
        }
      }
    }
  }
`);

const getSousComptes = ({
  commanditaireVaeCollectiveId,
  keycloakId,
}: {
  commanditaireVaeCollectiveId: string;
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
    { commanditaireVaeCollectiveId },
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

describe("SousCompteVaeCollective.canCreateCohorteVaeCollective", () => {
  test("should return true when the sous compte has the CREER_COHORTE permission", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const sousCompte = await createSousCompte({ commanditaireVaeCollectiveId });
    await prismaClient.roleSpecificToSousCompteVaeCollective.create({
      data: {
        sousCompteVaeCollectiveId: sousCompte.id,
        role: "CREATEUR_COHORTE",
      },
    });

    const res = await getSousComptes({
      commanditaireVaeCollectiveId,
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    expect(
      res.vaeCollective_getCommanditaireVaeCollective.sousComptes.rows,
    ).toContainEqual({
      id: sousCompte.id,
      canCreateCohorteVaeCollective: true,
    });
  });

  test("should return false when the sous compte does not have the CREER_COHORTE permission", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const sousCompte = await createSousCompte({ commanditaireVaeCollectiveId });

    const res = await getSousComptes({
      commanditaireVaeCollectiveId,
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    expect(
      res.vaeCollective_getCommanditaireVaeCollective.sousComptes.rows,
    ).toContainEqual({
      id: sousCompte.id,
      canCreateCohorteVaeCollective: false,
    });
  });

  test("should return false when no sousCompteVaeCollectiveId is provided", async () => {
    const result = await canSousCompteCreateCohorteVaeCollective({
      sousCompteVaeCollectiveId: "",
    });

    expect(result).toBe(false);
  });
});
