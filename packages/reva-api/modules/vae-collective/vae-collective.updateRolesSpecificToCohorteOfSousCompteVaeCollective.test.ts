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

const updateRolesSpecificToCohorteOfSousCompteVaeCollectiveMutation = graphql(`
  mutation updateRolesSpecificToCohorteOfSousCompteVaeCollective(
    $commanditaireVaeCollectiveId: ID!
    $cohorteVaeCollectiveId: ID!
    $sousComptesIdsAndRoles: [SousCompteVaeCollectiveAndRoleInput!]!
  ) {
    vaeCollective_updateRolesSpecificToCohorteOfSousCompteVaeCollective(
      commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
      cohorteVaeCollectiveId: $cohorteVaeCollectiveId
      sousComptesIdsAndRoles: $sousComptesIdsAndRoles
    ) {
      id
    }
  }
`);

const updateRolesSpecificToCohorteOfSousCompteVaeCollective = ({
  commanditaireVaeCollectiveId,
  cohorteVaeCollectiveId,
  sousComptesIdsAndRoles,
  role,
  keycloakId,
}: {
  commanditaireVaeCollectiveId: string;
  cohorteVaeCollectiveId: string;
  sousComptesIdsAndRoles: {
    sousCompteVaeCollectiveId: string;
    roles: ("LECTEUR_COHORTE" | "EDITEUR_COHORTE")[];
  }[];
  role: KeyCloakUserRole;
  keycloakId?: string;
}) => {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({ role, keycloakId }),
    },
  });

  return graphqlClient.request(
    updateRolesSpecificToCohorteOfSousCompteVaeCollectiveMutation,
    {
      commanditaireVaeCollectiveId,
      cohorteVaeCollectiveId,
      sousComptesIdsAndRoles,
    },
  );
};

const findRolesSpecificToCohorte = ({
  sousCompteVaeCollectiveId,
  cohorteVaeCollectiveId,
}: {
  sousCompteVaeCollectiveId: string;
  cohorteVaeCollectiveId: string;
}) =>
  prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.findMany({
    where: { sousCompteVaeCollectiveId, cohorteVaeCollectiveId },
  });

