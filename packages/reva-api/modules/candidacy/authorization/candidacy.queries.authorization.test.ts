import { faker } from "@faker-js/faker";
import { CandidacyStatusStep } from "@prisma/client";

import { CANDIDATURE_NON_TROUVEE } from "@/modules/shared/errors/messages";
import {
  NOT_AUTHORIZED,
  SESSION_EXPIRED,
} from "@/modules/shared/security/messages";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationAuthorityLocalAccountHelper } from "@/test/helpers/entities/create-certification-authority-local-account-helper";
import { createOrganismHelper } from "@/test/helpers/entities/create-organism-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../../graphql/generated";

const getCandidaciesDocument = graphql(`
  query getCandidacies_authorization {
    getCandidacies {
      rows {
        id
      }
    }
  }
`);

const getRandomOrganismsForCandidacyDocument = graphql(`
  query getRandomOrganismsForCandidacy_authorization($candidacyId: UUID!) {
    getRandomOrganismsForCandidacy(candidacyId: $candidacyId) {
      totalRows
    }
  }
`);

const searchOrganismsForCandidacyAsAdminDocument = graphql(`
  query candidacy_searchOrganismsForCandidacyAsAdmin_authorization(
    $candidacyId: UUID!
  ) {
    candidacy_searchOrganismsForCandidacyAsAdmin(candidacyId: $candidacyId) {
      rows {
        id
      }
    }
  }
`);

const candidacyCountByStatusDocument = graphql(`
  query candidacy_candidacyCountByStatus_authorization {
    candidacy_candidacyCountByStatus {
      ACTIVE_HORS_ABANDON
      PARCOURS_CONFIRME_HORS_ABANDON
    }
  }
`);

const deniedCandidacyCountByStatusDocument = graphql(`
  query candidacy_candidacyCountByStatus_denied_authorization {
    candidacy_candidacyCountByStatus {
      PROJET_HORS_ABANDON
    }
  }
`);

const getCandidacyCcnsDocument = graphql(`
  query candidacy_getCandidacyCcns_authorization {
    candidacy_getCandidacyCcns {
      rows {
        id
      }
    }
  }
`);

const canAccessCandidacyDocument = graphql(`
  query candidacy_canAccessCandidacy_authorization($candidacyId: ID!) {
    candidacy_canAccessCandidacy(candidacyId: $candidacyId)
  }
`);

const getCandidaciesForCertificationAuthorityDocument = graphql(`
  query candidacy_getCandidaciesForCertificationAuthority_authorization {
    candidacy_getCandidaciesForCertificationAuthority {
      rows {
        id
      }
    }
  }
`);

const getCandidaciesForAAPDocument = graphql(`
  query candidacy_getCandidaciesForAAP_authorization {
    candidacy_getCandidaciesForAAP {
      rows {
        id
      }
    }
  }
`);

const asRole = (role: KeyCloakUserRole, keycloakId?: string) =>
  authorizationHeaderForUser({
    role,
    keycloakId: keycloakId ?? faker.string.uuid(),
  });

const getClient = (authorization?: string) =>
  getGraphQLClient({
    headers: authorization ? { authorization } : undefined,
  });

const getCandidacies = (authorization?: string) =>
  getClient(authorization).request(getCandidaciesDocument);

const getRandomOrganismsForCandidacy = (candidacyId: string) =>
  getClient().request(getRandomOrganismsForCandidacyDocument, { candidacyId });

const searchOrganismsForCandidacyAsAdmin = (
  authorization: string | undefined,
  candidacyId: string,
) =>
  getClient(authorization).request(searchOrganismsForCandidacyAsAdminDocument, {
    candidacyId,
  });

const getCandidacyCountByStatus = (authorization?: string) =>
  getClient(authorization).request(candidacyCountByStatusDocument);

const getDeniedCandidacyCountByStatus = (authorization?: string) =>
  getClient(authorization).request(deniedCandidacyCountByStatusDocument);

const getCandidacyCcns = (authorization?: string) =>
  getClient(authorization).request(getCandidacyCcnsDocument);

const canAccessCandidacy = (candidacyId: string) =>
  getClient().request(canAccessCandidacyDocument, { candidacyId });

const getCandidaciesForCertificationAuthority = (authorization?: string) =>
  getClient(authorization).request(
    getCandidaciesForCertificationAuthorityDocument,
  );

const getCandidaciesForAAP = (authorization?: string) =>
  getClient(authorization).request(getCandidaciesForAAPDocument);

