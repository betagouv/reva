import {
  CandidacyStatusStep,
  DossierDeValidationStatus,
  FeasibilityStatus,
} from "@prisma/client";

import { prismaClient } from "@/prisma/client";
import { createCandidacyDropOutHelper } from "@/test/helpers/entities/create-candidacy-drop-out-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createDossierDeValidationHelper } from "@/test/helpers/entities/create-dossier-de-validation-helper";
import { createFeasibilityUploadedPdfHelper } from "@/test/helpers/entities/create-feasibility-uploaded-pdf-helper";
import { createJuryHelper } from "@/test/helpers/entities/create-jury-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";

import { getCandidaciesForCertificationAuthority } from "./getCandidaciesForCertificationAuthority";

type ManageableCertificationAuthority = Awaited<
  ReturnType<typeof createCertificationAuthorityHelper>
>;

const buildContext = ({
  roles = [],
  sub = "keycloak-id",
}: {
  roles?: KeyCloakUserRole[];
  sub?: string;
} = {}): GraphqlContext => ({
  auth: {
    hasRole: (role) => roles.includes(role),
    userInfo: {
      sub,
      email: "user@example.com",
      email_verified: true,
      preferred_username: "user",
      realm_access: { roles },
    },
  },
  app: { keycloak: {} as any },
});

const createContextForCertificationAuthority = (
  certificationAuthority: ManageableCertificationAuthority,
): GraphqlContext =>
  buildContext({
    roles: ["manage_feasibility"],
    sub: certificationAuthority.account.keycloakId,
  });

const setupCertificationAuthority = async () => {
  const certificationAuthority = await createCertificationAuthorityHelper();
  const context = createContextForCertificationAuthority(
    certificationAuthority,
  );
  return { certificationAuthority, context };
};

const createFeasibilityCandidacyForCA = async ({
  certificationAuthorityId,
  decision = FeasibilityStatus.PENDING,
  status = CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
}: {
  certificationAuthorityId: string;
  decision?: FeasibilityStatus;
  status?: CandidacyStatusStep;
}) => {
  const feasibility = await createFeasibilityUploadedPdfHelper(
    {
      certificationAuthorityId,
      decision,
    },
    status,
  );
  return feasibility.candidacy;
};

const createDossierDeValidationCandidacyForCA = async ({
  certificationAuthorityId,
  candidacyStatus,
  dossierDeValidationDecision,
}: {
  certificationAuthorityId: string;
  candidacyStatus: CandidacyStatusStep;
  dossierDeValidationDecision: DossierDeValidationStatus;
}) => {
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: candidacyStatus,
  });

  await prismaClient.feasibility.create({
    data: {
      candidacyId: candidacy.id,
      certificationAuthorityId,
    },
  });

  await createDossierDeValidationHelper({
    candidacyId: candidacy.id,
    certificationAuthorityId,
    decision: dossierDeValidationDecision,
  });

  return candidacy;
};

const addJuryForCandidacy = async ({
  candidacyId,
  certificationAuthorityId,
  dateOfSession = new Date(),
  isActive = true,
  result,
}: {
  candidacyId: string;
  certificationAuthorityId: string;
  dateOfSession?: Date;
  isActive?: boolean;
  result?: string | null;
}) =>
  createJuryHelper({
    candidacyId,
    certificationAuthorityId,
    dateOfSession,
    isActive,
    result,
  });