describe("update roles specific to cohorte of sous compte vae collective", () => {
  test("should let an admin set roles specific to a cohorte for a sous compte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const sousCompte = await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId,
    });

    const res = await updateRolesSpecificToCohorteOfSousCompteVaeCollective({
      commanditaireVaeCollectiveId,
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
      sousComptesIdsAndRoles: [
        {
          sousCompteVaeCollectiveId: sousCompte.id,
          roles: ["EDITEUR_COHORTE"],
        },
      ],
      role: "admin",
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    expect(res).toMatchObject({
      vaeCollective_updateRolesSpecificToCohorteOfSousCompteVaeCollective: {
        id: cohorteVaeCollective.id,
      },
    });

    const roles = await findRolesSpecificToCohorte({
      sousCompteVaeCollectiveId: sousCompte.id,
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
    });
    expect(roles.map((r) => r.role)).toEqual(["EDITEUR_COHORTE"]);
  });

  test("should replace the existing roles specific to the cohorte for a sous compte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const sousCompte = await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId,
    });
    await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.create({
      data: {
        sousCompteVaeCollectiveId: sousCompte.id,
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
        role: "LECTEUR_COHORTE",
      },
    });

    await updateRolesSpecificToCohorteOfSousCompteVaeCollective({
      commanditaireVaeCollectiveId,
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
      sousComptesIdsAndRoles: [
        {
          sousCompteVaeCollectiveId: sousCompte.id,
          roles: ["EDITEUR_COHORTE"],
        },
      ],
      role: "admin",
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    const roles = await findRolesSpecificToCohorte({
      sousCompteVaeCollectiveId: sousCompte.id,
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
    });
    expect(roles.map((r) => r.role)).toEqual(["EDITEUR_COHORTE"]);
  });

  test("should remove all roles specific to the cohorte when given an empty roles list", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const sousCompte = await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId,
    });
    await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.create({
      data: {
        sousCompteVaeCollectiveId: sousCompte.id,
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
        role: "LECTEUR_COHORTE",
      },
    });

    await updateRolesSpecificToCohorteOfSousCompteVaeCollective({
      commanditaireVaeCollectiveId,
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
      sousComptesIdsAndRoles: [
        { sousCompteVaeCollectiveId: sousCompte.id, roles: [] },
      ],
      role: "admin",
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    const roles = await findRolesSpecificToCohorte({
      sousCompteVaeCollectiveId: sousCompte.id,
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
    });
    expect(roles).toEqual([]);
  });

  test("should not affect roles specific to another cohorte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const otherCohorteVaeCollective = await createCohorteVaeCollectiveHelper({
      commanditaireVaeCollective: {
        connect: { id: cohorteVaeCollective.commanditaireVaeCollectiveId },
      },
    });
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const sousCompte = await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId,
    });
    await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.create({
      data: {
        sousCompteVaeCollectiveId: sousCompte.id,
        cohorteVaeCollectiveId: otherCohorteVaeCollective.id,
        role: "LECTEUR_COHORTE",
      },
    });

    await updateRolesSpecificToCohorteOfSousCompteVaeCollective({
      commanditaireVaeCollectiveId,
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
      sousComptesIdsAndRoles: [
        {
          sousCompteVaeCollectiveId: sousCompte.id,
          roles: ["EDITEUR_COHORTE"],
        },
      ],
      role: "admin",
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    const rolesOnOtherCohorte = await findRolesSpecificToCohorte({
      sousCompteVaeCollectiveId: sousCompte.id,
      cohorteVaeCollectiveId: otherCohorteVaeCollective.id,
    });
    expect(rolesOnOtherCohorte.map((r) => r.role)).toEqual(["LECTEUR_COHORTE"]);
  });

  test("should let the gestionnaire of the commanditaire update roles for their own cohorte", async () => {
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

    const res = await updateRolesSpecificToCohorteOfSousCompteVaeCollective({
      commanditaireVaeCollectiveId,
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
      sousComptesIdsAndRoles: [
        {
          sousCompteVaeCollectiveId: sousCompte.id,
          roles: ["LECTEUR_COHORTE"],
        },
      ],
      role: "manage_vae_collective",
      keycloakId: gestionnaireKeycloakId,
    });

    expect(res).toMatchObject({
      vaeCollective_updateRolesSpecificToCohorteOfSousCompteVaeCollective: {
        id: cohorteVaeCollective.id,
      },
    });
  });

  test("should not let a gestionnaire of a different commanditaire update roles for a cohorte", async () => {
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
      updateRolesSpecificToCohorteOfSousCompteVaeCollective({
        commanditaireVaeCollectiveId:
          anotherCohorteVaeCollective.commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId: anotherCohorteVaeCollective.id,
        sousComptesIdsAndRoles: [
          {
            sousCompteVaeCollectiveId: sousCompte.id,
            roles: ["LECTEUR_COHORTE"],
          },
        ],
        role: "manage_vae_collective",
        keycloakId: gestionnaireKeycloakId,
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED_RESOURCE_ACCESS);
  });

  test("should not let a gestionnaire update roles for a cohorte that doesn't belong to their own commanditaire", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const otherCohorteVaeCollective = await createCohorteVaeCollectiveHelper();
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

    // The gestionnaire owns commanditaireVaeCollectiveId, but points at another
    // commanditaire's cohorte: isGestionnaireOfCommanditaireVaeCollective alone
    // would let this through, so this pins the extra cohorte-ownership check.
    await expect(
      updateRolesSpecificToCohorteOfSousCompteVaeCollective({
        commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId: otherCohorteVaeCollective.id,
        sousComptesIdsAndRoles: [
          {
            sousCompteVaeCollectiveId: sousCompte.id,
            roles: ["LECTEUR_COHORTE"],
          },
        ],
        role: "manage_vae_collective",
        keycloakId: gestionnaireKeycloakId,
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED_RESOURCE_ACCESS);
  });

  test("should throw when the sous compte doesn't belong to the given commanditaire", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const anotherCohorteVaeCollective =
      await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const sousCompteOfAnotherCommanditaire =
      await createSousCompteVaeCollectiveHelper({
        commanditaireVaeCollectiveId:
          anotherCohorteVaeCollective.commanditaireVaeCollectiveId,
      });

    await expect(
      updateRolesSpecificToCohorteOfSousCompteVaeCollective({
        commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
        sousComptesIdsAndRoles: [
          {
            sousCompteVaeCollectiveId: sousCompteOfAnotherCommanditaire.id,
            roles: ["LECTEUR_COHORTE"],
          },
        ],
        role: "admin",
        keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
      }),
    ).rejects.toThrowError("Sous-compte non trouvé");
  });

  test("should not let a user without an authorized role update roles specific to a cohorte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    const sousCompte = await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId:
        cohorteVaeCollective.commanditaireVaeCollectiveId,
    });

    await expect(
      updateRolesSpecificToCohorteOfSousCompteVaeCollective({
        commanditaireVaeCollectiveId:
          cohorteVaeCollective.commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
        sousComptesIdsAndRoles: [
          {
            sousCompteVaeCollectiveId: sousCompte.id,
            roles: ["LECTEUR_COHORTE"],
          },
        ],
        role: "manage_candidacy",
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED);
  });
});
