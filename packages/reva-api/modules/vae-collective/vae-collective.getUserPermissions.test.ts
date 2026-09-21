import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";
import { createSousCompteVaeCollectiveHelper } from "@/test/helpers/entities/create-sous-compte-vae-collective-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../graphql/generated";

const vaeCollective_getUserPermissions = graphql(`
  query vaeCollective_getUserPermissions($cohorteVaeCollectiveId: ID) {
    vaeCollective_getUserPermissions(
      cohorteVaeCollectiveId: $cohorteVaeCollectiveId
    )
  }
`);

const requestUserPermissions = ({
  role,
  keycloakId = "1b0e7046-ca61-4259-b716-785f36ab79b2",
  cohorteVaeCollectiveId,
}: {
  role: KeyCloakUserRole;
  keycloakId?: string;
  cohorteVaeCollectiveId?: string;
}) => {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({ role, keycloakId }),
    },
  });

  return graphqlClient.request(vaeCollective_getUserPermissions, {
    cohorteVaeCollectiveId,
  });
};

describe("get user permissions vae collective", () => {
  test("should return the permissions of the vae collective role mapped to the user keycloak role", async () => {
    const res = await requestUserPermissions({ role: "manage_vae_collective" });

    expect(res).toMatchObject({
      vaeCollective_getUserPermissions: [
        "CREER_COHORTE",
        "MODIFIER_COHORTE",
        "SUPPRIMER_COHORTE",
        "VOIR_LISTE_COHORTES",
        "VOIR_COHORTE",
        "VOIR_STATISTIQUES",
        "CREER_SOUS_COMPTE",
        "MODIFIER_SOUS_COMPTE",
        "SUPPRIMER_SOUS_COMPTE",
        "VOIR_LISTE_SOUS_COMPTES",
        "VOIR_SOUS_COMPTE",
        "MODIFIER_DROITS_ACCES_COHORTE",
      ],
    });
  });

  test("should return an empty array when the user keycloak role is not mapped to any vae collective role", async () => {
    const res = await requestUserPermissions({ role: "candidate" });

    expect(res).toMatchObject({
      vaeCollective_getUserPermissions: [],
    });
  });

  describe("with a cohorteVaeCollectiveId", () => {
    const setup = async () => {
      const cohorte = await createCohorteVaeCollectiveHelper();
      const otherCohorte = await createCohorteVaeCollectiveHelper({
        commanditaireVaeCollective: {
          connect: { id: cohorte.commanditaireVaeCollectiveId },
        },
      });
      const account = await createAccountHelper();
      const sousCompte = await createSousCompteVaeCollectiveHelper({
        commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
        accountId: account.id,
      });
      await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.create(
        {
          data: {
            sousCompteVaeCollectiveId: sousCompte.id,
            cohorteVaeCollectiveId: cohorte.id,
            role: "EDITEUR_COHORTE",
          },
        },
      );
      return { cohorte, otherCohorte, keycloakId: account.keycloakId };
    };

    test("should include the permissions the sous compte has on this cohorte", async () => {
      const { cohorte, keycloakId } = await setup();

      const res = await requestUserPermissions({
        role: "sous_compte_vae_collective",
        keycloakId,
        cohorteVaeCollectiveId: cohorte.id,
      });

      expect(res.vaeCollective_getUserPermissions).toContain(
        "MODIFIER_COHORTE",
      );
    });

    test("should not include the permissions specific to a cohorte when no cohorteVaeCollectiveId is given", async () => {
      const { keycloakId } = await setup();

      const res = await requestUserPermissions({
        role: "sous_compte_vae_collective",
        keycloakId,
      });

      expect(res.vaeCollective_getUserPermissions).not.toContain(
        "MODIFIER_COHORTE",
      );
    });

    test("should not include the permissions the sous compte has on another cohorte", async () => {
      const { otherCohorte, keycloakId } = await setup();

      const res = await requestUserPermissions({
        role: "sous_compte_vae_collective",
        keycloakId,
        cohorteVaeCollectiveId: otherCohorte.id,
      });

      expect(res.vaeCollective_getUserPermissions).not.toContain(
        "MODIFIER_COHORTE",
      );
    });
  });
});