describe("getCandidaciesForCertificationAuthority", () => {
  describe("Filtres de statut faisabilité", () => {
    let certificationAuthority: ManageableCertificationAuthority;
    let context: GraphqlContext;

    const FEASIBILITY_STATUSES = [
      {
        status: CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
        decision: FeasibilityStatus.PENDING,
      },
      {
        status: CandidacyStatusStep.DOSSIER_FAISABILITE_COMPLET,
        decision: FeasibilityStatus.COMPLETE,
      },
      {
        status: CandidacyStatusStep.DOSSIER_FAISABILITE_INCOMPLET,
        decision: FeasibilityStatus.INCOMPLETE,
      },
      {
        status: CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
        decision: FeasibilityStatus.ADMISSIBLE,
      },
      {
        status: CandidacyStatusStep.DOSSIER_FAISABILITE_NON_RECEVABLE,
        decision: FeasibilityStatus.REJECTED,
      },
    ] as const;

    beforeEach(async () => {
      ({ certificationAuthority, context } =
        await setupCertificationAuthority());
    });

    test.each(FEASIBILITY_STATUSES)(
      "filtre les candidatures sur le statut de faisabilité $status",
      async ({
        status,
        decision,
      }: {
        status: CandidacyStatusStep;
        decision: FeasibilityStatus;
      }) => {
        const feasibility = await createFeasibilityUploadedPdfHelper(
          {
            certificationAuthorityId: certificationAuthority.id,
            decision,
          },
          status,
        );

        const differentConfig =
          FEASIBILITY_STATUSES.find((s) => s.status !== status) ??
          FEASIBILITY_STATUSES[0];

        await createFeasibilityUploadedPdfHelper(
          {
            certificationAuthorityId: certificationAuthority.id,
            decision: differentConfig.decision,
          },
          differentConfig.status,
        );

        const result = await getCandidaciesForCertificationAuthority({
          context,
          feasibilityStatuses: [status],
        });

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].id).toBe(feasibility.candidacy.id);
        expect(result.rows[0].status).toBe(status);
      },
    );

    test("applique une logique OU entre plusieurs statuts de faisabilité", async () => {
      const feasibility1 = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );
      const feasibility2 = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );
      // Créer une candidature qui ne devrait pas matcher
      await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.INCOMPLETE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_INCOMPLET,
      );

      const result = await getCandidaciesForCertificationAuthority({
        context,
        feasibilityStatuses: [
          CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
          CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
        ],
      });

      expect(result.rows).toHaveLength(2);
      expect(result.rows.some((c) => c.id === feasibility1.candidacy.id)).toBe(
        true,
      );
      expect(result.rows.some((c) => c.id === feasibility2.candidacy.id)).toBe(
        true,
      );
    });

    test("n'inclut pas les candidatures d'autres certificateurs même avec un filtre de faisabilité", async () => {
      const otherCertificationAuthority =
        await createCertificationAuthorityHelper();

      const feasibilityOwn = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: otherCertificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      const result = await getCandidaciesForCertificationAuthority({
        context,
        feasibilityStatuses: [CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE],
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(feasibilityOwn.candidacy.id);
    });
  });

  describe("Filtres de statut validation", () => {
    let certificationAuthority: ManageableCertificationAuthority;
    let context: GraphqlContext;

    const VALIDATION_STATUSES = [
      {
        status: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
        decision: DossierDeValidationStatus.PENDING,
      },
      {
        status: CandidacyStatusStep.DOSSIER_DE_VALIDATION_SIGNALE,
        decision: DossierDeValidationStatus.INCOMPLETE,
      },
    ] as const;

    beforeEach(async () => {
      ({ certificationAuthority, context } =
        await setupCertificationAuthority());
    });

    test.each(VALIDATION_STATUSES)(
      "filtre les candidatures sur le statut de validation $status",
      async ({
        status,
        decision,
      }: {
        status: CandidacyStatusStep;
        decision: DossierDeValidationStatus;
      }) => {
        const candidacy = await createCandidacyHelper({
          candidacyActiveStatus: status,
        });

        // Créer la feasibility pour que la candidature soit incluse dans les résultats
        await prismaClient.feasibility.create({
          data: {
            candidacyId: candidacy.id,
            certificationAuthorityId: certificationAuthority.id,
          },
        });

        // Créer le dossier de validation avec la bonne décision
        await createDossierDeValidationHelper({
          candidacyId: candidacy.id,
          certificationAuthorityId: certificationAuthority.id,
          decision,
        });

        const result = await getCandidaciesForCertificationAuthority({
          context,
          validationStatuses: [status],
        });

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].id).toBe(candidacy.id);
        expect(result.rows[0].status).toBe(status);
      },
    );

    test("applique une logique OU entre plusieurs statuts de validation", async () => {
      const candidacy1 = await createCandidacyHelper({
        candidacyActiveStatus: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
      });
      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacy1.id,
          certificationAuthorityId: certificationAuthority.id,
        },
      });
      await createDossierDeValidationHelper({
        candidacyId: candidacy1.id,
        certificationAuthorityId: certificationAuthority.id,
        decision: DossierDeValidationStatus.PENDING,
      });

      const candidacy2 = await createCandidacyHelper({
        candidacyActiveStatus:
          CandidacyStatusStep.DOSSIER_DE_VALIDATION_SIGNALE,
      });
      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacy2.id,
          certificationAuthorityId: certificationAuthority.id,
        },
      });
      await createDossierDeValidationHelper({
        candidacyId: candidacy2.id,
        certificationAuthorityId: certificationAuthority.id,
        decision: DossierDeValidationStatus.INCOMPLETE,
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        validationStatuses: [
          CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
          CandidacyStatusStep.DOSSIER_DE_VALIDATION_SIGNALE,
        ],
      });

      expect(result.rows).toHaveLength(2);
    });

    test("n'inclut pas les dossiers de validation d'autres certificateurs même avec un filtre de validation", async () => {
      const otherCertificationAuthority =
        await createCertificationAuthorityHelper();

      const candidacyOwn = await createCandidacyHelper({
        candidacyActiveStatus: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
      });
      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacyOwn.id,
          certificationAuthorityId: certificationAuthority.id,
        },
      });
      await createDossierDeValidationHelper({
        candidacyId: candidacyOwn.id,
        certificationAuthorityId: certificationAuthority.id,
        decision: DossierDeValidationStatus.PENDING,
      });

      const candidacyOther = await createCandidacyHelper({
        candidacyActiveStatus: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
      });
      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacyOther.id,
          certificationAuthorityId: otherCertificationAuthority.id,
        },
      });
      await createDossierDeValidationHelper({
        candidacyId: candidacyOther.id,
        certificationAuthorityId: otherCertificationAuthority.id,
        decision: DossierDeValidationStatus.PENDING,
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        validationStatuses: [CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE],
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(candidacyOwn.id);
    });
  });

  describe("Jury Status Filters", () => {
    let certificationAuthority: ManageableCertificationAuthority;
    let context: GraphqlContext;

    beforeEach(async () => {
      ({ certificationAuthority, context } =
        await setupCertificationAuthority());
    });

    test("filtre les candidatures avec le statut jury TO_SCHEDULE (DV envoyé sans jury actif)", async () => {
      const candidacy = await createCandidacyHelper({
        candidacyActiveStatus: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
      });
      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacy.id,
          certificationAuthorityId: certificationAuthority.id,
        },
      });

      // Candidature avec jury actif (ne doit pas matcher)
      const candidacy2 = await createCandidacyHelper({
        candidacyActiveStatus: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
      });
      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacy2.id,
          certificationAuthorityId: certificationAuthority.id,
        },
      });
      await createJuryHelper({
        candidacyId: candidacy2.id,
        certificationAuthorityId: certificationAuthority.id,
        dateOfSession: new Date(),
        isActive: true,
      });

      // Statut différent sans jury (ne doit pas matcher)
      await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );

      const result = await getCandidaciesForCertificationAuthority({
        context,
        juryStatuses: ["TO_SCHEDULE"],
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(candidacy.id);
    });

    test("filtre les candidatures avec le statut jury SCHEDULED (jury actif à venir)", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const scheduled = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );
      await createJuryHelper({
        candidacyId: scheduled.candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
        dateOfSession: futureDate,
        isActive: true,
      });

      // Jury passé (ne doit pas matcher)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      const pastJury = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );
      await createJuryHelper({
        candidacyId: pastJury.candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
        dateOfSession: pastDate,
        isActive: true,
      });

      // Jury futur mais inactif (ne doit pas matcher)
      const inactiveJury = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );
      await createJuryHelper({
        candidacyId: inactiveJury.candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
        dateOfSession: futureDate,
        isActive: false,
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        juryStatuses: ["SCHEDULED"],
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(scheduled.candidacy.id);
    });

    test("applique une logique OU entre plusieurs statuts de jury", async () => {
      const candidacy1 = await createCandidacyHelper({
        candidacyActiveStatus: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
      });
      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacy1.id,
          certificationAuthorityId: certificationAuthority.id,
        },
      });

      const scheduled = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      await createJuryHelper({
        candidacyId: scheduled.candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
        dateOfSession: futureDate,
        isActive: true,
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        juryStatuses: ["TO_SCHEDULE", "SCHEDULED"],
      });

      expect(result.rows).toHaveLength(2);
      expect(result.rows.some((c) => c.id === candidacy1.id)).toBe(true);
      expect(result.rows.some((c) => c.id === scheduled.candidacy.id)).toBe(
        true,
      );
    });

    test("n'inclut que les jurys actifs dans les filtres de statut de jury", async () => {
      const candidacy = await createCandidacyHelper({
        candidacyActiveStatus: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
      });
      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacy.id,
          certificationAuthorityId: certificationAuthority.id,
        },
      });

      // Jury inactif - la candidature devrait matcher TO_SCHEDULE
      await createJuryHelper({
        candidacyId: candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
        dateOfSession: new Date(),
        isActive: false,
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        juryStatuses: ["TO_SCHEDULE"],
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(candidacy.id);
    });
  });

  describe("Jury Result Filters", () => {
    let certificationAuthority: ManageableCertificationAuthority;
    let context: GraphqlContext;

    beforeEach(async () => {
      ({ certificationAuthority, context } =
        await setupCertificationAuthority());
    });

    test.each([
      "FULL_SUCCESS_OF_FULL_CERTIFICATION",
      "FULL_SUCCESS_OF_PARTIAL_CERTIFICATION",
      "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION",
      "PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION",
      "PARTIAL_SUCCESS_PENDING_CONFIRMATION",
      "FAILURE",
      "CANDIDATE_EXCUSED",
      "CANDIDATE_ABSENT",
    ] as const)(
      "filtre les candidatures pour le résultat de jury %s",
      async (
        juryResult:
          | "FULL_SUCCESS_OF_FULL_CERTIFICATION"
          | "FULL_SUCCESS_OF_PARTIAL_CERTIFICATION"
          | "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION"
          | "PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION"
          | "PARTIAL_SUCCESS_PENDING_CONFIRMATION"
          | "FAILURE"
          | "CANDIDATE_EXCUSED"
          | "CANDIDATE_ABSENT",
      ) => {
        const feasibility = await createFeasibilityUploadedPdfHelper(
          {
            certificationAuthorityId: certificationAuthority.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          },
          CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
        );

        await createJuryHelper({
          candidacyId: feasibility.candidacy.id,
          certificationAuthorityId: certificationAuthority.id,
          dateOfSession: new Date(),
          dateOfResult: new Date(),
          result: juryResult,
          isActive: true,
        });

        // Créer une autre candidature avec un résultat différent
        await createFeasibilityUploadedPdfHelper(
          {
            certificationAuthorityId: certificationAuthority.id,
            decision: FeasibilityStatus.ADMISSIBLE,
          },
          CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
        );

        const result = await getCandidaciesForCertificationAuthority({
          context,
          juryResults: [juryResult],
        });

        expect(result.rows.some((c) => c.id === feasibility.candidacy.id)).toBe(
          true,
        );
      },
    );

    test("applique une logique OU entre plusieurs résultats de jury", async () => {
      const feasibility1 = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );
      await createJuryHelper({
        candidacyId: feasibility1.candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
        result: "FULL_SUCCESS_OF_FULL_CERTIFICATION",
        isActive: true,
      });

      const feasibility2 = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );
      await createJuryHelper({
        candidacyId: feasibility2.candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
        result: "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION",
        isActive: true,
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        juryResults: [
          "FULL_SUCCESS_OF_FULL_CERTIFICATION",
          "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION",
        ],
      });

      expect(result.rows).toHaveLength(2);
    });

    test("filtre les candidatures avec AWAITING_RESULT (session passée sans résultat)", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      // Candidature avec session passée (doit matcher)
      const feasibility = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );

      await createJuryHelper({
        candidacyId: feasibility.candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
        dateOfSession: pastDate,
        result: null,
        isActive: true,
      });

      // Candidature avec session future (ne doit pas matcher)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const feasibility2 = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );
      await createJuryHelper({
        candidacyId: feasibility2.candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
        dateOfSession: futureDate,
        result: null,
        isActive: true,
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        juryResults: ["AWAITING_RESULT"],
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(feasibility.candidacy.id);
    });

    test("n'inclut que les jurys actifs dans les filtres de résultat", async () => {
      const feasibility = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );

      await createJuryHelper({
        candidacyId: feasibility.candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
        result: "FULL_SUCCESS_OF_FULL_CERTIFICATION",
        isActive: false,
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        juryResults: ["FULL_SUCCESS_OF_FULL_CERTIFICATION"],
      });

      expect(result.rows).toHaveLength(0);
    });
  });

  describe("Include Dropouts Filter", () => {
    let certificationAuthority: ManageableCertificationAuthority;
    let context: GraphqlContext;

    beforeEach(async () => {
      ({ certificationAuthority, context } =
        await setupCertificationAuthority());
    });

    test("exclut les abandons par défaut (includeDropouts = false)", async () => {
      const feasibility = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      const candidacyDropOut = await createCandidacyDropOutHelper();
      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacyDropOut.candidacy.id,
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
      });
      await prismaClient.candidacy.update({
        where: { id: candidacyDropOut.candidacy.id },
        data: { status: CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE },
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        includeDropouts: false,
      });

      expect(
        result.rows.every((c) => c.id !== candidacyDropOut.candidacy.id),
      ).toBe(true);
      expect(result.rows.some((c) => c.id === feasibility.candidacy.id)).toBe(
        true,
      );
    });

    test("inclut les abandons lorsque includeDropouts = true", async () => {
      const candidacyDropOut = await createCandidacyDropOutHelper();
      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacyDropOut.candidacy.id,
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
      });
      await prismaClient.candidacy.update({
        where: { id: candidacyDropOut.candidacy.id },
        data: { status: CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE },
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        includeDropouts: true,
      });

      expect(
        result.rows.some((c) => c.id === candidacyDropOut.candidacy.id),
      ).toBe(true);
    });

    test("inclut les abandons avec includeDropouts = true même avec un statusFilter", async () => {
      // Créer une candidature normale (sans abandon)
      const normalFeasibility = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      // Créer une candidature avec abandon
      const candidacyDropOut = await createCandidacyDropOutHelper();
      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacyDropOut.candidacy.id,
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
      });
      await prismaClient.candidacy.update({
        where: { id: candidacyDropOut.candidacy.id },
        data: { status: CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE },
      });

      // Test avec statusFilter DOSSIER_FAISABILITE_ENVOYE_HORS_ABANDON
      // Ce statusFilter exclut normalement les abandons, mais includeDropouts=true devrait surcharger cela
      const resultWithFilter = await getCandidaciesForCertificationAuthority({
        context,
        statusFilter: "DOSSIER_FAISABILITE_ENVOYE_HORS_ABANDON",
        includeDropouts: true,
      });

      // Les deux candidatures devraient être incluses
      expect(
        resultWithFilter.rows.some(
          (c) => c.id === candidacyDropOut.candidacy.id,
        ),
      ).toBe(true);
      expect(
        resultWithFilter.rows.some(
          (c) => c.id === normalFeasibility.candidacy.id,
        ),
      ).toBe(true);

      // Maintenant tester avec includeDropouts = false (comportement par défaut)
      const resultWithoutDropouts =
        await getCandidaciesForCertificationAuthority({
          context,
          statusFilter: "DOSSIER_FAISABILITE_ENVOYE_HORS_ABANDON",
          includeDropouts: false,
        });

      // Seule la candidature normale devrait être incluse
      expect(
        resultWithoutDropouts.rows.every(
          (c) => c.id !== candidacyDropOut.candidacy.id,
        ),
      ).toBe(true);
      expect(
        resultWithoutDropouts.rows.some(
          (c) => c.id === normalFeasibility.candidacy.id,
        ),
      ).toBe(true);
    });
  });

  describe("Cohorte VAE Collective Filter", () => {
    let certificationAuthority: ManageableCertificationAuthority;
    let context: GraphqlContext;

    beforeEach(async () => {
      ({ certificationAuthority, context } =
        await setupCertificationAuthority());
    });

    test("filtre les candidatures par cohorteVaeCollectiveId", async () => {
      const vaeCollective = await createCohorteVaeCollectiveHelper();

      const candidacy = await createCandidacyHelper({
        candidacyActiveStatus: CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
        candidacyArgs: {
          cohorteVaeCollectiveId: vaeCollective.id || undefined,
        },
      });

      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacy.id,
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
      });

      // Créer une autre candidature sans cohorte
      await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      const result = await getCandidaciesForCertificationAuthority({
        context,
        cohorteVaeCollectiveId: vaeCollective.id || undefined,
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(candidacy.id);
    });
  });

  describe("Search Filter", () => {
    let certificationAuthority: ManageableCertificationAuthority;
    let context: GraphqlContext;

    beforeEach(async () => {
      ({ certificationAuthority, context } =
        await setupCertificationAuthority());
    });

    test("filtre les candidatures par terme recherché sur le nom du candidat", async () => {
      const candidacy = await createCandidacyHelper({
        candidacyActiveStatus: CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      });

      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacy.id,
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
      });

      await prismaClient.candidate.update({
        where: { id: candidacy.candidateId || "" },
        data: { firstname: "UniqueFirstName" },
      });

      // Créer une autre candidature avec un nom différent
      await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      const result = await getCandidaciesForCertificationAuthority({
        context,
        searchFilter: "UniqueFirstName",
      });

      expect(result.rows.some((c) => c.id === candidacy.id)).toBe(true);
    });
  });

  describe("Sort Filters", () => {
    let certificationAuthority: ManageableCertificationAuthority;
    let context: GraphqlContext;

    beforeEach(async () => {
      ({ certificationAuthority, context } =
        await setupCertificationAuthority());
    });

    test("trie les candidatures par DATE_CREATION_DESC", async () => {
      const feasibility1 = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      // Attendre un peu pour garantir des timestamps différents
      await new Promise((resolve) => setTimeout(resolve, 10));

      const feasibility2 = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      const result = await getCandidaciesForCertificationAuthority({
        context,
        sortByFilter: "DATE_CREATION_DESC",
      });

      expect(result.rows[0].id).toBe(feasibility2.candidacy.id);
      expect(result.rows[1].id).toBe(feasibility1.candidacy.id);
    });

    test("trie les candidatures par DATE_CREATION_ASC", async () => {
      const feasibility1 = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      const feasibility2 = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      const result = await getCandidaciesForCertificationAuthority({
        context,
        sortByFilter: "DATE_CREATION_ASC",
      });

      expect(result.rows[0].id).toBe(feasibility1.candidacy.id);
      expect(result.rows[1].id).toBe(feasibility2.candidacy.id);
    });
  });

  describe("Pagination", () => {
    let certificationAuthority: ManageableCertificationAuthority;
    let context: GraphqlContext;

    beforeEach(async () => {
      ({ certificationAuthority, context } =
        await setupCertificationAuthority());
    });

    test("pagine correctement avec limit et offset", async () => {
      // Créer 5 candidatures
      for (let i = 0; i < 5; i++) {
        await createFeasibilityUploadedPdfHelper(
          {
            certificationAuthorityId: certificationAuthority.id,
            decision: FeasibilityStatus.PENDING,
          },
          CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
        );
      }

      const result = await getCandidaciesForCertificationAuthority({
        context,
        limit: 2,
        offset: 0,
      });

      expect(result.rows).toHaveLength(2);
      expect(result.info.totalRows).toBe(5);
      expect(result.info.currentPage).toBe(1);
    });

    test("retourne la page attendue lorsque offset est renseigné", async () => {
      // Créer 5 candidatures
      const candidacies = [];
      for (let i = 0; i < 5; i++) {
        candidacies.push(
          await createFeasibilityUploadedPdfHelper(
            {
              certificationAuthorityId: certificationAuthority.id,
              decision: FeasibilityStatus.PENDING,
            },
            CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
          ),
        );
      }

      const result = await getCandidaciesForCertificationAuthority({
        context,
        limit: 2,
        offset: 2,
      });

      expect(result.rows).toHaveLength(2);
      expect(result.info.currentPage).toBe(2);
    });
  });

  describe("Combined Filters", () => {
    let certificationAuthority: ManageableCertificationAuthority;
    let context: GraphqlContext;

    beforeEach(async () => {
      ({ certificationAuthority, context } =
        await setupCertificationAuthority());
    });

    test("applique une logique AND entre filtres faisabilité et jury (seules les candidatures répondant aux DEUX critères)", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      // Candidature avec DF RECEVABLE ET jury programmé (doit matcher)
      const feasibility1 = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );
      await createJuryHelper({
        candidacyId: feasibility1.candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
        dateOfSession: futureDate,
        isActive: true,
      });

      // Candidature avec DF RECEVABLE MAIS SANS jury (ne doit PAS matcher)
      await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );

      // Candidature avec jury programmé MAIS statut différent (ne doit PAS matcher)
      const feasibility3 = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );
      await createJuryHelper({
        candidacyId: feasibility3.candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
        dateOfSession: futureDate,
        isActive: true,
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        feasibilityStatuses: [
          CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
        ],
        juryStatuses: ["SCHEDULED"],
      });

      // Seule la première candidature devrait matcher (AND logic)
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(feasibility1.candidacy.id);
    });

    test("applique une logique AND entre filtres validation et résultats de jury", async () => {
      const candidacyMatching = await createDossierDeValidationCandidacyForCA({
        certificationAuthorityId: certificationAuthority.id,
        candidacyStatus: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
        dossierDeValidationDecision: DossierDeValidationStatus.PENDING,
      });
      await addJuryForCandidacy({
        candidacyId: candidacyMatching.id,
        certificationAuthorityId: certificationAuthority.id,
        result: "FULL_SUCCESS_OF_FULL_CERTIFICATION",
      });

      const candidacyNotMatching =
        await createDossierDeValidationCandidacyForCA({
          certificationAuthorityId: certificationAuthority.id,
          candidacyStatus: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
          dossierDeValidationDecision: DossierDeValidationStatus.PENDING,
        });
      await addJuryForCandidacy({
        candidacyId: candidacyNotMatching.id,
        certificationAuthorityId: certificationAuthority.id,
        result: "FAILURE",
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        validationStatuses: [CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE],
        juryResults: ["FULL_SUCCESS_OF_FULL_CERTIFICATION"],
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(candidacyMatching.id);
    });

    test("applique conjointement juryStatuses et juryResults", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const candidacyMatch = await createDossierDeValidationCandidacyForCA({
        certificationAuthorityId: certificationAuthority.id,
        candidacyStatus: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
        dossierDeValidationDecision: DossierDeValidationStatus.PENDING,
      });
      await addJuryForCandidacy({
        candidacyId: candidacyMatch.id,
        certificationAuthorityId: certificationAuthority.id,
        dateOfSession: futureDate,
        result: "FULL_SUCCESS_OF_FULL_CERTIFICATION",
      });

      const candidacyOnlyStatus = await createDossierDeValidationCandidacyForCA(
        {
          certificationAuthorityId: certificationAuthority.id,
          candidacyStatus: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
          dossierDeValidationDecision: DossierDeValidationStatus.PENDING,
        },
      );
      await addJuryForCandidacy({
        candidacyId: candidacyOnlyStatus.id,
        certificationAuthorityId: certificationAuthority.id,
        dateOfSession: futureDate,
        result: "FAILURE",
      });

      const candidacyOnlyResult = await createDossierDeValidationCandidacyForCA(
        {
          certificationAuthorityId: certificationAuthority.id,
          candidacyStatus: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
          dossierDeValidationDecision: DossierDeValidationStatus.PENDING,
        },
      );
      await addJuryForCandidacy({
        candidacyId: candidacyOnlyResult.id,
        certificationAuthorityId: certificationAuthority.id,
        dateOfSession: new Date(),
        result: "FULL_SUCCESS_OF_FULL_CERTIFICATION",
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        juryStatuses: ["SCHEDULED"],
        juryResults: ["FULL_SUCCESS_OF_FULL_CERTIFICATION"],
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(candidacyMatch.id);
    });

    test("retourne 0 résultat quand on combine des filtres incompatibles (DF incomplet ET DV reçu)", async () => {
      await createFeasibilityCandidacyForCA({
        certificationAuthorityId: certificationAuthority.id,
        decision: FeasibilityStatus.INCOMPLETE,
        status: CandidacyStatusStep.DOSSIER_FAISABILITE_INCOMPLET,
      });

      await createDossierDeValidationCandidacyForCA({
        certificationAuthorityId: certificationAuthority.id,
        candidacyStatus: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
        dossierDeValidationDecision: DossierDeValidationStatus.PENDING,
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        feasibilityStatuses: [
          CandidacyStatusStep.DOSSIER_FAISABILITE_INCOMPLET,
        ],
        validationStatuses: [CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE],
      });

      // Aucune candidature ne peut avoir les deux statuts en même temps
      expect(result.rows).toHaveLength(0);
    });

    test("applique l'ensemble des filtres avec logique AND tout en gérant includeDropouts", async () => {
      const vaeCollective = await createCohorteVaeCollectiveHelper();

      const candidacy = await createCandidacyHelper({
        candidacyActiveStatus:
          CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
        candidacyArgs: {
          cohorteVaeCollectiveId: vaeCollective.id || undefined,
        },
      });

      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacy.id,
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
      });

      await createJuryHelper({
        candidacyId: candidacy.id,
        certificationAuthorityId: certificationAuthority.id,
        result: "FULL_SUCCESS_OF_FULL_CERTIFICATION",
        isActive: true,
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
        cohorteVaeCollectiveId: vaeCollective.id || undefined,
        feasibilityStatuses: [
          CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
        ],
        juryResults: ["FULL_SUCCESS_OF_FULL_CERTIFICATION"],
        includeDropouts: false,
      });

      expect(result.rows.some((c) => c.id === candidacy.id)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    let certificationAuthority: ManageableCertificationAuthority;
    let context: GraphqlContext;

    beforeEach(async () => {
      ({ certificationAuthority, context } =
        await setupCertificationAuthority());
    });

    test("retourne un résultat vide quand aucun filtre ne correspond", async () => {
      const result = await getCandidaciesForCertificationAuthority({
        context,
        feasibilityStatuses: [
          CandidacyStatusStep.DOSSIER_FAISABILITE_NON_RECEVABLE,
        ],
      });

      expect(result.rows).toHaveLength(0);
      expect(result.info.totalRows).toBe(0);
    });

    test("gère correctement des tableaux de filtres vides", async () => {
      await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      const result = await getCandidaciesForCertificationAuthority({
        context,
        feasibilityStatuses: [],
        validationStatuses: [],
        juryStatuses: [],
        juryResults: [],
      });

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    test("ne retourne que les statuts inclus dans CANDIDACY_STATUS_TO_INCLUDE", async () => {
      // Ces statuts devraient être inclus
      await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      // Créer une candidature avec un statut exclu
      const candidacy = await createCandidacyHelper({
        candidacyActiveStatus: CandidacyStatusStep.PARCOURS_CONFIRME,
      });
      await prismaClient.feasibility.create({
        data: {
          candidacyId: candidacy.id,
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
      });

      const result = await getCandidaciesForCertificationAuthority({
        context,
      });

      expect(
        result.rows.every(
          (c) =>
            c.status === CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE ||
            c.status === CandidacyStatusStep.DOSSIER_FAISABILITE_COMPLET ||
            c.status === CandidacyStatusStep.DOSSIER_FAISABILITE_INCOMPLET ||
            c.status === CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE ||
            c.status ===
              CandidacyStatusStep.DOSSIER_FAISABILITE_NON_RECEVABLE ||
            c.status === CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE ||
            c.status === CandidacyStatusStep.DOSSIER_DE_VALIDATION_SIGNALE,
        ),
      ).toBe(true);
    });

    test("retourne uniquement les candidatures liées à la certification authority", async () => {
      const otherCertificationAuthority =
        await createCertificationAuthorityHelper();

      const feasibility1 = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: otherCertificationAuthority.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );

      const result = await getCandidaciesForCertificationAuthority({
        context,
      });

      expect(result.rows.every((c) => c.id === feasibility1.candidacy.id)).toBe(
        true,
      );
    });
  });

  describe("Accès administrateur", () => {
    let adminContext: GraphqlContext;

    beforeEach(() => {
      adminContext = buildContext({
        roles: ["admin"],
        sub: "admin-user-id",
      });
    });

    test("retourne les candidatures de plusieurs certificateurs lorsque l'utilisateur est admin", async () => {
      const certificationAuthorityA =
        await createCertificationAuthorityHelper();
      const certificationAuthorityB =
        await createCertificationAuthorityHelper();

      const feasibilityA = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthorityA.id,
          decision: FeasibilityStatus.PENDING,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
      );
      const feasibilityB = await createFeasibilityUploadedPdfHelper(
        {
          certificationAuthorityId: certificationAuthorityB.id,
          decision: FeasibilityStatus.ADMISSIBLE,
        },
        CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
      );

      const result = await getCandidaciesForCertificationAuthority({
        context: adminContext,
      });

      const returnedIds = result.rows.map((c) => c.id);
      expect(returnedIds).toEqual(
        expect.arrayContaining([
          feasibilityA.candidacy.id,
          feasibilityB.candidacy.id,
        ]),
      );
    });
  });
});