describe("candidacy resolver read authorization", () => {
  describe("getCandidacies", () => {
    test("allows an admin to list every candidacy", async () => {
      const candidacy = await createCandidacyHelper();

      const response = await getCandidacies(asRole("admin"));

      expect(response.getCandidacies.rows).toContainEqual({
        id: candidacy.id,
      });
    });

    test("allows the maison mere manager to list candidacies associated to its maison mere", async () => {
      const organism = await createOrganismHelper();
      const candidacy = await createCandidacyHelper({
        candidacyArgs: { organismId: organism.id },
      });
      const foreignCandidacy = await createCandidacyHelper();

      const response = await getCandidacies(
        asRole(
          "gestion_maison_mere_aap",
          organism.maisonMereAAP!.gestionnaire.keycloakId,
        ),
      );

      expect(response.getCandidacies.rows).toContainEqual({
        id: candidacy.id,
      });
      expect(response.getCandidacies.rows).not.toContainEqual({
        id: foreignCandidacy.id,
      });
    });

    test.each<KeyCloakUserRole>([
      "candidate",
      "manage_feasibility",
      "manage_certification_authority_local_account",
      "manage_certification_registry",
      "manage_vae_collective",
    ])("rejects the %s role", async (role: KeyCloakUserRole) => {
      await expect(getCandidacies(asRole(role))).rejects.toThrowError(
        NOT_AUTHORIZED,
      );
    });

    test("rejects an unauthenticated request", async () => {
      await expect(getCandidacies()).rejects.toThrowError(SESSION_EXPIRED);
    });
  });

  test("allows an unauthenticated user to request an organism search for a candidacy", async () => {
    await expect(
      getRandomOrganismsForCandidacy(faker.string.uuid()),
    ).rejects.toThrowError(CANDIDATURE_NON_TROUVEE);
  });

  describe("candidacy_searchOrganismsForCandidacyAsAdmin", () => {
    test("allows an admin to request an organism search", async () => {
      await expect(
        searchOrganismsForCandidacyAsAdmin(
          asRole("admin"),
          faker.string.uuid(),
        ),
      ).rejects.toThrowError(CANDIDATURE_NON_TROUVEE);
    });

    test.each<KeyCloakUserRole>([
      "candidate",
      "manage_candidacy",
      "gestion_maison_mere_aap",
      "manage_feasibility",
      "manage_certification_authority_local_account",
      "manage_certification_registry",
      "manage_vae_collective",
    ])("rejects the %s role", async (role: KeyCloakUserRole) => {
      await expect(
        searchOrganismsForCandidacyAsAdmin(asRole(role), faker.string.uuid()),
      ).rejects.toThrowError(NOT_AUTHORIZED);
    });

    test("rejects an unauthenticated request", async () => {
      await expect(
        searchOrganismsForCandidacyAsAdmin(undefined, faker.string.uuid()),
      ).rejects.toThrowError(SESSION_EXPIRED);
    });
  });

  describe("candidacy_candidacyCountByStatus", () => {
    test("allows the maison mere manager to count only candidacies associated to its maison mere", async () => {
      const organism = await createOrganismHelper();
      await createCandidacyHelper({
        candidacyActiveStatus: CandidacyStatusStep.PARCOURS_CONFIRME,
        candidacyArgs: { organismId: organism.id },
      });
      await createCandidacyHelper({
        candidacyActiveStatus: CandidacyStatusStep.PARCOURS_CONFIRME,
      });

      const response = await getCandidacyCountByStatus(
        asRole(
          "gestion_maison_mere_aap",
          organism.maisonMereAAP!.gestionnaire.keycloakId,
        ),
      );

      expect(response.candidacy_candidacyCountByStatus).toEqual({
        ACTIVE_HORS_ABANDON: 1,
        PARCOURS_CONFIRME_HORS_ABANDON: 1,
      });
    });

    test("rejects the candidate role", async () => {
      await expect(
        getDeniedCandidacyCountByStatus(asRole("candidate")),
      ).rejects.toThrowError(NOT_AUTHORIZED);
    });

    test.each<KeyCloakUserRole>([
      "manage_feasibility",
      "manage_certification_authority_local_account",
      "manage_certification_registry",
      "manage_vae_collective",
    ])("rejects the %s role", async (role: KeyCloakUserRole) => {
      await expect(
        getDeniedCandidacyCountByStatus(asRole(role)),
      ).rejects.toThrowError(NOT_AUTHORIZED);
    });

    test("rejects an unauthenticated request", async () => {
      await expect(getDeniedCandidacyCountByStatus()).rejects.toThrowError(
        SESSION_EXPIRED,
      );
    });
  });

  describe("candidacy_getCandidacyCcns", () => {
    test.each<KeyCloakUserRole>([
      "admin",
      "candidate",
      "manage_candidacy",
      "gestion_maison_mere_aap",
    ])(
      "allows the %s role to list collective agreements",
      async (role: KeyCloakUserRole) => {
        const response = await getCandidacyCcns(asRole(role));

        expect(response.candidacy_getCandidacyCcns.rows).toBeInstanceOf(Array);
      },
    );

    test.each<KeyCloakUserRole>([
      "manage_feasibility",
      "manage_certification_authority_local_account",
      "manage_certification_registry",
      "manage_vae_collective",
    ])("rejects the %s role", async (role: KeyCloakUserRole) => {
      await expect(getCandidacyCcns(asRole(role))).rejects.toThrowError(
        NOT_AUTHORIZED,
      );
    });

    test("rejects an unauthenticated request", async () => {
      await expect(getCandidacyCcns()).rejects.toThrowError(SESSION_EXPIRED);
    });
  });

  test("allows an unauthenticated request to check candidacy access", async () => {
    const candidacy = await createCandidacyHelper();

    const response = await canAccessCandidacy(candidacy.id);

    expect(response.candidacy_canAccessCandidacy).toBe(false);
  });

  describe("candidacy_getCandidaciesForCertificationAuthority", () => {
    test("allows an admin to list candidacies", async () => {
      const response = await getCandidaciesForCertificationAuthority(
        asRole("admin"),
      );

      expect(
        response.candidacy_getCandidaciesForCertificationAuthority.rows,
      ).toBeInstanceOf(Array);
    });

    test("allows a certification authority manager to list candidacies", async () => {
      const certificationAuthority = await createCertificationAuthorityHelper();

      const response = await getCandidaciesForCertificationAuthority(
        asRole(
          "manage_certification_authority_local_account",
          certificationAuthority.Account[0].keycloakId,
        ),
      );

      expect(
        response.candidacy_getCandidaciesForCertificationAuthority.rows,
      ).toBeInstanceOf(Array);
    });

    test("allows a certification authority local account to list candidacies", async () => {
      const localAccount =
        await createCertificationAuthorityLocalAccountHelper();

      const response = await getCandidaciesForCertificationAuthority(
        asRole("manage_feasibility", localAccount.account.keycloakId),
      );

      expect(
        response.candidacy_getCandidaciesForCertificationAuthority.rows,
      ).toBeInstanceOf(Array);
    });

    test.each<KeyCloakUserRole>([
      "candidate",
      "manage_candidacy",
      "gestion_maison_mere_aap",
      "manage_certification_registry",
      "manage_vae_collective",
    ])("rejects the %s role", async (role: KeyCloakUserRole) => {
      await expect(
        getCandidaciesForCertificationAuthority(asRole(role)),
      ).rejects.toThrowError(NOT_AUTHORIZED);
    });

    test("rejects an unauthenticated request", async () => {
      await expect(
        getCandidaciesForCertificationAuthority(),
      ).rejects.toThrowError(SESSION_EXPIRED);
    });
  });

  describe("candidacy_getCandidaciesForAAP", () => {
    test("allows an admin to list candidacies", async () => {
      const response = await getCandidaciesForAAP(asRole("admin"));

      expect(response.candidacy_getCandidaciesForAAP.rows).toBeInstanceOf(
        Array,
      );
    });

    test("allows the AAP to list only candidacies associated to it", async () => {
      const organism = await createOrganismHelper();
      const candidacy = await createCandidacyHelper({
        candidacyArgs: { organismId: organism.id },
      });
      const foreignCandidacy = await createCandidacyHelper();

      const response = await getCandidaciesForAAP(
        asRole(
          "manage_candidacy",
          organism.organismOnAccounts[0].account.keycloakId,
        ),
      );

      expect(response.candidacy_getCandidaciesForAAP.rows).toContainEqual({
        id: candidacy.id,
      });
      expect(response.candidacy_getCandidaciesForAAP.rows).not.toContainEqual({
        id: foreignCandidacy.id,
      });
    });

    test("allows the maison mere manager to list candidacies associated to its maison mere", async () => {
      const organism = await createOrganismHelper();
      const candidacy = await createCandidacyHelper({
        candidacyArgs: { organismId: organism.id },
      });
      const foreignCandidacy = await createCandidacyHelper();

      const response = await getCandidaciesForAAP(
        asRole(
          "gestion_maison_mere_aap",
          organism.maisonMereAAP!.gestionnaire.keycloakId,
        ),
      );

      expect(response.candidacy_getCandidaciesForAAP.rows).toContainEqual({
        id: candidacy.id,
      });
      expect(response.candidacy_getCandidaciesForAAP.rows).not.toContainEqual({
        id: foreignCandidacy.id,
      });
    });

    test.each<KeyCloakUserRole>([
      "candidate",
      "manage_feasibility",
      "manage_certification_authority_local_account",
      "manage_certification_registry",
      "manage_vae_collective",
    ])("rejects the %s role", async (role: KeyCloakUserRole) => {
      await expect(getCandidaciesForAAP(asRole(role))).rejects.toThrowError(
        NOT_AUTHORIZED,
      );
    });

    test("rejects an unauthenticated request", async () => {
      await expect(getCandidaciesForAAP()).rejects.toThrowError(
        SESSION_EXPIRED,
      );
    });
  });
});
