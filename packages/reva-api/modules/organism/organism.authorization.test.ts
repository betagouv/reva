import { faker } from "@faker-js/faker";

import * as getKeycloakAdminModule from "@/modules/shared/auth/getKeycloakAdmin";
import {
  NOT_AUTHORIZED,
  NOT_AUTHORIZED_MAISON_MERE_ACCESS,
  NOT_AUTHORIZED_ORGANISM_ACCESS,
  SESSION_EXPIRED as UNAUTHENTICATED,
} from "@/modules/shared/security/messages";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";
import {
  attachCollaborateurAccountToMaisonMereAAP,
  createMaisonMereAapHelper,
} from "@/test/helpers/entities/create-maison-mere-aap-helper";
import { createOrganismHelper } from "@/test/helpers/entities/create-organism-helper";
import { injectGraphql } from "@/test/helpers/graphql-helper";

// Autorisation de chaque resolver organism : qui passe, qui est refusé.

const asRole = (role: KeyCloakUserRole, keycloakId?: string) =>
  authorizationHeaderForUser({
    role,
    keycloakId: keycloakId ?? faker.string.uuid(),
  });

describe("organism - autorisation des resolvers", () => {
  describe("organism_getMaisonMereAAPs (admin)", () => {
    const call = (authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "organism_getMaisonMereAAPs",
          arguments: { offset: 0 },
          returnFields: "{ rows { id } }",
        },
      });

    test("admin : autorisé", async () => {
      const resp = await call(asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("candidate : refusé", async () => {
      const resp = await call(asRole("candidate"));
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("non authentifié : refusé", async () => {
      const resp = await call();
      expect(resp.json().errors[0].message).toBe(UNAUTHENTICATED);
    });
  });

  describe("organism_updateFermePourAbsenceOuConges (owner ou gestionnaire ou admin)", () => {
    const call = (organismId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "mutation",
          endpoint: "organism_updateFermePourAbsenceOuConges",
          arguments: { organismId, fermePourAbsenceOuConges: true },
          returnFields: "{ id fermePourAbsenceOuConges }",
        },
      });

    test("l'AAP rattaché à l'organisme : autorisé", async () => {
      const organism = await createOrganismHelper();
      const resp = await call(
        organism.id,
        asRole(
          "manage_candidacy",
          organism.organismOnAccounts[0].account.keycloakId,
        ),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.organism_updateFermePourAbsenceOuConges
          .fermePourAbsenceOuConges,
      ).toBe(true);
    });

    // L'admin doit avoir un compte : la règle (inline hier, middleware aujourd'hui) résout
    // l'appelant en compte avant le bypass admin.
    test("l'admin : autorisé", async () => {
      const organism = await createOrganismHelper();
      const admin = await createAccountHelper();
      const resp = await call(organism.id, asRole("admin", admin.keycloakId));
      expect(resp.json()).not.toHaveProperty("errors");
    });

    // Le candidate a un compte : le refus doit venir de l'absence de rattachement à
    // l'organisme, pas de l'absence de compte (qui refuserait n'importe qui).
    test("un candidate non rattaché : refusé", async () => {
      const organism = await createOrganismHelper();
      const candidate = await createAccountHelper();
      const resp = await call(
        organism.id,
        asRole("candidate", candidate.keycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });
  });

  describe("organism_getOrganism (admin, gestionnaire de la MM, ou AAP rattaché)", () => {
    // On ne sélectionne QUE `id` : il n'a pas de resolver, donc pas de policy. Sélectionner
    // un champ policé (`hasCandidacies`...) ferait refuser l'appelant par la policy du CHAMP
    // et masquerait ce qu'on teste ici, à savoir l'accès à la query elle-même.
    const call = (id: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "organism_getOrganism",
          arguments: { id },
          returnFields: "{ id }",
        },
      });

    test("le gestionnaire de la maison mère de l'organisme : autorisé", async () => {
      const organism = await createOrganismHelper();
      const resp = await call(
        organism.id,
        asRole(
          "gestion_maison_mere_aap",
          organism.maisonMereAAP!.gestionnaire.keycloakId,
        ),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.organism_getOrganism.id).toBe(organism.id);
    });

    test("l'AAP rattaché à l'organisme : autorisé", async () => {
      const organism = await createOrganismHelper();
      const resp = await call(
        organism.id,
        asRole(
          "manage_candidacy",
          organism.organismOnAccounts[0].account.keycloakId,
        ),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.organism_getOrganism.id).toBe(organism.id);
    });

    test("l'admin : autorisé", async () => {
      const organism = await createOrganismHelper();
      const resp = await call(organism.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.organism_getOrganism.id).toBe(organism.id);
    });

    // Non-régression : l'inline remplacé n'`await`ait pas son contrôle d'ownership, donc
    // `!Promise` valait toujours false et ce refus ne se déclenchait jamais (cf. facaf2841).
    test("le gestionnaire d'une AUTRE maison mère : refusé", async () => {
      const organism = await createOrganismHelper();
      const autreOrganism = await createOrganismHelper();
      const resp = await call(
        organism.id,
        asRole(
          "gestion_maison_mere_aap",
          autreOrganism.maisonMereAAP!.gestionnaire.keycloakId,
        ),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_ORGANISM_ACCESS,
      );
    });

    // Non-régression : même cause, branche `manage_candidacy`.
    test("un AAP NON rattaché à l'organisme : refusé", async () => {
      const organism = await createOrganismHelper();
      const autreOrganism = await createOrganismHelper();
      const resp = await call(
        organism.id,
        asRole(
          "manage_candidacy",
          autreOrganism.organismOnAccounts[0].account.keycloakId,
        ),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_ORGANISM_ACCESS,
      );
    });

    test("un candidate : refusé", async () => {
      const organism = await createOrganismHelper();
      const resp = await call(
        organism.id,
        asRole("candidate", (await createAccountHelper()).keycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("non authentifié : refusé", async () => {
      const organism = await createOrganismHelper();
      const resp = await call(organism.id);
      expect(resp.json().errors[0].message).toBe(UNAUTHENTICATED);
    });
  });

  describe("organism_updateOrganismAccount (admin ou gestionnaire de la MM)", () => {
    // La feature appelle Keycloak pour répercuter le changement d'email/nom : on mock l'admin
    // Keycloak pour isoler le test de l'autorisation.
    beforeEach(() => {
      vi.spyOn(getKeycloakAdminModule, "getKeycloakAdmin").mockResolvedValue({
        users: {
          findOne: () => Promise.resolve({}),
          listGroups: () => Promise.resolve([]),
          update: () => Promise.resolve({}),
        },
      } as unknown as Awaited<
        ReturnType<typeof getKeycloakAdminModule.getKeycloakAdmin>
      >);
    });

    const call = (
      maisonMereAAPId: string,
      accountId: string,
      authorization?: string,
    ) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "mutation",
          endpoint: "organism_updateOrganismAccount",
          arguments: {
            data: {
              maisonMereAAPId,
              accountId,
              accountFirstname: "Jean",
              accountLastname: "Dupont",
              accountEmail: "jean.dupont@example.com",
            },
          },
          returnFields: "{ id }",
        },
      });

    test("le gestionnaire de la maison mère du compte : autorisé", async () => {
      const maisonMereAAP = await createMaisonMereAapHelper();
      const collaborateurAccount = await createAccountHelper();
      await attachCollaborateurAccountToMaisonMereAAP({
        maisonMereAAPId: maisonMereAAP.id,
        collaborateurAccountId: collaborateurAccount.id,
      });

      const resp = await call(
        maisonMereAAP.id,
        collaborateurAccount.id,
        asRole(
          "gestion_maison_mere_aap",
          maisonMereAAP.gestionnaire.keycloakId,
        ),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("l'admin : autorisé", async () => {
      const maisonMereAAP = await createMaisonMereAapHelper();
      const collaborateurAccount = await createAccountHelper();
      await attachCollaborateurAccountToMaisonMereAAP({
        maisonMereAAPId: maisonMereAAP.id,
        collaborateurAccountId: collaborateurAccount.id,
      });

      const resp = await call(
        maisonMereAAP.id,
        collaborateurAccount.id,
        asRole("admin"),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    // Non-régression : ce resolver était sur `isAnyone`, sans aucun contrôle propre au resolver
    // ni à la feature — n'importe quel appelant (même non gestionnaire de la MM ciblée) pouvait
    // réécrire l'email/nom d'un compte organisme arbitraire.
    test("le gestionnaire d'une AUTRE maison mère : refusé", async () => {
      const maisonMereAAP = await createMaisonMereAapHelper();
      const autreMaisonMereAAP = await createMaisonMereAapHelper();
      const collaborateurAccount = await createAccountHelper();
      await attachCollaborateurAccountToMaisonMereAAP({
        maisonMereAAPId: maisonMereAAP.id,
        collaborateurAccountId: collaborateurAccount.id,
      });

      const resp = await call(
        maisonMereAAP.id,
        collaborateurAccount.id,
        asRole(
          "gestion_maison_mere_aap",
          autreMaisonMereAAP.gestionnaire.keycloakId,
        ),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_MAISON_MERE_ACCESS,
      );
    });

    test("un AAP (manage_candidacy) : refusé", async () => {
      const maisonMereAAP = await createMaisonMereAapHelper();
      const collaborateurAccount = await createAccountHelper();
      await attachCollaborateurAccountToMaisonMereAAP({
        maisonMereAAPId: maisonMereAAP.id,
        collaborateurAccountId: collaborateurAccount.id,
      });

      const resp = await call(
        maisonMereAAP.id,
        collaborateurAccount.id,
        asRole("manage_candidacy"),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("non authentifié : refusé", async () => {
      const maisonMereAAP = await createMaisonMereAapHelper();
      const collaborateurAccount = await createAccountHelper();
      await attachCollaborateurAccountToMaisonMereAAP({
        maisonMereAAPId: maisonMereAAP.id,
        collaborateurAccountId: collaborateurAccount.id,
      });

      const resp = await call(maisonMereAAP.id, collaborateurAccount.id);
      expect(resp.json().errors[0].message).toBe(UNAUTHENTICATED);
    });
  });

  describe("MaisonMereAAP.legalInformationDocuments (admin ou gestionnaire de la maison mère)", () => {
    // Le champ expose les valeurs en attente et les pièces d'identité déposées : on le lit
    // via la seule query qui rend une MaisonMereAAP.
    const call = (maisonMereAAPId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "organism_getMaisonMereAAPById",
          arguments: { maisonMereAAPId },
          returnFields: "{ legalInformationDocuments { managerFirstname } }",
        },
      });

    // Non-régression : le champ était sur `isAdmin`, le gestionnaire ne pouvait pas relire
    // sa propre demande. Lu par le chemin de production de l'AAP, dont la query parente est
    // ouverte à tous : seule la règle du champ protège ici.
    test("le gestionnaire de la maison mère : autorisé", async () => {
      const maisonMereAAP = await createMaisonMereAapHelper();
      const resp = await injectGraphql({
        fastify: global.testApp,
        authorization: asRole(
          "gestion_maison_mere_aap",
          maisonMereAAP.gestionnaire.keycloakId,
        ),
        payload: {
          requestType: "query",
          endpoint: "account_getAccountForConnectedUser",
          returnFields:
            "{ maisonMereAAP { legalInformationDocuments { managerFirstname } } }",
        },
      });
      expect(resp.json()).not.toHaveProperty("errors");
    });

    // Le refus vient de la query parente, gardée par la même règle : aucune query
    // n'expose le champ à un gestionnaire tiers. C'est l'inaccessibilité de la
    // donnée qui est vérifiée ici, pas la règle du champ elle-même.
    test("le gestionnaire d'une AUTRE maison mère : refusé", async () => {
      const maisonMereAAP = await createMaisonMereAapHelper();
      const autreMaisonMereAAP = await createMaisonMereAapHelper();
      const resp = await call(
        maisonMereAAP.id,
        asRole(
          "gestion_maison_mere_aap",
          autreMaisonMereAAP.gestionnaire.keycloakId,
        ),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_MAISON_MERE_ACCESS,
      );
    });

    test("l'admin : autorisé", async () => {
      const maisonMereAAP = await createMaisonMereAapHelper();
      const resp = await call(maisonMereAAP.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
    });
  });

  describe("organism_updateOrganismDegreesAndFormacodes (admin, gestionnaire de la MM, ou AAP rattaché)", () => {
    const call = (organismId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "mutation",
          endpoint: "organism_updateOrganismDegreesAndFormacodes",
          arguments: {
            data: {
              organismId,
              degreeIds: [],
              formacodeIds: [],
              conventionCollectiveIds: [],
            },
          },
          returnFields: "{ id }",
        },
      });

    test("le gestionnaire de la maison mère de l'organisme : autorisé", async () => {
      const organism = await createOrganismHelper();
      const resp = await call(
        organism.id,
        asRole(
          "gestion_maison_mere_aap",
          organism.maisonMereAAP!.gestionnaire.keycloakId,
        ),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("l'AAP rattaché à l'organisme : autorisé", async () => {
      const organism = await createOrganismHelper();
      const resp = await call(
        organism.id,
        asRole(
          "manage_candidacy",
          organism.organismOnAccounts[0].account.keycloakId,
        ),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("l'admin : autorisé", async () => {
      const organism = await createOrganismHelper();
      const resp = await call(organism.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
    });

    // Non-régression : cette mutation était sur `isAnyone`, sans aucun contrôle propre au
    // resolver ni à la feature — n'importe quel appelant pouvait réécrire le périmètre
    // d'accompagnement d'un organisme arbitraire.
    test("le gestionnaire d'une AUTRE maison mère : refusé", async () => {
      const organism = await createOrganismHelper();
      const autreOrganism = await createOrganismHelper();
      const resp = await call(
        organism.id,
        asRole(
          "gestion_maison_mere_aap",
          autreOrganism.maisonMereAAP!.gestionnaire.keycloakId,
        ),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_ORGANISM_ACCESS,
      );
    });

    test("un AAP NON rattaché à l'organisme : refusé", async () => {
      const organism = await createOrganismHelper();
      const autreOrganism = await createOrganismHelper();
      const resp = await call(
        organism.id,
        asRole(
          "manage_candidacy",
          autreOrganism.organismOnAccounts[0].account.keycloakId,
        ),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_ORGANISM_ACCESS,
      );
    });

    test("un candidat : refusé", async () => {
      const organism = await createOrganismHelper();
      const resp = await call(organism.id, asRole("candidate"));
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("non authentifié : refusé", async () => {
      const organism = await createOrganismHelper();
      const resp = await call(organism.id);
      expect(resp.json().errors[0].message).toBe(UNAUTHENTICATED);
    });
  });

  describe("organism_createLieuAccueilInfo (gestionnaire de maison mère)", () => {
    // Les cas autorisés sont couverts par `features/createLieuAccueilInfo.test.ts`.
    const call = (authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "mutation",
          endpoint: "organism_createLieuAccueilInfo",
          arguments: {
            data: {
              nomPublic: "Agence",
              adresseNumeroEtNomDeRue: "1 rue de la Paix",
              adresseCodePostal: "75002",
              adresseVille: "Paris",
              emailContact: "agence@example.com",
              telephone: "0102030405",
              conformeNormesAccessibilite: "CONFORME",
            },
          },
          enumFields: ["conformeNormesAccessibilite"],
          returnFields: "",
        },
      });

    test("un AAP (manage_candidacy) : refusé", async () => {
      const organism = await createOrganismHelper();
      const resp = await call(
        asRole(
          "manage_candidacy",
          organism.organismOnAccounts[0].account.keycloakId,
        ),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("non authentifié : refusé", async () => {
      const resp = await call();
      expect(resp.json().errors[0].message).toBe(UNAUTHENTICATED);
    });
  });

  describe("organism_updateLegalInformationValidationDecision (admin)", () => {
    // `DEMANDE_DE_PRECISION` sans demande en attente : la décision est enregistrée sans
    // toucher aux informations de la structure.
    const call = (maisonMereAAPId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "mutation",
          endpoint: "organism_updateLegalInformationValidationDecision",
          arguments: {
            data: {
              maisonMereAAPId,
              decision: "DEMANDE_DE_PRECISION",
              internalComment: "Contrôle d'autorisation",
            },
          },
          enumFields: ["decision"],
          returnFields: "{ id }",
        },
      });

    test("l'admin : autorisé", async () => {
      const maisonMereAAP = await createMaisonMereAapHelper();
      const resp = await call(maisonMereAAP.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
    });

    // Non-régression : cette mutation était sur `isAnyone`, n'importe quel appelant pouvait
    // décider du statut de validation d'une structure arbitraire.
    test("le gestionnaire de la maison mère : refusé", async () => {
      const maisonMereAAP = await createMaisonMereAapHelper();
      const resp = await call(
        maisonMereAAP.id,
        asRole(
          "gestion_maison_mere_aap",
          maisonMereAAP.gestionnaire.keycloakId,
        ),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("non authentifié : refusé", async () => {
      const maisonMereAAP = await createMaisonMereAapHelper();
      const resp = await call(maisonMereAAP.id);
      expect(resp.json().errors[0].message).toBe(UNAUTHENTICATED);
    });
  });
});
