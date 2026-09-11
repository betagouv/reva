import {
  CandidacyStatusStep,
  EndAccompagnementStatus,
  FeasibilityStatus,
} from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyDropOutHelper } from "@/test/helpers/entities/create-candidacy-drop-out-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createDossierDeValidationHelper } from "@/test/helpers/entities/create-dossier-de-validation-helper";
import { createFeasibilityDematerializedHelper } from "@/test/helpers/entities/create-feasibility-dematerialized-helper";
import { createFileHelper } from "@/test/helpers/entities/create-file-helper";
import { createFundingRequestUnifvaeHelper } from "@/test/helpers/entities/create-funding-request-unifvae-helper";
import { createJuryHelper } from "@/test/helpers/entities/create-jury-helper";
import { createOrganismHelper } from "@/test/helpers/entities/create-organism-helper";
import { createPaymentRequestUnifvaeHelper } from "@/test/helpers/entities/create-payment-request-unifvae-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../graphql/generated";

import {
  AccompagnementStatusFilter,
  ArchiveStatusFilter,
  DossierDeValidationStatusFilter,
  FeasibilityStatusFilter,
  FundingStatusFilter,
  GetCandidaciesForAAPInput,
  JuryStatusFilter,
  TypeAccompagnementStatusFilter,
} from "./candidacy.types";

const getCandidaciesForAAP = async ({
  userKeycloakId,
  userRole,
  input = {},
}: {
  userKeycloakId: string;
  userRole: KeyCloakUserRole;
  input?: GetCandidaciesForAAPInput;
}) => {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: userRole,
        keycloakId: userKeycloakId,
      }),
    },
  });

  const getCandidaciesForAAPQuery = graphql(`
    query candidacy_getCandidaciesForAAP(
      $cohorteVaeCollectiveIds: [ID!]
      $activeCandidacies: Boolean
      $typeAccompagnementStatuses: [TypeAccompagnementStatusFilter!]
      $trainingStatuses: [CandidacyStatusStep!]
      $feasibilityStatuses: [FeasibilityStatusFilter!]
      $dossierDeValidationStatuses: [DossierDeValidationStatusFilter!]
      $juryStatuses: [JuryStatusFilter!]
      $juryResults: [JuryResultFilter!]
      $fundingStatuses: [FundingStatusFilter!]
      $archiveStatuses: [ArchiveStatusFilter!]
      $accompagnementStatuses: [AccompagnementStatusFilter!]
      $maisonMereAAPId: ID
    ) {
      candidacy_getCandidaciesForAAP(
        cohorteVaeCollectiveIds: $cohorteVaeCollectiveIds
        activeCandidacies: $activeCandidacies
        typeAccompagnementStatuses: $typeAccompagnementStatuses
        trainingStatuses: $trainingStatuses
        feasibilityStatuses: $feasibilityStatuses
        dossierDeValidationStatuses: $dossierDeValidationStatuses
        juryStatuses: $juryStatuses
        juryResults: $juryResults
        fundingStatuses: $fundingStatuses
        archiveStatuses: $archiveStatuses
        accompagnementStatuses: $accompagnementStatuses
        maisonMereAAPId: $maisonMereAAPId
      ) {
        rows {
          id
        }
      }
    }
  `);

  return graphqlClient.request(getCandidaciesForAAPQuery, {
    cohorteVaeCollectiveIds: input.cohorteVaeCollectiveIds,
    activeCandidacies: input.activeCandidacies,
    typeAccompagnementStatuses: input.typeAccompagnementStatuses,
    trainingStatuses: input.trainingStatuses,
    feasibilityStatuses: input.feasibilityStatuses,
    dossierDeValidationStatuses: input.dossierDeValidationStatuses,
    juryStatuses: input.juryStatuses,
    juryResults: input.juryResults,
    fundingStatuses: input.fundingStatuses,
    archiveStatuses: input.archiveStatuses,
    accompagnementStatuses: input.accompagnementStatuses,
    maisonMereAAPId: input.maisonMereAAPId,
  });
};

const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

const createCandidacyWithDematerializedFeasibility = async ({
  organismId,
  decision = FeasibilityStatus.DRAFT,
  decisionSentAt,
  candidacyActiveStatus = CandidacyStatusStep.PARCOURS_CONFIRME,
  dematerializedFeasibilityFile,
}: {
  organismId: string;
  decision?: FeasibilityStatus;
  decisionSentAt?: Date | null;
  candidacyActiveStatus?: CandidacyStatusStep;
  dematerializedFeasibilityFile?: {
    sentToCandidateAt?: Date | null;
    candidateConfirmationAt?: Date | null;
    swornStatementFileId?: string | null;
  };
}) => {
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus,
    candidacyArgs: { organismId },
  });

  const feasibility = await createFeasibilityDematerializedHelper({
    candidacyId: candidacy.id,
    decision,
    decisionSentAt,
  });

  if (
    dematerializedFeasibilityFile &&
    feasibility.dematerializedFeasibilityFile
  ) {
    await prismaClient.dematerializedFeasibilityFile.update({
      where: { id: feasibility.dematerializedFeasibilityFile.id },
      data: dematerializedFeasibilityFile,
    });
  }

  return candidacy;
};

