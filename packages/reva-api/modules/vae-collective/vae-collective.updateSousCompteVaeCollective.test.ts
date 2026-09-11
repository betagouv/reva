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

const updateSousCompteVaeCollectiveMutation = graphql(`
  mutation updateSousCompteVaeCollective(
    $commanditaireVaeCollectiveId: ID!
    $sousCompteVaeCollectiveId: ID!
    $canCreateCohorteVaeCollective: Boolean!
  ) {
    vaeCollective_updateSousCompteVaeCollective(
      commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
      sousCompteVaeCollectiveId: $sousCompteVaeCollectiveId
      canCreateCohorteVaeCollective: $canCreateCohorteVaeCollective
    ) {
      id
      canCreateCohorteVaeCollective
    }
  }
`);

const updateSousCompteVaeCollective = ({
  commanditaireVaeCollectiveId,
  sousCompteVaeCollectiveId,
  canCreateCohorteVaeCollective,
  role,
  keycloakId,
}: {
  commanditaireVaeCollectiveId: string;
  sousCompteVaeCollectiveId: string;
  canCreateCohorteVaeCollective: boolean;
  role: KeyCloakUserRole;
  keycloakId?: string;
}) => {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({ role, keycloakId }),
    },
  });

  return graphqlClient.request(updateSousCompteVaeCollectiveMutation, {
    commanditaireVaeCollectiveId,
    sousCompteVaeCollectiveId,
    canCreateCohorteVaeCollective,
  });
};

const findCreerCohortePermission = (sousCompteVaeCollectiveId: string) =>
  prismaClient.roleSpecificToSousCompteVaeCollective.findUnique({
    where: {
      role_sousCompteVaeCollectiveId: {
        role: "CREATEUR_COHORTE",
        sousCompteVaeCollectiveId,
      },
    },
  });

describe("update sous compte vae collective", () => {
  test("should let an admin grant canCreateCohorteVaeCollective to a sous compte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const sousCompte = await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId,
    });

    const res = await updateSousCompteVaeCollective({
      commanditaireVaeCollectiveId,
      sousCompteVaeCollectiveId: sousCompte.id,
      canCreateCohorteVaeCollective: true,
      role: "admin",
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    expect(res).toMatchObject({
      vaeCollective_updateSousCompteVaeCollective: {
        id: sousCompte.id,
        canCreateCohorteVaeCollective: true,
      },
    });

    const permission = await findCreerCohortePermission(sousCompte.id);
    expect(permission).not.toBeNull();
  });

  test("should let an admin revoke canCreateCohorteVaeCollective from a sous compte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const sousCompte = await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId,
    });
    await prismaClient.roleSpecificToSousCompteVaeCollective.create({
      data: {
        sousCompteVaeCollectiveId: sousCompte.id,
        role: "CREATEUR_COHORTE",
      },
    });

    const res = await updateSousCompteVaeCollective({
      commanditaireVaeCollectiveId,
      sousCompteVaeCollectiveId: sousCompte.id,
      canCreateCohorteVaeCollective: false,
      role: "admin",
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    expect(res).toMatchObject({
      vaeCollective_updateSousCompteVaeCollective: {
        id: sousCompte.id,
        canCreateCohorteVaeCollective: false,
      },
    });

    const permission = await findCreerCohortePermission(sousCompte.id);
    expect(permission).toBeNull();
  });

  test("should let the gestionnaire of the commanditaire update their own sous compte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;
    const gestionnaireKeycloakId =
      cohorteVaeCollective.commanditaireVaeCollective?.gestionnaire?.keycloakId;

    if (!gestionnaireKeycloakId) {
      throw new Error("Compte gestionnaire non trouvé");
    }

    const sousCompte = await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId,
    });

    const res = await updateSousCompteVaeCollective({
      commanditaireVaeCollectiveId,
      sousCompteVaeCollectiveId: sousCompte.id,
      canCreateCohorteVaeCollective: true,
      role: "manage_vae_collective",
      keycloakId: gestionnaireKeycloakId,
    });

    expect(res).toMatchObject({
      vaeCollective_updateSousCompteVaeCollective: {
        id: sousCompte.id,
        canCreateCohorteVaeCollective: true,
      },
    });
  });

  test("should not let a gestionnaire of a different commanditaire update a sous compte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const anotherCohorteVaeCollective =
      await createCohorteVaeCollectiveHelper();
    const gestionnaireKeycloakId =
      cohorteVaeCollective.commanditaireVaeCollective?.gestionnaire?.keycloakId;

    if (!gestionnaireKeycloakId) {
      throw new Error("Compte gestionnaire non trouvé");
    }

    const sousCompte = await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId:
        anotherCohorteVaeCollective.commanditaireVaeCollectiveId,
    });

    await expect(
      updateSousCompteVaeCollective({
        commanditaireVaeCollectiveId:
          anotherCohorteVaeCollective.commanditaireVaeCollectiveId,
        sousCompteVaeCollectiveId: sousCompte.id,
        canCreateCohorteVaeCollective: true,
        role: "manage_vae_collective",
        keycloakId: gestionnaireKeycloakId,
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED_RESOURCE_ACCESS);
  });

  test("should not let a gestionnaire update a sous compte that doesn't belong to the given commanditaire vae collective", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const anotherCohorteVaeCollective =
      await createCohorteVaeCollectiveHelper();
    const gestionnaireKeycloakId =
      cohorteVaeCollective.commanditaireVaeCollective?.gestionnaire?.keycloakId;

    if (!gestionnaireKeycloakId) {
      throw new Error("Compte gestionnaire non trouvé");
    }

    const sousCompteOfAnotherCommanditaire =
      await createSousCompteVaeCollectiveHelper({
        commanditaireVaeCollectiveId:
          anotherCohorteVaeCollective.commanditaireVaeCollectiveId,
      });

    await expect(
      updateSousCompteVaeCollective({
        commanditaireVaeCollectiveId:
          cohorteVaeCollective.commanditaireVaeCollectiveId,
        sousCompteVaeCollectiveId: sousCompteOfAnotherCommanditaire.id,
        canCreateCohorteVaeCollective: true,
        role: "manage_vae_collective",
        keycloakId: gestionnaireKeycloakId,
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED_RESOURCE_ACCESS);
  });

  test("should not let a user without an authorized role update a sous compte vae collective", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    const sousCompte = await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId:
        cohorteVaeCollective.commanditaireVaeCollectiveId,
    });

    await expect(
      updateSousCompteVaeCollective({
        commanditaireVaeCollectiveId:
          cohorteVaeCollective.commanditaireVaeCollectiveId,
        sousCompteVaeCollectiveId: sousCompte.id,
        canCreateCohorteVaeCollective: true,
        role: "manage_candidacy",
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED);
  });
});
