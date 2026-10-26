import { faker } from "@faker-js/faker";

import {
  NOT_AUTHORIZED_CANDIDACY_ACCESS,
  SESSION_EXPIRED,
} from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyCCNHelper } from "@/test/helpers/entities/create-candidacy-ccn-helper";
import { createCandidacyDropOutHelper } from "@/test/helpers/entities/create-candidacy-drop-out-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCandidateHelper } from "@/test/helpers/entities/create-candidate-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationAuthorityLocalAccountHelper } from "@/test/helpers/entities/create-certification-authority-local-account-helper";
import { createCertificationHelper } from "@/test/helpers/entities/create-certification-helper";
import { createDropOutReasonHelper } from "@/test/helpers/entities/create-drop-out-reason-helper";
import { createFeasibilityUploadedPdfHelper } from "@/test/helpers/entities/create-feasibility-uploaded-pdf-helper";
import { createOrganismHelper } from "@/test/helpers/entities/create-organism-helper";
import { createReorientationReasonHelper } from "@/test/helpers/entities/create-reorientation-reason-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../../graphql/generated";

const getCandidacyById = graphql(`
  query getCandidacyById_authorization($id: ID!) {
    getCandidacyById(id: $id) {
      id
    }
  }
`);

const getCandidacyByIdWithResolvedFields = graphql(`
  query getCandidacyByIdWithResolvedFields_authorization($id: ID!) {
    getCandidacyById(id: $id) {
      id
      goals {
        id
      }
      experiences {
        id
      }
      candidate {
        id
      }
      organism {
        id
      }
      candidacyStatuses {
        id
      }
      reorientationReason {
        id
      }
      conventionCollective {
        id
      }
      candidacyDropOut {
        dropOutReason {
          id
        }
      }
      candidacyOnCandidacyFinancingMethods {
        id
        candidacyFinancingMethod {
          id
        }
      }
      candidateInfo {
        city
      }
      endAccompagnementCandidateDropOutReason {
        id
      }
      feasibilityFileDematAutonomeResourceHidden
      feasibilityFileDematAutonomeFirstOpening
    }
  }
`);

const getCandidacy = ({
  role,
  candidacyId,
  keycloakId,
}: {
  role: KeyCloakUserRole;
  candidacyId: string;
  keycloakId?: string;
}) => {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role,
        keycloakId: keycloakId || "whatever",
      }),
    },
  });

  return graphqlClient.request(getCandidacyById, { id: candidacyId });
};

