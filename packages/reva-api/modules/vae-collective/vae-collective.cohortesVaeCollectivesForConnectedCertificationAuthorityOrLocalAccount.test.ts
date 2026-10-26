import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationAuthorityLocalAccountHelper } from "@/test/helpers/entities/create-certification-authority-local-account-helper";
import { createFeasibilityDematerializedHelper } from "@/test/helpers/entities/create-feasibility-dematerialized-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../graphql/generated";

const getCohortesForCertificationAuthorityOrLocalAccount = ({
  userKeycloakId,
  userRole,
}: {
  userKeycloakId: string;
  userRole: KeyCloakUserRole;
}) => {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: userRole,
        keycloakId: userKeycloakId,
      }),
    },
  });

  const getCohortes = graphql(`
    query cohortesVaeCollectivesForConnectedCertificationAuthorityOrLocalAccount {
      cohortesVaeCollectivesForConnectedCertificationAuthorityOrLocalAccount {
        id
      }
    }
  `);

  return graphqlClient.request(getCohortes);
};

describe("cohortes vae collectives for certification authority or local account", () => {
  describe("certification authority", () => {
    test("should return a cohorte when a candidacy is belonging to it and is associated to the certification authority", async () => {
      const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

      const candidacy = await createCandidacyHelper({
        candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
      });

      const certificationAuthority = await createCertificationAuthorityHelper();

      await createFeasibilityDematerializedHelper({
        candidacyId: candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
      });

      const resp = await getCohortesForCertificationAuthorityOrLocalAccount({
        userKeycloakId: certificationAuthority.account.keycloakId || "",
        userRole: "manage_certification_authority_local_account",
      });

      expect(
        resp
          .cohortesVaeCollectivesForConnectedCertificationAuthorityOrLocalAccount
          .length,
      ).toBe(1);
    });

    test("should return an empty array when a candidacy is belonging to a cohorte and is NOT associated to the certification authority", async () => {
      const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

      const candidacy = await createCandidacyHelper({
        candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
      });

      const certificationAuthority = await createCertificationAuthorityHelper();

      await createFeasibilityDematerializedHelper({
        candidacyId: candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
      });

      const secondCertificationAuthority =
        await createCertificationAuthorityHelper();

      const resp = await getCohortesForCertificationAuthorityOrLocalAccount({
        userKeycloakId: secondCertificationAuthority.account.keycloakId || "",
        userRole: "manage_certification_authority_local_account",
      });

      expect(
        resp
          .cohortesVaeCollectivesForConnectedCertificationAuthorityOrLocalAccount
          .length,
      ).toBe(0);
    });
  });

  describe("certification authority local account", () => {
    test("should return a cohorte when a candidacy is belonging to it and is associated to the certification authority local account", async () => {
      const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

      const candidacy = await createCandidacyHelper({
        candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
      });

      const certificationAuthority = await createCertificationAuthorityHelper();

      const localAccount = await createCertificationAuthorityLocalAccountHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          certificationAuthorityLocalAccountOnCandidacy: {
            create: {
              candidacyId: candidacy.id,
            },
          },
        },
      );

      const resp = await getCohortesForCertificationAuthorityOrLocalAccount({
        userKeycloakId: localAccount.account.keycloakId,
        userRole: "manage_feasibility",
      });

      expect(
        resp
          .cohortesVaeCollectivesForConnectedCertificationAuthorityOrLocalAccount
          .length,
      ).toBe(1);
    });

    test("should return an empty array when a candidacy is belonging to a cohorte and is NOT associated to the certification authority local account", async () => {
      const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

      const candidacy = await createCandidacyHelper({
        candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
      });

      const certificationAuthority = await createCertificationAuthorityHelper();

      await createCertificationAuthorityLocalAccountHelper({
        certificationAuthorityId: certificationAuthority.id,
        certificationAuthorityLocalAccountOnCandidacy: {
          create: {
            candidacyId: candidacy.id,
          },
        },
      });

      const secondLocalAccount =
        await createCertificationAuthorityLocalAccountHelper();

      const resp = await getCohortesForCertificationAuthorityOrLocalAccount({
        userKeycloakId: secondLocalAccount.account.keycloakId,
        userRole: "manage_feasibility",
      });

      expect(
        resp
          .cohortesVaeCollectivesForConnectedCertificationAuthorityOrLocalAccount
          .length,
      ).toBe(0);
    });
  });
});
