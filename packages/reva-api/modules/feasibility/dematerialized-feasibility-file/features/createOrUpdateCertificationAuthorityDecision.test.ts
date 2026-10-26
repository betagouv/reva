import { v4 as uuidV4 } from "uuid";

import { graphql } from "@/modules/graphql/generated";
import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationAuthorityLocalAccountHelper } from "@/test/helpers/entities/create-certification-authority-local-account-helper";
import { createFeasibilityDematerializedHelper } from "@/test/helpers/entities/create-feasibility-dematerialized-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

const createOrUpdateCertificationAuthorityDecisionMutation = graphql(`
  mutation dff_createOrUpdateCertificationAuthorityDecision(
    $candidacyId: ID!
    $input: DematerializedFeasibilityFileCreateOrUpdateCertificationAuthorityDecisionInput!
  ) {
    dematerialized_feasibility_file_createOrUpdateCertificationAuthorityDecision(
      candidacyId: $candidacyId
      input: $input
    ) {
      id
    }
  }
`);

const sendDFFToCertificationAuthorityMutation = graphql(`
  mutation dff_sendToCertificationAuthority(
    $candidacyId: ID!
    $dematerializedFeasibilityFileId: ID!
    $certificationAuthorityId: ID!
  ) {
    dematerialized_feasibility_file_sendToCertificationAuthority(
      candidacyId: $candidacyId
      dematerializedFeasibilityFileId: $dematerializedFeasibilityFileId
      certificationAuthorityId: $certificationAuthorityId
    )
  }
`);

type CandidacyHelper = Awaited<ReturnType<typeof createCandidacyHelper>>;

const getCertificationAuthorityKeycloakId = (candidacy: CandidacyHelper) =>
  candidacy.certification?.certificationAuthorityStructure
    ?.certificationAuthorityOnCertificationAuthorityStructure?.[0]
    ?.certificationAuthority?.account?.keycloakId;

const getCertificationAuthorityId = (candidacy: CandidacyHelper) =>
  candidacy.certification?.certificationAuthorityStructure
    ?.certificationAuthorityOnCertificationAuthorityStructure?.[0]
    ?.certificationAuthority?.id;

const getCertificationAuthorityAccountId = (candidacy: CandidacyHelper) =>
  candidacy.certification?.certificationAuthorityStructure
    ?.certificationAuthorityOnCertificationAuthorityStructure?.[0]
    ?.certificationAuthority?.account?.id;

const getAapKeycloakId = (candidacy: CandidacyHelper) =>
  candidacy.organism?.organismOnAccounts?.[0]?.account?.keycloakId;

// La décision est réservée au périmètre du certificateur : le compte tête de réseau n'y accède
// que via un compte local rattaché à la candidature. Ce rattachement est posé par le helper de
// faisabilité, qui ne relie que les comptes locaux déjà existants : à créer AVANT lui.
const linkCertificationAuthorityAccountToCandidacy = (
  candidacy: CandidacyHelper,
) =>
  createCertificationAuthorityLocalAccountHelper({
    certificationAuthorityId: getCertificationAuthorityId(candidacy)!,
    accountId: getCertificationAuthorityAccountId(candidacy)!,
    certificationAuthorityLocalAccountOnCertification: {
      create: { certificationId: candidacy.certificationId! },
    },
    certificationAuthorityLocalAccountOnDepartment: {
      create: { departmentId: candidacy.candidate?.departmentId ?? "" },
    },
  });