describe("candidacy resolver read authorization", () => {
  test("allows an admin to access any candidacy", async () => {
    const candidacy = await createCandidacyHelper();
    const response = await getCandidacy({
      role: "admin",
      candidacyId: candidacy.id,
    });
    expect(response.getCandidacyById).toMatchObject({
      id: candidacy.id,
    });
  });

  test("allows the candidate owning the candidacy to access it", async () => {
    const candidacy = await createCandidacyHelper();
    const response = await getCandidacy({
      role: "candidate",
      keycloakId: candidacy.candidate?.keycloakId,
      candidacyId: candidacy.id,
    });
    expect(response.getCandidacyById).toMatchObject({
      id: candidacy.id,
    });
  });

  test("rejects a random candidate for a candidacy they do not own", async () => {
    const candidacy = await createCandidacyHelper();
    const randomCandidate = await createCandidateHelper();

    await expect(
      getCandidacy({
        role: "candidate",
        keycloakId: randomCandidate.keycloakId,
        candidacyId: candidacy.id,
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED_CANDIDACY_ACCESS);
  });

  test("allows the AAP associated to the candidacy to access it", async () => {
    const organism = await createOrganismHelper();
    const candidacy = await createCandidacyHelper({
      candidacyArgs: {
        organismId: organism.id,
      },
    });

    const response = await getCandidacy({
      role: "manage_candidacy",
      keycloakId: organism.organismOnAccounts[0].account.keycloakId,
      candidacyId: candidacy.id,
    });
    expect(response.getCandidacyById).toMatchObject({
      id: candidacy.id,
    });
  });

  test("rejects an AAP not associated to the candidacy", async () => {
    const organism = await createOrganismHelper();
    const candidacy = await createCandidacyHelper();
    await expect(
      getCandidacy({
        role: "manage_candidacy",
        keycloakId: organism.organismOnAccounts[0].account.keycloakId,
        candidacyId: candidacy.id,
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED_CANDIDACY_ACCESS);
  });

  test("allows the maison mere manager of the AAP associated to the candidacy to access it", async () => {
    const organism = await createOrganismHelper();
    const candidacy = await createCandidacyHelper({
      candidacyArgs: {
        organismId: organism.id,
      },
    });

    const response = await getCandidacy({
      role: "gestion_maison_mere_aap",
      keycloakId: organism.maisonMereAAP?.gestionnaire.keycloakId,
      candidacyId: candidacy.id,
    });
    expect(response.getCandidacyById).toMatchObject({
      id: candidacy.id,
    });
  });

  test("rejects a maison mere manager outside the candidacy scope", async () => {
    const organism = await createOrganismHelper();
    const candidacy = await createCandidacyHelper();
    await expect(
      getCandidacy({
        role: "gestion_maison_mere_aap",
        keycloakId: organism.maisonMereAAP?.gestionnaire.keycloakId,
        candidacyId: candidacy.id,
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED_CANDIDACY_ACCESS);
  });

  test("allows the certification authority manager handling the candidacy feasibility file to access it", async () => {
    const certificationAuthority = await createCertificationAuthorityHelper();

    const feasibility = await createFeasibilityUploadedPdfHelper({
      certificationAuthorityId: certificationAuthority.id,
    });

    const response = await getCandidacy({
      role: "manage_certification_authority_local_account",
      keycloakId: certificationAuthority.account.keycloakId,
      candidacyId: feasibility.candidacyId,
    });
    expect(response.getCandidacyById).toMatchObject({
      id: feasibility.candidacyId,
    });
  });

  test("rejects a certification authority manager outside the candidacy scope", async () => {
    const certificationAuthority = await createCertificationAuthorityHelper();
    const candidacy = await createCandidacyHelper();
    await expect(
      getCandidacy({
        role: "manage_certification_authority_local_account",
        keycloakId: certificationAuthority.account.keycloakId,
        candidacyId: candidacy.id,
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED_CANDIDACY_ACCESS);
  });

  test("allows the certification local account handling the candidacy feasibility file to access it", async () => {
    const certificationAuthorityLocalAccount =
      await createCertificationAuthorityLocalAccountHelper();

    const certification = await createCertificationHelper({
      certificationAuthorityStructureId:
        certificationAuthorityLocalAccount.certificationAuthority
          .certificationAuthorityOnCertificationAuthorityStructure[0]
          ?.certificationAuthorityStructureId,
    });

    const candidacyInput = await createCandidacyHelper({
      candidacyArgs: {
        certificationId: certification.id,
      },
    });

    await prismaClient.certificationAuthorityLocalAccountOnCertification.create(
      {
        data: {
          certificationAuthorityLocalAccountId:
            certificationAuthorityLocalAccount.id,
          certificationId: certification.id,
        },
      },
    );

    await prismaClient.certificationAuthorityLocalAccountOnDepartment.create({
      data: {
        certificationAuthorityLocalAccountId:
          certificationAuthorityLocalAccount.id,
        departmentId: candidacyInput.candidate?.departmentId || "",
      },
    });

    const feasibility = await createFeasibilityUploadedPdfHelper({
      certificationAuthorityId:
        certificationAuthorityLocalAccount.certificationAuthorityId,
      candidacyId: candidacyInput.id,
    });

    const response = await getCandidacy({
      role: "manage_feasibility",
      keycloakId: certificationAuthorityLocalAccount.account.keycloakId,
      candidacyId: feasibility.candidacyId,
    });
    expect(response.getCandidacyById).toMatchObject({
      id: feasibility.candidacyId,
    });
  });

  test("rejects a certification local account outside the candidacy scope", async () => {
    const certificationAuthorityLocalAccount =
      await createCertificationAuthorityLocalAccountHelper();
    const candidacy = await createCandidacyHelper();
    await expect(
      getCandidacy({
        role: "manage_feasibility",
        keycloakId: certificationAuthorityLocalAccount.account.keycloakId,
        candidacyId: candidacy.id,
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED_CANDIDACY_ACCESS);
  });

  test("rejects access to a non-existing candidacy", async () => {
    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "admin",
          keycloakId: "whatever",
        }),
      },
    });

    await expect(
      graphqlClient.request(getCandidacyById, {
        id: "fb53327b-8ed9-4238-8e80-007fa1ddcfe6",
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED_CANDIDACY_ACCESS);
  });

  const asRole = (role: KeyCloakUserRole, keycloakId?: string) =>
    authorizationHeaderForUser({
      role,
      keycloakId: keycloakId ?? faker.string.uuid(),
    });

  const getCandidacyWithResolvedFields = ({
    authorization,
    candidacyId,
  }: {
    authorization?: string;
    candidacyId: string;
  }) => {
    const graphqlClient = getGraphQLClient({
      headers: authorization ? { authorization } : undefined,
    });

    return graphqlClient.request(getCandidacyByIdWithResolvedFields, {
      id: candidacyId,
    });
  };

  describe("resolved candidacy fields", () => {
    test("allows the candidate owning the candidacy to resolve every candidacy field", async () => {
      const conventionCollective = await createCandidacyCCNHelper();
      const reorientationReason = await createReorientationReasonHelper();
      const endAccompagnementDropOutReason = await createDropOutReasonHelper();
      const candidacy = await createCandidacyHelper({
        candidacyArgs: {
          ccnId: conventionCollective.id,
          reorientationReasonId: reorientationReason.id,
          endAccompagnementCandidateDropOutReasonId:
            endAccompagnementDropOutReason.id,
          feasibilityFileDematAutonomeResourceHiddenAt: new Date(),
        },
      });
      const candidacyDropOut = await createCandidacyDropOutHelper({
        candidacyId: candidacy.id,
      });
      const financingMethod =
        await prismaClient.candidacyFinancingMethod.findFirstOrThrow();
      const financingMethodRelation =
        await prismaClient.candidacyOnCandidacyFinancingMethod.create({
          data: {
            candidacyId: candidacy.id,
            candidacyFinancingMethodId: financingMethod.id,
          },
        });
      const goal = await prismaClient.goal.findFirstOrThrow();
      await prismaClient.candicadiesOnGoals.create({
        data: { candidacyId: candidacy.id, goalId: goal.id },
      });
      const experience = await prismaClient.experience.create({
        data: {
          candidacyId: candidacy.id,
          title: faker.lorem.words(3),
          description: faker.lorem.sentence(),
          duration: "betweenOneAndThreeYears",
          startedAt: faker.date.past(),
        },
      });
      const candidateInfo = await prismaClient.candidacyCandidateInfo.create({
        data: { candidacyId: candidacy.id, city: faker.location.city() },
      });

      const response = await getCandidacyWithResolvedFields({
        authorization: asRole("candidate", candidacy.candidate!.keycloakId),
        candidacyId: candidacy.id,
      });

      expect(response.getCandidacyById).toMatchObject({
        goals: [{ id: goal.id }],
        experiences: [{ id: experience.id }],
        candidate: { id: candidacy.candidateId },
        organism: { id: candidacy.organismId },
        candidacyStatuses: [{ id: candidacy.candidacyStatuses[0].id }],
        reorientationReason: { id: reorientationReason.id },
        conventionCollective: { id: conventionCollective.id },
        candidacyDropOut: {
          dropOutReason: { id: candidacyDropOut.dropOutReasonId },
        },
        candidacyOnCandidacyFinancingMethods: [
          {
            id: financingMethodRelation.id,
            candidacyFinancingMethod: { id: financingMethod.id },
          },
        ],
        candidateInfo: { city: candidateInfo.city },
        endAccompagnementCandidateDropOutReason: {
          id: endAccompagnementDropOutReason.id,
        },
        feasibilityFileDematAutonomeResourceHidden: true,
      });
    });

    test("rejects resolved candidacy fields from a random candidate", async () => {
      const candidacy = await createCandidacyHelper();
      const randomCandidate = await createCandidateHelper();

      await expect(
        getCandidacyWithResolvedFields({
          authorization: asRole("candidate", randomCandidate.keycloakId),
          candidacyId: candidacy.id,
        }),
      ).rejects.toThrowError(NOT_AUTHORIZED_CANDIDACY_ACCESS);
    });

    test.each<KeyCloakUserRole>([
      "manage_certification_registry",
      "manage_vae_collective",
    ])(
      "rejects resolved candidacy fields from the %s role",
      async (role: KeyCloakUserRole) => {
        const candidacy = await createCandidacyHelper();

        await expect(
          getCandidacyWithResolvedFields({
            authorization: asRole(role),
            candidacyId: candidacy.id,
          }),
        ).rejects.toThrowError(NOT_AUTHORIZED_CANDIDACY_ACCESS);
      },
    );

    test("rejects resolved candidacy fields from an unauthenticated request", async () => {
      const candidacy = await createCandidacyHelper();

      await expect(
        getCandidacyWithResolvedFields({ candidacyId: candidacy.id }),
      ).rejects.toThrowError(SESSION_EXPIRED);
    });
  });
});
