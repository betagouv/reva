import { CandidateTypology, FeasibilityFormat } from "@prisma/client";

import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyCCNHelper } from "@/test/helpers/entities/create-candidacy-ccn-helper";
import { createCandidateHelper } from "@/test/helpers/entities/create-candidate-helper";
import { createCertificationHelper } from "@/test/helpers/entities/create-certification-helper";
import { createFeatureHelper } from "@/test/helpers/entities/create-feature-helper";
import { createOrganismHelper } from "@/test/helpers/entities/create-organism-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../../graphql/generated";

const createCandidacyMutation = graphql(`
  mutation createCandidacy_test(
    $candidateId: UUID!
    $certificationId: UUID
    $typeAccompagnement: TypeAccompagnement
    $cohorteVaeCollectiveId: UUID
  ) {
    candidacy_createCandidacy(
      candidateId: $candidateId
      data: {
        certificationId: $certificationId
        typeAccompagnement: $typeAccompagnement
        cohorteVaeCollectiveId: $cohorteVaeCollectiveId
      }
    ) {
      id
      feasibilityFormat
      typeAccompagnement
      organism {
        id
      }
      cohorteVaeCollective {
        id
      }
      certification {
        id
      }
      ccnId
      typology
    }
  }
`);

describe("createCandidacy", () => {
  test.each([
    {
      typeAccompagnement: "ACCOMPAGNE" as const,
      expectedFormat: "DEMATERIALIZED",
    },
    { typeAccompagnement: "AUTONOME" as const, expectedFormat: "UPLOADED_PDF" },
  ])(
    "should set feasibilityFormat to $expectedFormat when typeAccompagnement is $typeAccompagnement",
    async ({
      typeAccompagnement,
      expectedFormat,
    }: {
      typeAccompagnement: "ACCOMPAGNE" | "AUTONOME";
      expectedFormat: string;
    }) => {
      const candidate = await createCandidateHelper();
      const certification = await createCertificationHelper({
        feasibilityFormat: FeasibilityFormat.DEMATERIALIZED,
      });

      const graphqlClient = getGraphQLClient({
        headers: {
          authorization: authorizationHeaderForUser({
            role: "candidate",
            keycloakId: candidate.keycloakId,
          }),
        },
      });

      const result = await graphqlClient.request(createCandidacyMutation, {
        candidateId: candidate.id,
        certificationId: certification.id,
        typeAccompagnement,
      });

      expect(result.candidacy_createCandidacy?.feasibilityFormat).toBe(
        expectedFormat,
      );
      expect(result.candidacy_createCandidacy?.typeAccompagnement).toBe(
        typeAccompagnement,
      );
      expect(result.candidacy_createCandidacy?.organism).toBeNull();
    },
  );

  test("should set feasibilityFormat to DEMATERIALIZED for VAE Collective", async () => {
    const candidate = await createCandidateHelper();
    const cohorte = await createCohorteVaeCollectiveHelper();

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidate.keycloakId,
        }),
      },
    });

    const result = await graphqlClient.request(createCandidacyMutation, {
      candidateId: candidate.id,
      cohorteVaeCollectiveId: cohorte.id,
    });

    expect(result.candidacy_createCandidacy?.feasibilityFormat).toBe(
      "DEMATERIALIZED",
    );
    expect(result.candidacy_createCandidacy?.typeAccompagnement).toBe(
      "ACCOMPAGNE",
    );
    expect(result.candidacy_createCandidacy?.cohorteVaeCollective?.id).toBe(
      cohorte.id,
    );
    expect(result.candidacy_createCandidacy?.organism).toBeNull();
  });

  test("should assign the cohorte organism to the candidacy for VAE Collective", async () => {
    const candidate = await createCandidateHelper();
    const organism = await createOrganismHelper();
    const cohorte = await createCohorteVaeCollectiveHelper({
      organism: { connect: { id: organism.id } },
    });

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidate.keycloakId,
        }),
      },
    });

    const result = await graphqlClient.request(createCandidacyMutation, {
      candidateId: candidate.id,
      cohorteVaeCollectiveId: cohorte.id,
    });

    expect(result.candidacy_createCandidacy?.organism?.id).toBe(organism.id);
    expect(result.candidacy_createCandidacy?.cohorteVaeCollective?.id).toBe(
      cohorte.id,
    );
  });

  test("should assign the ccn and typology to the candidacy ACCOMPAGNE", async () => {
    const conventionCollective = await createCandidacyCCNHelper();
    const candidate = await createCandidateHelper({
      ccnId: conventionCollective.id,
      typology: CandidateTypology.SALARIE_PRIVE,
    });
    const certification = await createCertificationHelper({
      feasibilityFormat: FeasibilityFormat.DEMATERIALIZED,
    });

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidate.keycloakId,
        }),
      },
    });

    const result = await graphqlClient.request(createCandidacyMutation, {
      candidateId: candidate.id,
      certificationId: certification.id,
      typeAccompagnement: "ACCOMPAGNE",
    });

    expect(result.candidacy_createCandidacy?.ccnId).toBe(candidate.ccnId);
    expect(result.candidacy_createCandidacy?.typology).toBe(candidate.typology);
  });

  test("should not assign the ccn and typology to the candidacy AUTONOME", async () => {
    const conventionCollective = await createCandidacyCCNHelper();
    const candidate = await createCandidateHelper({
      ccnId: conventionCollective.id,
      typology: CandidateTypology.SALARIE_PRIVE,
    });
    const certification = await createCertificationHelper({
      feasibilityFormat: FeasibilityFormat.DEMATERIALIZED,
    });

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidate.keycloakId,
        }),
      },
    });

    const result = await graphqlClient.request(createCandidacyMutation, {
      candidateId: candidate.id,
      certificationId: certification.id,
      typeAccompagnement: "AUTONOME",
    });

    expect(result.candidacy_createCandidacy?.ccnId).toBeNull();
    expect(result.candidacy_createCandidacy?.typology).toBe(
      CandidateTypology.NON_SPECIFIE,
    );
  });

  test("should assign the ccn and typology to the candidacy AUTONOME if DF Demat Autonome feature is active", async () => {
    await createFeatureHelper({
      args: {
        key: "DF_DEMAT_AUTONOME",
        isActive: true,
      },
    });

    const conventionCollective = await createCandidacyCCNHelper();
    const candidate = await createCandidateHelper({
      ccnId: conventionCollective.id,
      typology: CandidateTypology.SALARIE_PRIVE,
    });
    const certification = await createCertificationHelper({
      feasibilityFormat: FeasibilityFormat.DEMATERIALIZED,
    });

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidate.keycloakId,
        }),
      },
    });

    const result = await graphqlClient.request(createCandidacyMutation, {
      candidateId: candidate.id,
      certificationId: certification.id,
      typeAccompagnement: "AUTONOME",
    });

    expect(result.candidacy_createCandidacy?.ccnId).toBe(candidate.ccnId);
    expect(result.candidacy_createCandidacy?.typology).toBe(candidate.typology);
  });

  test("should throw when the certification does not exist", async () => {
    const candidate = await createCandidateHelper();

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidate.keycloakId,
        }),
      },
    });

    await expect(
      graphqlClient.request(createCandidacyMutation, {
        candidateId: candidate.id,
        certificationId: "00000000-0000-4000-8000-000000000000",
        typeAccompagnement: "ACCOMPAGNE",
      }),
    ).rejects.toThrow("Certification non trouvée");

    const candidacies = await prismaClient.candidacy.findMany({
      where: { candidateId: candidate.id },
    });
    expect(candidacies).toHaveLength(0);
  });

  test("should throw when the cohorte VAE collective does not exist", async () => {
    const candidate = await createCandidateHelper();
    const certification = await createCertificationHelper();

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidate.keycloakId,
        }),
      },
    });

    await expect(
      graphqlClient.request(createCandidacyMutation, {
        candidateId: candidate.id,
        certificationId: certification.id,
        cohorteVaeCollectiveId: "00000000-0000-4000-8000-000000000001",
      }),
    ).rejects.toThrow("Cohorte VAE collective non trouvée");

    const candidacies = await prismaClient.candidacy.findMany({
      where: { candidateId: candidate.id },
    });
    expect(candidacies).toHaveLength(0);
  });

  test("should throw when the certification does not belong to the cohorte VAE collective", async () => {
    const candidate = await createCandidateHelper();
    const certification = await createCertificationHelper();
    const cohorte = await createCohorteVaeCollectiveHelper();

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidate.keycloakId,
        }),
      },
    });

    await expect(
      graphqlClient.request(createCandidacyMutation, {
        candidateId: candidate.id,
        certificationId: certification.id,
        cohorteVaeCollectiveId: cohorte.id,
      }),
    ).rejects.toThrow("Certification de la cohorte VAE collective non trouvée");

    const candidacies = await prismaClient.candidacy.findMany({
      where: { candidateId: candidate.id },
    });
    expect(candidacies).toHaveLength(0);
  });

  test("should create the candidacy when the certification belongs to the cohorte VAE collective", async () => {
    const candidate = await createCandidateHelper();
    const certification = await createCertificationHelper();
    const cohorte = await createCohorteVaeCollectiveHelper({
      certificationCohorteVaeCollectives: {
        create: {
          certification: { connect: { id: certification.id } },
        },
      },
    });

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidate.keycloakId,
        }),
      },
    });

    const result = await graphqlClient.request(createCandidacyMutation, {
      candidateId: candidate.id,
      certificationId: certification.id,
      cohorteVaeCollectiveId: cohorte.id,
    });

    expect(result.candidacy_createCandidacy?.certification?.id).toBe(
      certification.id,
    );
    expect(result.candidacy_createCandidacy?.cohorteVaeCollective?.id).toBe(
      cohorte.id,
    );
  });
});