describe("Décision INCOMPLETE sur le dossier de faisabilité dématérialisé", () => {
  const createDFFWithPreExistingData = async () => {
    const candidacy = await createCandidacyHelper({
      candidacyActiveStatus: "DOSSIER_FAISABILITE_ENVOYE",
      candidacyArgs: { status: "DOSSIER_FAISABILITE_ENVOYE" },
    });

    await linkCertificationAuthorityAccountToCandidacy(candidacy);

    const feasibility = await createFeasibilityDematerializedHelper({
      candidacyId: candidacy.id,
      decision: "PENDING",
      feasibilityFileSentAt: new Date(),
      certificationAuthorityId: getCertificationAuthorityId(candidacy)!,
    });

    const swornStatementFile = await prismaClient.file.create({
      data: {
        id: uuidV4(),
        name: "sworn-statement.pdf",
        mimeType: "application/pdf",
        path: `candidacies/${candidacy.id}/dff_files/sworn-statement.pdf`,
      },
    });

    await prismaClient.dematerializedFeasibilityFile.update({
      where: { id: feasibility.dematerializedFeasibilityFile!.id },
      data: {
        sentToCandidateAt: new Date("2025-01-01"),
        candidateConfirmationAt: new Date("2025-01-02"),
        swornStatementFileId: swornStatementFile.id,
      },
    });

    return { candidacy, feasibility, swornStatementFile };
  };

  test("la décision INCOMPLETE ne doit pas effacer les données du DFF", async () => {
    const { candidacy, feasibility } = await createDFFWithPreExistingData();

    const certKeycloakId = getCertificationAuthorityKeycloakId(candidacy);
    const client = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "manage_feasibility",
          keycloakId: certKeycloakId!,
        }),
      },
    });

    await client.request(createOrUpdateCertificationAuthorityDecisionMutation, {
      candidacyId: candidacy.id,
      input: {
        decision: "INCOMPLETE",
        decisionComment: "Il manque des pièces justificatives",
      },
    });

    const updatedFeasibility = await prismaClient.feasibility.findFirst({
      where: { id: feasibility.id },
      include: { dematerializedFeasibilityFile: true },
    });

    expect(updatedFeasibility?.decision).toBe("INCOMPLETE");
    expect(updatedFeasibility?.decisionComment).toBe(
      "Il manque des pièces justificatives",
    );
    expect(updatedFeasibility?.decisionSentAt).not.toBeNull();

    expect(updatedFeasibility?.feasibilityFileSentAt).not.toBeNull();

    const dff = updatedFeasibility?.dematerializedFeasibilityFile;
    expect(dff?.sentToCandidateAt).not.toBeNull();
    expect(dff?.candidateConfirmationAt).not.toBeNull();
    expect(dff?.swornStatementFileId).not.toBeNull();

    const updatedCandidacy = await prismaClient.candidacy.findUnique({
      where: { id: candidacy.id },
    });
    expect(updatedCandidacy?.status).toBe("DOSSIER_FAISABILITE_INCOMPLET");
  });

  describe("Garde temporelle pour sendDFFToCertificationAuthority", () => {
    test("devrait échouer quand le dossier INCOMPLETE n'a pas été re-confirmé par le candidat", async () => {
      const { candidacy, feasibility } = await createDFFWithPreExistingData();

      const certKeycloakId = getCertificationAuthorityKeycloakId(candidacy);
      const certClient = getGraphQLClient({
        headers: {
          authorization: authorizationHeaderForUser({
            role: "manage_feasibility",
            keycloakId: certKeycloakId!,
          }),
        },
      });

      await certClient.request(
        createOrUpdateCertificationAuthorityDecisionMutation,
        {
          candidacyId: candidacy.id,
          input: {
            decision: "INCOMPLETE",
            decisionComment: "Pièces manquantes",
          },
        },
      );

      const aapKeycloakId = getAapKeycloakId(candidacy);
      const aapClient = getGraphQLClient({
        headers: {
          authorization: authorizationHeaderForUser({
            role: "manage_candidacy",
            keycloakId: aapKeycloakId!,
          }),
        },
      });

      await expect(
        aapClient.request(sendDFFToCertificationAuthorityMutation, {
          candidacyId: candidacy.id,
          dematerializedFeasibilityFileId:
            feasibility.dematerializedFeasibilityFile!.id,
          certificationAuthorityId: getCertificationAuthorityId(candidacy)!,
        }),
      ).rejects.toThrowError(
        "Impossible d'envoyer le dossier au certificateur : le dossier doit être corrigé et re-validé par le candidat",
      );
    });

    test("devrait réussir quand le candidat a re-confirmé après la décision INCOMPLETE", async () => {
      const { candidacy, feasibility } = await createDFFWithPreExistingData();

      const certKeycloakId = getCertificationAuthorityKeycloakId(candidacy);
      const certClient = getGraphQLClient({
        headers: {
          authorization: authorizationHeaderForUser({
            role: "manage_feasibility",
            keycloakId: certKeycloakId!,
          }),
        },
      });

      await certClient.request(
        createOrUpdateCertificationAuthorityDecisionMutation,
        {
          candidacyId: candidacy.id,
          input: {
            decision: "INCOMPLETE",
            decisionComment: "Pièces manquantes",
          },
        },
      );

      await prismaClient.dematerializedFeasibilityFile.update({
        where: { id: feasibility.dematerializedFeasibilityFile!.id },
        data: {
          candidateConfirmationAt: new Date(Date.now() + ONE_DAY_IN_MS), // après la décision INCOMPLETE
          attachmentsPartComplete: true,
          certificationPartComplete: true,
          competenceBlocsPartCompletion: "COMPLETED",
          prerequisitesPartComplete: true,
          eligibilityRequirement: "FULL_ELIGIBILITY_REQUIREMENT",
          aapDecision: "FAVORABLE",
        },
      });

      await prismaClient.candidacy.update({
        where: { id: candidacy.id },
        data: { status: "DOSSIER_FAISABILITE_INCOMPLET" },
      });

      const aapKeycloakId = getAapKeycloakId(candidacy);
      const aapClient = getGraphQLClient({
        headers: {
          authorization: authorizationHeaderForUser({
            role: "manage_candidacy",
            keycloakId: aapKeycloakId!,
          }),
        },
      });

      const result = await aapClient.request(
        sendDFFToCertificationAuthorityMutation,
        {
          candidacyId: candidacy.id,
          dematerializedFeasibilityFileId:
            feasibility.dematerializedFeasibilityFile!.id,
          certificationAuthorityId: getCertificationAuthorityId(candidacy)!,
        },
      );

      expect(
        result.dematerialized_feasibility_file_sendToCertificationAuthority,
      ).toBe("Ok");
    });
  });
});