describe("candidacy_getCandidaciesForAAP", () => {
  describe("activeCandidacies", () => {
    describe("AAP", () => {
      test("should return only active candidacies", async () => {
        const organism = await createOrganismHelper();

        const activeCandidacy = await createCandidacyHelper({
          candidacyArgs: { organismId: organism.id },
        });

        await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.ARCHIVE,
          candidacyArgs: { organismId: organism.id },
        });

        const dropOutCandidacy = await createCandidacyHelper({
          candidacyArgs: { organismId: organism.id },
        });
        await createCandidacyDropOutHelper({
          candidacyId: dropOutCandidacy.id,
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus:
              EndAccompagnementStatus.CONFIRMED_BY_CANDIDATE,
          },
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus: EndAccompagnementStatus.CONFIRMED_BY_ADMIN,
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            activeCandidacies: true,
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          activeCandidacy.id,
        );
      });

      test("should exclude archived candidacies", async () => {
        const organism = await createOrganismHelper();

        const activeCandidacy = await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.PARCOURS_CONFIRME,
          candidacyArgs: { organismId: organism.id },
        });

        await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.ARCHIVE,
          candidacyArgs: { organismId: organism.id },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            activeCandidacies: true,
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          activeCandidacy.id,
        );
      });

      test("should exclude drop out candidacies", async () => {
        const organism = await createOrganismHelper();

        const activeCandidacy = await createCandidacyHelper({
          candidacyArgs: { organismId: organism.id },
        });

        const dropOutCandidacy = await createCandidacyHelper({
          candidacyArgs: { organismId: organism.id },
        });
        await createCandidacyDropOutHelper({
          candidacyId: dropOutCandidacy.id,
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            activeCandidacies: true,
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          activeCandidacy.id,
        );
      });

      test("should exclude candidacies with ended accompagnement", async () => {
        const organism = await createOrganismHelper();

        const notRequestedCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus: EndAccompagnementStatus.NOT_REQUESTED,
          },
        });

        const pendingCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus: EndAccompagnementStatus.PENDING,
          },
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus:
              EndAccompagnementStatus.CONFIRMED_BY_CANDIDATE,
          },
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus: EndAccompagnementStatus.CONFIRMED_BY_ADMIN,
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            activeCandidacies: true,
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(2);
        expect(
          resp.candidacy_getCandidaciesForAAP.rows.map(({ id }) => id).sort(),
        ).toEqual([notRequestedCandidacy.id, pendingCandidacy.id].sort());
      });

      test("should return all candidacies when activeCandidacies is false", async () => {
        const organism = await createOrganismHelper();

        const activeCandidacy = await createCandidacyHelper({
          candidacyArgs: { organismId: organism.id },
        });

        const archivedCandidacy = await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.ARCHIVE,
          candidacyArgs: { organismId: organism.id },
        });

        const dropOutCandidacy = await createCandidacyHelper({
          candidacyArgs: { organismId: organism.id },
        });
        await createCandidacyDropOutHelper({
          candidacyId: dropOutCandidacy.id,
        });

        const endedAccompagnementCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus:
              EndAccompagnementStatus.CONFIRMED_BY_CANDIDATE,
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            activeCandidacies: false,
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(4);
        expect(
          resp.candidacy_getCandidaciesForAAP.rows.map(({ id }) => id).sort(),
        ).toEqual(
          [
            activeCandidacy.id,
            archivedCandidacy.id,
            dropOutCandidacy.id,
            endedAccompagnementCandidacy.id,
          ].sort(),
        );
      });
    });

    describe("Admin", () => {
      test("should return only active candidacies", async () => {
        const organism = await createOrganismHelper();

        const activeCandidacy = await createCandidacyHelper({
          candidacyArgs: { organismId: organism.id },
        });

        await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.ARCHIVE,
          candidacyArgs: { organismId: organism.id },
        });

        const dropOutCandidacy = await createCandidacyHelper({
          candidacyArgs: { organismId: organism.id },
        });
        await createCandidacyDropOutHelper({
          candidacyId: dropOutCandidacy.id,
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus:
              EndAccompagnementStatus.CONFIRMED_BY_CANDIDATE,
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
          userRole: "admin",
          input: {
            activeCandidacies: true,
            maisonMereAAPId: organism.maisonMereAAPId || undefined,
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          activeCandidacy.id,
        );
      });
    });
  });

  describe("VAE collective", () => {
    describe("AAP", () => {
      test("should return a list of candidacies when searching with a valid vae collective cohorte id", async () => {
        const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

        const candidacy = await createCandidacyHelper({
          candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            candidacy.organism?.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            cohorteVaeCollectiveIds: [cohorteVaeCollective.id],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows.length).toBe(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          candidacy.id,
        );
      });

      test("should return an empty list of candidacies when searching with the wrong vae collective cohorte id", async () => {
        const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

        const candidacy = await createCandidacyHelper({
          candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            candidacy.organism?.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            cohorteVaeCollectiveIds: [uuidv4()],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows.length).toBe(0);
      });

      test("should return an empty list of candidacies when searching with a valid vae collective cohorte id but no candidacy is associated to the aap", async () => {
        const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

        await createCandidacyHelper({
          candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
        });

        const secondOrganism = await createOrganismHelper();

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            secondOrganism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            cohorteVaeCollectiveIds: [cohorteVaeCollective.id],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows.length).toBe(0);
      });

      test("should return candidacies matching any of the provided vae collective cohorte ids", async () => {
        const firstCohorte = await createCohorteVaeCollectiveHelper();
        const secondCohorte = await createCohorteVaeCollectiveHelper();

        const organism = await createOrganismHelper();

        const firstCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            cohorteVaeCollectiveId: firstCohorte.id,
          },
        });

        const secondCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            cohorteVaeCollectiveId: secondCohorte.id,
          },
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            cohorteVaeCollectiveId: (await createCohorteVaeCollectiveHelper())
              .id,
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            cohorteVaeCollectiveIds: [firstCohorte.id, secondCohorte.id],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(2);
        expect(
          resp.candidacy_getCandidaciesForAAP.rows.map(({ id }) => id).sort(),
        ).toEqual([firstCandidacy.id, secondCandidacy.id].sort());
      });
    });

    describe("Admin", () => {
      test("should return a list of candidacies when searching with a valid vae collective cohorte id", async () => {
        const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

        const candidacy = await createCandidacyHelper({
          candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
          userRole: "admin",
          input: {
            cohorteVaeCollectiveIds: [cohorteVaeCollective.id],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows.length).toBe(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          candidacy.id,
        );
      });
    });
  });

  describe("typeAccompagnementStatuses", () => {
    describe("Admin", () => {
      test("should return only AUTONOME candidacies", async () => {
        const organism = await createOrganismHelper();

        const autonomeCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            typeAccompagnement: "AUTONOME",
          },
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            typeAccompagnement: "ACCOMPAGNE",
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
          userRole: "admin",
          input: {
            typeAccompagnementStatuses: [
              TypeAccompagnementStatusFilter.AUTONOME,
            ],
            maisonMereAAPId: organism.maisonMereAAPId || undefined,
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          autonomeCandidacy.id,
        );
      });

      test("should return only ACCOMPAGNE candidacies", async () => {
        const organism = await createOrganismHelper();

        const accompagneCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            typeAccompagnement: "ACCOMPAGNE",
          },
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            typeAccompagnement: "AUTONOME",
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
          userRole: "admin",
          input: {
            typeAccompagnementStatuses: [
              TypeAccompagnementStatusFilter.ACCOMPAGNE,
            ],
            maisonMereAAPId: organism.maisonMereAAPId || undefined,
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          accompagneCandidacy.id,
        );
      });

      test("should return candidacies linked to a vae collective cohorte when filtering by VAE_COLLECTIVE", async () => {
        const organism = await createOrganismHelper();
        const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

        const vaeCollectiveCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            typeAccompagnement: "ACCOMPAGNE",
            cohorteVaeCollectiveId: cohorteVaeCollective.id,
          },
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            typeAccompagnement: "ACCOMPAGNE",
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
          userRole: "admin",
          input: {
            typeAccompagnementStatuses: [
              TypeAccompagnementStatusFilter.VAE_COLLECTIVE,
            ],
            maisonMereAAPId: organism.maisonMereAAPId || undefined,
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          vaeCollectiveCandidacy.id,
        );
      });

      test("should return candidacies matching any of the provided typeAccompagnementStatuses", async () => {
        const organism = await createOrganismHelper();
        const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

        const autonomeCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            typeAccompagnement: "AUTONOME",
          },
        });

        const vaeCollectiveCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            typeAccompagnement: "ACCOMPAGNE",
            cohorteVaeCollectiveId: cohorteVaeCollective.id,
          },
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            typeAccompagnement: "ACCOMPAGNE",
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
          userRole: "admin",
          input: {
            typeAccompagnementStatuses: [
              TypeAccompagnementStatusFilter.AUTONOME,
              TypeAccompagnementStatusFilter.VAE_COLLECTIVE,
            ],
            maisonMereAAPId: organism.maisonMereAAPId || undefined,
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(2);
        expect(
          resp.candidacy_getCandidaciesForAAP.rows.map(({ id }) => id).sort(),
        ).toEqual([autonomeCandidacy.id, vaeCollectiveCandidacy.id].sort());
      });
    });

    describe("AAP", () => {
      test("should ignore typeAccompagnementStatuses filter for non-admin users", async () => {
        const organism = await createOrganismHelper();

        const autonomeCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            typeAccompagnement: "AUTONOME",
          },
        });

        const accompagneCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            typeAccompagnement: "ACCOMPAGNE",
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            typeAccompagnementStatuses: [
              TypeAccompagnementStatusFilter.AUTONOME,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(2);
        expect(
          resp.candidacy_getCandidaciesForAAP.rows.map(({ id }) => id).sort(),
        ).toEqual([autonomeCandidacy.id, accompagneCandidacy.id].sort());
      });
    });
  });

  describe("trainingStatuses", () => {
    describe("AAP", () => {
      test("should return only PARCOURS_ENVOYE candidacies", async () => {
        const organism = await createOrganismHelper();

        const parcoursEnvoyeCandidacy = await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.PARCOURS_ENVOYE,
          candidacyArgs: { organismId: organism.id },
        });

        await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.PARCOURS_CONFIRME,
          candidacyArgs: { organismId: organism.id },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            trainingStatuses: [CandidacyStatusStep.PARCOURS_ENVOYE],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          parcoursEnvoyeCandidacy.id,
        );
      });

      test("should return only PARCOURS_CONFIRME candidacies", async () => {
        const organism = await createOrganismHelper();

        const parcoursConfirmeCandidacy = await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.PARCOURS_CONFIRME,
          candidacyArgs: { organismId: organism.id },
        });

        await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.PARCOURS_ENVOYE,
          candidacyArgs: { organismId: organism.id },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            trainingStatuses: [CandidacyStatusStep.PARCOURS_CONFIRME],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          parcoursConfirmeCandidacy.id,
        );
      });

      test("should return candidacies matching any of the provided trainingStatuses", async () => {
        const organism = await createOrganismHelper();

        const parcoursEnvoyeCandidacy = await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.PARCOURS_ENVOYE,
          candidacyArgs: { organismId: organism.id },
        });

        const parcoursConfirmeCandidacy = await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.PARCOURS_CONFIRME,
          candidacyArgs: { organismId: organism.id },
        });

        await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.PRISE_EN_CHARGE,
          candidacyArgs: { organismId: organism.id },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            trainingStatuses: [
              CandidacyStatusStep.PARCOURS_ENVOYE,
              CandidacyStatusStep.PARCOURS_CONFIRME,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(2);
        expect(
          resp.candidacy_getCandidaciesForAAP.rows.map(({ id }) => id).sort(),
        ).toEqual(
          [parcoursEnvoyeCandidacy.id, parcoursConfirmeCandidacy.id].sort(),
        );
      });

      test("should throw when filtering with an unauthorized training status", async () => {
        const organism = await createOrganismHelper();

        await expect(
          getCandidaciesForAAP({
            userKeycloakId:
              organism.organismOnAccounts[0].account.keycloakId || "",
            userRole: "manage_candidacy",
            input: {
              trainingStatuses: [CandidacyStatusStep.PRISE_EN_CHARGE],
            },
          }),
        ).rejects.toThrowError(
          "Le filtre training: 'PRISE_EN_CHARGE' n'est pas autorisé",
        );
      });
    });

    describe("Admin", () => {
      test("should return only PARCOURS_ENVOYE candidacies", async () => {
        const organism = await createOrganismHelper();

        const parcoursEnvoyeCandidacy = await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.PARCOURS_ENVOYE,
          candidacyArgs: { organismId: organism.id },
        });

        await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.PARCOURS_CONFIRME,
          candidacyArgs: { organismId: organism.id },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
          userRole: "admin",
          input: {
            trainingStatuses: [CandidacyStatusStep.PARCOURS_ENVOYE],
            maisonMereAAPId: organism.maisonMereAAPId || undefined,
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          parcoursEnvoyeCandidacy.id,
        );
      });
    });
  });

  describe("feasibilityStatuses", () => {
    describe("AAP", () => {
      test("should return only ENVOYE_AU_CANDIDAT candidacies", async () => {
        const organism = await createOrganismHelper();

        const envoyeAuCandidatCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            dematerializedFeasibilityFile: {
              sentToCandidateAt: new Date(),
              candidateConfirmationAt: null,
              swornStatementFileId: null,
            },
          });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          dematerializedFeasibilityFile: {
            sentToCandidateAt: new Date(),
            candidateConfirmationAt: new Date(),
            swornStatementFileId: null,
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            feasibilityStatuses: [FeasibilityStatusFilter.ENVOYE_AU_CANDIDAT],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          envoyeAuCandidatCandidacy.id,
        );
      });

      test("should return ENVOYE_AU_CANDIDAT candidacies with incomplete DFF resent to candidate", async () => {
        const organism = await createOrganismHelper();

        const incompleteResentToCandidateCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.INCOMPLETE,
            decisionSentAt: TWO_DAYS_AGO,
            dematerializedFeasibilityFile: {
              sentToCandidateAt: new Date(),
              candidateConfirmationAt: null,
              swornStatementFileId: null,
            },
          });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          decision: FeasibilityStatus.INCOMPLETE,
          decisionSentAt: TWO_DAYS_AGO,
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            feasibilityStatuses: [FeasibilityStatusFilter.ENVOYE_AU_CANDIDAT],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          incompleteResentToCandidateCandidacy.id,
        );
      });

      test("should return only PARTIELLEMENT_VALIDE_PAR_LE_CANDIDAT candidacies", async () => {
        const organism = await createOrganismHelper();

        const partiellementValideCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            dematerializedFeasibilityFile: {
              candidateConfirmationAt: new Date(),
              swornStatementFileId: null,
            },
          });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          dematerializedFeasibilityFile: {
            sentToCandidateAt: new Date(),
            candidateConfirmationAt: null,
            swornStatementFileId: null,
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            feasibilityStatuses: [
              FeasibilityStatusFilter.PARTIELLEMENT_VALIDE_PAR_LE_CANDIDAT,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          partiellementValideCandidacy.id,
        );
      });

      test("should return PARTIELLEMENT_VALIDE_PAR_LE_CANDIDAT candidacies with incomplete DFF partially confirmed by candidate", async () => {
        const organism = await createOrganismHelper();

        const incompletePartiallyConfirmedCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.INCOMPLETE,
            decisionSentAt: TWO_DAYS_AGO,
            dematerializedFeasibilityFile: {
              candidateConfirmationAt: new Date(),
              swornStatementFileId: null,
            },
          });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          decision: FeasibilityStatus.INCOMPLETE,
          decisionSentAt: TWO_DAYS_AGO,
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            feasibilityStatuses: [
              FeasibilityStatusFilter.PARTIELLEMENT_VALIDE_PAR_LE_CANDIDAT,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          incompletePartiallyConfirmedCandidacy.id,
        );
      });

      test("should return only VALIDE_PAR_LE_CANDIDAT candidacies", async () => {
        const organism = await createOrganismHelper();
        const swornStatementFile = await createFileHelper();

        const valideParLeCandidatCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            dematerializedFeasibilityFile: {
              candidateConfirmationAt: new Date(),
              swornStatementFileId: swornStatementFile.id,
            },
          });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          dematerializedFeasibilityFile: {
            candidateConfirmationAt: new Date(),
            swornStatementFileId: null,
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            feasibilityStatuses: [
              FeasibilityStatusFilter.VALIDE_PAR_LE_CANDIDAT,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          valideParLeCandidatCandidacy.id,
        );
      });

      test("should return VALIDE_PAR_LE_CANDIDAT candidacies with incomplete DFF confirmed by candidate", async () => {
        const organism = await createOrganismHelper();
        const swornStatementFile = await createFileHelper();

        const incompleteConfirmedCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.INCOMPLETE,
            decisionSentAt: TWO_DAYS_AGO,
            dematerializedFeasibilityFile: {
              candidateConfirmationAt: new Date(),
              swornStatementFileId: swornStatementFile.id,
            },
          });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          decision: FeasibilityStatus.INCOMPLETE,
          decisionSentAt: TWO_DAYS_AGO,
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            feasibilityStatuses: [
              FeasibilityStatusFilter.VALIDE_PAR_LE_CANDIDAT,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          incompleteConfirmedCandidacy.id,
        );
      });

      test("should return only ENVOYE_AU_CERTIFICATEUR candidacies", async () => {
        const organism = await createOrganismHelper();

        const envoyeAuCertificateurCandidacy = await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
          candidacyArgs: { organismId: organism.id },
        });

        await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.PARCOURS_CONFIRME,
          candidacyArgs: { organismId: organism.id },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            feasibilityStatuses: [
              FeasibilityStatusFilter.ENVOYE_AU_CERTIFICATEUR,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          envoyeAuCertificateurCandidacy.id,
        );
      });

      test("should return only INCOMPLET candidacies", async () => {
        const organism = await createOrganismHelper();

        const incompletCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.INCOMPLETE,
          });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            feasibilityStatuses: [FeasibilityStatusFilter.INCOMPLET],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          incompletCandidacy.id,
        );
      });

      test("should not return INCOMPLET candidacies whose incomplete DFF has been resent or confirmed by the candidate", async () => {
        const organism = await createOrganismHelper();
        const swornStatementFile = await createFileHelper();

        const incompletCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.INCOMPLETE,
            decisionSentAt: TWO_DAYS_AGO,
          });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          decision: FeasibilityStatus.INCOMPLETE,
          decisionSentAt: TWO_DAYS_AGO,
          dematerializedFeasibilityFile: {
            sentToCandidateAt: new Date(),
            candidateConfirmationAt: null,
            swornStatementFileId: null,
          },
        });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          decision: FeasibilityStatus.INCOMPLETE,
          decisionSentAt: TWO_DAYS_AGO,
          dematerializedFeasibilityFile: {
            candidateConfirmationAt: new Date(),
            swornStatementFileId: null,
          },
        });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          decision: FeasibilityStatus.INCOMPLETE,
          decisionSentAt: TWO_DAYS_AGO,
          dematerializedFeasibilityFile: {
            candidateConfirmationAt: new Date(),
            swornStatementFileId: swornStatementFile.id,
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            feasibilityStatuses: [FeasibilityStatusFilter.INCOMPLET],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          incompletCandidacy.id,
        );
      });

      test("should return only RECEVABLE candidacies", async () => {
        const organism = await createOrganismHelper();

        const receivableCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          decision: FeasibilityStatus.INCOMPLETE,
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            feasibilityStatuses: [FeasibilityStatusFilter.RECEVABLE],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          receivableCandidacy.id,
        );
      });

      test("should return candidacies matching any of the provided feasibilityStatuses", async () => {
        const organism = await createOrganismHelper();

        const envoyeAuCandidatCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            dematerializedFeasibilityFile: {
              sentToCandidateAt: new Date(),
              candidateConfirmationAt: null,
              swornStatementFileId: null,
            },
          });

        const receivableCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          decision: FeasibilityStatus.INCOMPLETE,
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            feasibilityStatuses: [
              FeasibilityStatusFilter.ENVOYE_AU_CANDIDAT,
              FeasibilityStatusFilter.RECEVABLE,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(2);
        expect(
          resp.candidacy_getCandidaciesForAAP.rows.map(({ id }) => id).sort(),
        ).toEqual(
          [envoyeAuCandidatCandidacy.id, receivableCandidacy.id].sort(),
        );
      });
    });

    describe("Admin", () => {
      test("should return only RECEVABLE candidacies", async () => {
        const organism = await createOrganismHelper();

        const receivableCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          decision: FeasibilityStatus.INCOMPLETE,
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
          userRole: "admin",
          input: {
            feasibilityStatuses: [FeasibilityStatusFilter.RECEVABLE],
            maisonMereAAPId: organism.maisonMereAAPId || undefined,
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          receivableCandidacy.id,
        );
      });
    });
  });

  describe("dossierDeValidationStatuses", () => {
    describe("AAP", () => {
      test("should return only TRANSMETTRE candidacies", async () => {
        const organism = await createOrganismHelper();

        const transmettreCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });

        const envoyeCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createDossierDeValidationHelper({
          candidacyId: envoyeCandidacy.id,
          decision: "PENDING",
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            dossierDeValidationStatuses: [
              DossierDeValidationStatusFilter.TRANSMETTRE,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          transmettreCandidacy.id,
        );
      });

      test("should return only ENVOYE candidacies", async () => {
        const organism = await createOrganismHelper();

        const envoyeCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createDossierDeValidationHelper({
          candidacyId: envoyeCandidacy.id,
          decision: "PENDING",
        });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            dossierDeValidationStatuses: [
              DossierDeValidationStatusFilter.ENVOYE,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          envoyeCandidacy.id,
        );
      });

      test("should return only SIGNALE candidacies", async () => {
        const organism = await createOrganismHelper();

        const signaleCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createDossierDeValidationHelper({
          candidacyId: signaleCandidacy.id,
          decision: "INCOMPLETE",
        });

        const envoyeCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createDossierDeValidationHelper({
          candidacyId: envoyeCandidacy.id,
          decision: "PENDING",
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            dossierDeValidationStatuses: [
              DossierDeValidationStatusFilter.SIGNALE,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          signaleCandidacy.id,
        );
      });

      test("should return candidacies matching any of the provided dossierDeValidationStatuses", async () => {
        const organism = await createOrganismHelper();

        const transmettreCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });

        const signaleCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createDossierDeValidationHelper({
          candidacyId: signaleCandidacy.id,
          decision: "INCOMPLETE",
        });

        const envoyeCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createDossierDeValidationHelper({
          candidacyId: envoyeCandidacy.id,
          decision: "PENDING",
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            dossierDeValidationStatuses: [
              DossierDeValidationStatusFilter.TRANSMETTRE,
              DossierDeValidationStatusFilter.SIGNALE,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(2);
        expect(
          resp.candidacy_getCandidaciesForAAP.rows.map(({ id }) => id).sort(),
        ).toEqual([transmettreCandidacy.id, signaleCandidacy.id].sort());
      });
    });
  });

  describe("juryStatuses", () => {
    describe("AAP", () => {
      test("should return only TO_SCHEDULE candidacies", async () => {
        const organism = await createOrganismHelper();

        const toScheduleCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createDossierDeValidationHelper({
          candidacyId: toScheduleCandidacy.id,
          decision: "PENDING",
        });

        const scheduledCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createDossierDeValidationHelper({
          candidacyId: scheduledCandidacy.id,
          decision: "PENDING",
        });
        await createJuryHelper({
          candidacyId: scheduledCandidacy.id,
          dateOfSession: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            juryStatuses: [JuryStatusFilter.TO_SCHEDULE],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          toScheduleCandidacy.id,
        );
      });

      test("should return only SCHEDULED candidacies", async () => {
        const organism = await createOrganismHelper();

        const scheduledCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createJuryHelper({
          candidacyId: scheduledCandidacy.id,
          dateOfSession: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        const passedCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createJuryHelper({
          candidacyId: passedCandidacy.id,
          dateOfSession: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            juryStatuses: [JuryStatusFilter.SCHEDULED],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          scheduledCandidacy.id,
        );
      });

      test("should return only PASSED candidacies", async () => {
        const organism = await createOrganismHelper();

        const passedCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createJuryHelper({
          candidacyId: passedCandidacy.id,
          dateOfSession: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        });

        const scheduledCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createJuryHelper({
          candidacyId: scheduledCandidacy.id,
          dateOfSession: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            juryStatuses: [JuryStatusFilter.PASSED],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          passedCandidacy.id,
        );
      });
    });
  });

  describe("juryResults", () => {
    describe("AAP", () => {
      test("should return only candidacies with the provided jury result", async () => {
        const organism = await createOrganismHelper();

        const fullSuccessCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createJuryHelper({
          candidacyId: fullSuccessCandidacy.id,
          dateOfSession: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          result: "FULL_SUCCESS_OF_FULL_CERTIFICATION",
        });

        const failureCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createJuryHelper({
          candidacyId: failureCandidacy.id,
          dateOfSession: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          result: "FAILURE",
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            juryResults: ["FULL_SUCCESS_OF_FULL_CERTIFICATION"],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          fullSuccessCandidacy.id,
        );
      });

      test("should return only AWAITING_RESULT candidacies", async () => {
        const organism = await createOrganismHelper();

        const awaitingResultCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createJuryHelper({
          candidacyId: awaitingResultCandidacy.id,
          dateOfSession: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          result: null,
        });

        const futureSessionCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          });
        await createJuryHelper({
          candidacyId: futureSessionCandidacy.id,
          dateOfSession: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          result: null,
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            juryResults: ["AWAITING_RESULT"],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          awaitingResultCandidacy.id,
        );
      });
    });
  });

  describe("fundingStatuses", () => {
    describe("AAP", () => {
      test("should return only FVAE_FINANCEMENT candidacies", async () => {
        const organism = await createOrganismHelper();

        const fvaeCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            financeModule: "unifvae",
          },
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            financeModule: "hors_plateforme",
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            fundingStatuses: [FundingStatusFilter.FVAE_FINANCEMENT],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          fvaeCandidacy.id,
        );
      });

      test("should return only FVAE_DEMANDE_PAIEMENT_A_ENVOYER candidacies", async () => {
        const organism = await createOrganismHelper();

        const demandePaiementAEnvoyerCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            financeModule: "unifvae",
          },
        });
        await createFundingRequestUnifvaeHelper({
          candidacyId: demandePaiementAEnvoyerCandidacy.id,
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            financeModule: "unifvae",
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            fundingStatuses: [
              FundingStatusFilter.FVAE_DEMANDE_PAIEMENT_A_ENVOYER,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          demandePaiementAEnvoyerCandidacy.id,
        );
      });

      test("should return only FVAE_DEMANDE_PAIEMENT_ENVOYEE candidacies", async () => {
        const organism = await createOrganismHelper();

        const demandePaiementEnvoyeeCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            financeModule: "unifvae",
          },
        });
        await createPaymentRequestUnifvaeHelper({
          candidacyId: demandePaiementEnvoyeeCandidacy.id,
          confirmedAt: new Date(),
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            financeModule: "unifvae",
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            fundingStatuses: [
              FundingStatusFilter.FVAE_DEMANDE_PAIEMENT_ENVOYEE,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          demandePaiementEnvoyeeCandidacy.id,
        );
      });
    });
  });

  describe("archiveStatuses", () => {
    describe("AAP", () => {
      test("should return only NON_RECEVABLE candidacies", async () => {
        const organism = await createOrganismHelper();

        const nonRecevableCandidacy =
          await createCandidacyWithDematerializedFeasibility({
            organismId: organism.id,
            decision: FeasibilityStatus.REJECTED,
          });

        await createCandidacyWithDematerializedFeasibility({
          organismId: organism.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            archiveStatuses: [ArchiveStatusFilter.NON_RECEVABLE],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          nonRecevableCandidacy.id,
        );
      });

      test("should return ARCHIVE candidacies by status", async () => {
        const organism = await createOrganismHelper();

        const archivedCandidacy = await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.ARCHIVE,
          candidacyArgs: { organismId: organism.id },
        });

        await createCandidacyHelper({
          candidacyActiveStatus: CandidacyStatusStep.PARCOURS_CONFIRME,
          candidacyArgs: { organismId: organism.id },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            archiveStatuses: [ArchiveStatusFilter.ARCHIVE],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          archivedCandidacy.id,
        );
      });

      test("should return ARCHIVE candidacies by drop out", async () => {
        const organism = await createOrganismHelper();

        const dropOutCandidacy = await createCandidacyHelper({
          candidacyArgs: { organismId: organism.id },
        });
        await createCandidacyDropOutHelper({
          candidacyId: dropOutCandidacy.id,
        });

        await createCandidacyHelper({
          candidacyArgs: { organismId: organism.id },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            archiveStatuses: [ArchiveStatusFilter.ARCHIVE],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          dropOutCandidacy.id,
        );
      });
    });
  });

  describe("accompagnementStatuses", () => {
    describe("AAP", () => {
      test("should return only EN_COURS candidacies", async () => {
        const organism = await createOrganismHelper();

        const enCoursCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus: EndAccompagnementStatus.NOT_REQUESTED,
          },
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus:
              EndAccompagnementStatus.CONFIRMED_BY_CANDIDATE,
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            accompagnementStatuses: [AccompagnementStatusFilter.EN_COURS],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          enCoursCandidacy.id,
        );
      });

      test("should return only TERMINE candidacies", async () => {
        const organism = await createOrganismHelper();

        const termineCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus:
              EndAccompagnementStatus.CONFIRMED_BY_CANDIDATE,
          },
        });

        await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus: EndAccompagnementStatus.NOT_REQUESTED,
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            accompagnementStatuses: [AccompagnementStatusFilter.TERMINE],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(1);
        expect(resp.candidacy_getCandidaciesForAAP.rows[0].id).toBe(
          termineCandidacy.id,
        );
      });

      test("should return candidacies matching any of the provided accompagnementStatuses", async () => {
        const organism = await createOrganismHelper();

        const enCoursCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus: EndAccompagnementStatus.PENDING,
          },
        });

        const termineCandidacy = await createCandidacyHelper({
          candidacyArgs: {
            organismId: organism.id,
            endAccompagnementStatus: EndAccompagnementStatus.CONFIRMED_BY_ADMIN,
          },
        });

        const resp = await getCandidaciesForAAP({
          userKeycloakId:
            organism.organismOnAccounts[0].account.keycloakId || "",
          userRole: "manage_candidacy",
          input: {
            accompagnementStatuses: [
              AccompagnementStatusFilter.EN_COURS,
              AccompagnementStatusFilter.TERMINE,
            ],
          },
        });

        expect(resp.candidacy_getCandidaciesForAAP.rows).toHaveLength(2);
        expect(
          resp.candidacy_getCandidaciesForAAP.rows.map(({ id }) => id).sort(),
        ).toEqual([enCoursCandidacy.id, termineCandidacy.id].sort());
      });
    });
  });
});