describe("INCOMPLETE decision resets certificationAuthorityId", () => {
  test("should refresh certificationAuthorityId to null after INCOMPLETE decision when no single CA matches", async () => {
    const candidacy = await createCandidacyHelper({
      candidacyActiveStatus: "DOSSIER_FAISABILITE_ENVOYE",
      candidacyArgs: { status: "DOSSIER_FAISABILITE_ENVOYE" },
    });
    const certificationAuthorityId = getCertificationAuthorityId(candidacy)!;

    await linkCertificationAuthorityAccountToCandidacy(candidacy);

    const feasibility = await createFeasibilityDematerializedHelper({
      candidacyId: candidacy.id,
      decision: "PENDING",
      feasibilityFileSentAt: new Date(),
      certificationAuthorityId,
    });

    await prismaClient.dematerializedFeasibilityFile.update({
      where: { id: feasibility.dematerializedFeasibilityFile!.id },
      data: {
        sentToCandidateAt: new Date("2025-01-01"),
        candidateConfirmationAt: new Date("2025-01-02"),
        swornStatementFileId: (
          await prismaClient.file.create({
            data: {
              id: uuidV4(),
              name: "sworn-statement.pdf",
              mimeType: "application/pdf",
              path: `candidacies/${candidacy.id}/dff_files/sworn-statement.pdf`,
            },
          })
        ).id,
      },
    });

    // Pre-set a CA on the candidacy to verify it gets cleared
    const someCA = await createCertificationAuthorityHelper();
    await prismaClient.candidacy.update({
      where: { id: candidacy.id },
      data: { certificationAuthorityId: someCA.id },
    });

    const certKeycloakId = getCertificationAuthorityKeycloakId(candidacy);
    const client = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "manage_feasibility",
          keycloakId: certKeycloakId!,
        }),
      },
    });

    await client.request(createOrUpdateCertificationAuthorityDecisionMutation, {
      candidacyId: candidacy.id,
      input: {
        decision: "INCOMPLETE",
        decisionComment: "Documents manquants",
      },
    });

    const updated = await prismaClient.candidacy.findUnique({
      where: { id: candidacy.id },
    });
    // No CA has both the certification AND the candidate's department linked,
    // so the refresh should set certificationAuthorityId to null
    expect(updated?.certificationAuthorityId).toBeNull();
  });
});
