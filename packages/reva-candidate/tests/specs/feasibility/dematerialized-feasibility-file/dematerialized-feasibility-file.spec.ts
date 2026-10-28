import { expect, Page, test } from "next/experimental/testmode/playwright/msw";
import { graphql } from "next/experimental/testmode/playwright/msw";

import {
  CandidacyEntity,
  createCandidacyEntity,
} from "@tests/helpers/entities/create-candidacy.entity";
import { createCandidateEntity } from "@tests/helpers/entities/create-candidate.entity";
import {
  loginAndWaitForInitialLoad,
  getDefaultFeasibilityHandlers,
} from "@tests/helpers/handlers/feasibility/dematerialized-feasibility-file/dematerialized-feasibility-file.handler";
import { graphQLResolver } from "@tests/helpers/network/msw";
import { waitGraphQL } from "@tests/helpers/network/requests";

import {
  DATE_NOW,
  DEFAULT_BLOCS_COMPETENCES,
  DEFAULT_BLOCS_COMPETENCES_COMPLETED,
  DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
  DEFAULT_FEASIBILITY_FILE,
  DFF_BLOCS_COMPETENCES_COMPLETED,
  DFF_CERTIFICATION_AUTHORITY_DECISION_ADMISSIBLE,
  DFF_CERTIFICATION_AUTHORITY_DECISION_INCOMPLETE,
  DFF_CERTIFICATION_AUTHORITY_DECISION_REJECTED,
  DFF_FULL_ELIGIBILITY,
  DFF_PARTIAL_ELIGIBILITY,
} from "./dff-mocks";

const CANDIDACY_ID = "57bf364b-8c8b-4ff4-889b-66917e26d7d0";

const candidate = createCandidateEntity();

const fvae = graphql.link("https://reva-api/api/graphql");

const FEASIBILITY_ADMISSIBLE_DECISION = {
  ...DEFAULT_FEASIBILITY_FILE,
  decision: DFF_CERTIFICATION_AUTHORITY_DECISION_ADMISSIBLE,
  dematerializedFeasibilityFile: {
    ...DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
    eligibilityRequirement: DFF_FULL_ELIGIBILITY,
    certificationPartComplete: true,
    blocsDeCompetences: DEFAULT_BLOCS_COMPETENCES_COMPLETED,
    attachmentsPartComplete: true,
    prerequisitesPartComplete: true,
    competenceBlocsPartCompletion: DFF_BLOCS_COMPETENCES_COMPLETED,
    isReadyToBeSentToCandidate: true,
    sentToCandidateAt: DATE_NOW,
    swornStatementFileId: "some-file-id",
    isReadyToBeSentToCertificationAuthority: true,
  },
};

function createCandidacyHelpers(args?: {
  feasibility?: unknown;
  certificationExpired?: boolean;
  certificationAuthorityStructureHasReducedRequirements?: boolean;
}): CandidacyEntity {
  const {
    feasibility = DEFAULT_FEASIBILITY_FILE,
    certificationExpired = false,
    certificationAuthorityStructureHasReducedRequirements,
  } = args ?? {};

  const certification = {
    label:
      "Titre à finalité professionnelle Assistant de vie dépendance (ADVD)",
    codeRncp: "37780",
    rncpExpiresAt: certificationExpired
      ? DATE_NOW - 1000000
      : DATE_NOW + 1000000,
    ...(certificationAuthorityStructureHasReducedRequirements !== undefined && {
      certificationAuthorityStructure: {
        hasReducedRequirements:
          certificationAuthorityStructureHasReducedRequirements,
      },
    }),
  };

  const candidacy = createCandidacyEntity({
    candidate,
    certification,
    status: "PROJET",
    experiencesCount: 2,
  });

  return {
    ...candidacy,
    typeAccompagnement: "AUTONOME",
    id: CANDIDACY_ID,
    isCertificationPartial: false,
    experiences: [
      {
        id: "b2927373-1073-44d7-b494-ea78c7c56b74",
        title: "Intitulé de l'experience test",
        startedAt: 1580428800000,
        duration: "lessThanOneYear",
        description: "Description du poste test",
      },
    ],
    mandatoryTrainings: [
      {
        id: "2790458c-040f-417d-b081-1d74b715ff9b",
        label: "Equipier de Première Intervention",
      },
    ],
    goals: [
      {
        id: "bc5365e2-a208-4c19-98f9-22f15de894cd",
        label: "Trouver plus facilement un emploi",
      },
    ],
    basicSkills: [
      {
        id: "d2eac236-723b-4bb8-ae4c-5d16d320ec72",
        label: "Usage et communication numérique",
      },
    ],
    certification,
    certificationAuthorityLocalAccounts: [
      {
        contactFullName: "Jane Doe public contact",
        contactEmail: "janedoepublic@uncertificateur.fr",
        contactPhone: "0123456789",
      },
      {
        contactFullName: "John Doe public contact",
        contactEmail: "johndoepublic@uncertificateur.fr",
        contactPhone: "023456789",
      },
    ],
    feasibility,
  } as CandidacyEntity;
}

function createFeasibilityHandlers(candidacy: CandidacyEntity) {
  return [
    ...getDefaultFeasibilityHandlers(candidacy),
    fvae.query(
      "getCandidacyByIdForFeasibilityDematAutonomePage",
      graphQLResolver({ getCandidacyById: candidacy }),
    ),
  ];
}

async function visitFeasibilityPage(page: Page) {
  await loginAndWaitForInitialLoad(page);

  await page.goto(
    `candidates/${candidate.id}/candidacies/${CANDIDACY_ID}/feasibility-demat-autonome/`,
  );
  await waitGraphQL(page, "getCandidacyByIdForFeasibilityDematAutonomePage");
}

test.describe("Candidacy Dematerialized Feasibility File Page", () => {
  test.describe("When the feasibility file is in its initial state", () => {
    const candidacy = createCandidacyHelpers();

    test.use({
      mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
    });

    test("should display all sections", async ({ page }) => {
      await visitFeasibilityPage(page);

      await expect(page.getByTestId("eligibility-section")).toBeVisible();
      await expect(page.getByTestId("certification-section")).toBeVisible();
      await expect(page.getByTestId("certification-section")).not.toContainText(
        "La certification dans sa totalité",
      );
      await expect(
        page.getByTestId("competencies-blocks-section"),
      ).toBeVisible();
      await expect(page.getByTestId("prerequisites-section")).toBeVisible();
      await expect(page.getByTestId("attachments-section")).toBeVisible();
      await expect(page.getByTestId("sworn-statement-section")).toBeVisible();
      await expect(
        page.getByTestId("candidate-decision-comment-section"),
      ).not.toBeVisible();
      await expect(
        page.getByTestId(
          "send-file-certification-authority-tile-pending-validation",
        ),
      ).toBeVisible();
    });

    test("should display 'to complete' badges for eligibility, certification, decision, and attachments sections", async ({
      page,
    }) => {
      await visitFeasibilityPage(page);

      const eligibilitySection = page.getByTestId("eligibility-section");
      await expect(
        eligibilitySection.getByTestId("to-complete-badge"),
      ).toBeVisible();
      await expect(eligibilitySection.getByRole("button")).toBeEnabled();

      const certificationSection = page.getByTestId("certification-section");
      await expect(
        certificationSection.getByTestId("to-complete-badge"),
      ).toBeVisible();
      await expect(certificationSection.getByRole("button")).toBeEnabled();

      const competenciesBlocksSection = page.getByTestId(
        "competencies-blocks-section",
      );
      await expect(
        competenciesBlocksSection.getByTestId("to-complete-badge"),
      ).toBeVisible();
      await expect(
        competenciesBlocksSection.getByRole("button"),
      ).not.toBeVisible();

      const prerequisitesSection = page.getByTestId("prerequisites-section");
      await expect(
        prerequisitesSection.getByTestId("to-complete-badge"),
      ).toBeVisible();
      await expect(prerequisitesSection.getByRole("button")).not.toBeDisabled();

      const attachmentsSection = page.getByTestId("attachments-section");
      await expect(
        attachmentsSection.getByTestId("to-complete-badge"),
      ).toBeVisible();
      await expect(attachmentsSection.getByRole("button")).toBeEnabled();
    });
  });

  test.describe("When eligibility is completed", () => {
    const feasibilityEligibilityCompleted = {
      ...DEFAULT_FEASIBILITY_FILE,
      dematerializedFeasibilityFile: {
        ...DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
        eligibilityRequirement: DFF_FULL_ELIGIBILITY,
      },
    };

    const candidacy = createCandidacyHelpers({
      feasibility: feasibilityEligibilityCompleted,
    });

    test.use({
      mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
    });

    test("should display 'completed' badge for the eligibility section", async ({
      page,
    }) => {
      await visitFeasibilityPage(page);

      const eligibilitySection = page.getByTestId("eligibility-section");
      await expect(
        eligibilitySection.getByTestId("completed-badge"),
      ).toBeVisible();

      const competenciesBlocksSection = page.getByTestId(
        "competencies-blocks-section",
      );
      await expect(
        competenciesBlocksSection.getByRole("button"),
      ).not.toBeVisible();

      const prerequisitesSection = page.getByTestId("prerequisites-section");
      await expect(prerequisitesSection.getByRole("button")).not.toBeDisabled();

      const attachmentsSection = page.getByTestId("attachments-section");
      await expect(attachmentsSection.getByRole("button")).toBeEnabled();

      const swornStatementSection = page.getByTestId("sworn-statement-section");
      await expect(swornStatementSection.getByRole("button")).toBeEnabled();

      await expect(
        page.getByTestId(
          "send-file-certification-authority-tile-pending-validation",
        ),
      ).toBeVisible();
    });
  });

  test.describe("When eligibility and certification are completed", () => {
    const feasibilityEligibilityAndCertificationCompleted = {
      ...DEFAULT_FEASIBILITY_FILE,
      dematerializedFeasibilityFile: {
        ...DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
        eligibilityRequirement: DFF_FULL_ELIGIBILITY,
        certificationPartComplete: true,
        competenceBlocsPartCompletion: "COMPLETED",
        blocsDeCompetences: DEFAULT_BLOCS_COMPETENCES.map((bloc) => ({
          ...bloc,
          complete: true,
        })),
      },
    };

    const candidacy = createCandidacyHelpers({
      feasibility: feasibilityEligibilityAndCertificationCompleted,
    });

    test.use({
      mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
    });

    test("should display 'completed' badges for the certification and eligibility sections", async ({
      page,
    }) => {
      await visitFeasibilityPage(page);

      const eligibilitySection = page.getByTestId("eligibility-section");
      await expect(
        eligibilitySection.getByTestId("completed-badge"),
      ).toBeVisible();

      const certificationSection = page.getByTestId("certification-section");
      await expect(
        certificationSection.getByTestId("completed-badge"),
      ).toBeVisible();
      await expect(certificationSection).toContainText(
        "La certification dans sa totalité",
      );

      const competenciesBlocksSection = page.getByTestId(
        "competencies-blocks-section",
      );
      await expect(competenciesBlocksSection.getByRole("button")).toBeEnabled();

      const prerequisitesSection = page.getByTestId("prerequisites-section");
      await expect(prerequisitesSection.getByRole("button")).toBeEnabled();

      const attachmentsSection = page.getByTestId("attachments-section");
      await expect(attachmentsSection.getByRole("button")).toBeEnabled();

      const swornStatementSection = page.getByTestId("sworn-statement-section");
      await expect(swornStatementSection.getByRole("button")).toBeEnabled();

      await expect(
        page.getByTestId("candidate-decision-comment-section"),
      ).not.toBeVisible();
      await expect(
        page.getByTestId(
          "send-file-certification-authority-tile-pending-validation",
        ),
      ).toBeVisible();
    });
  });

  test.describe("When eligibility is partial and certification is completed", () => {
    const feasibilityEligibilityPartial = {
      ...DEFAULT_FEASIBILITY_FILE,
      dematerializedFeasibilityFile: {
        ...DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
        eligibilityRequirement: DFF_PARTIAL_ELIGIBILITY,
        certificationPartComplete: true,
        blocsDeCompetences: DEFAULT_BLOCS_COMPETENCES,
      },
    };

    const candidacy = createCandidacyHelpers({
      feasibility: feasibilityEligibilityPartial,
    });

    test.use({
      mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
    });

    test("should display 'completed' badges for certification and eligibility sections", async ({
      page,
    }) => {
      await visitFeasibilityPage(page);

      const eligibilitySection = page.getByTestId("eligibility-section");
      await expect(
        eligibilitySection.getByTestId("completed-badge"),
      ).toBeVisible();

      const certificationSection = page.getByTestId("certification-section");
      await expect(
        certificationSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const competenciesBlocksSection = page.getByTestId(
        "competencies-blocks-section",
      );
      await expect(
        competenciesBlocksSection.getByTestId("completed-badge"),
      ).not.toBeVisible();
      await expect(
        competenciesBlocksSection.getByRole("button"),
      ).not.toBeVisible();

      const prerequisitesSection = page.getByTestId("prerequisites-section");
      await expect(prerequisitesSection.getByRole("button")).toBeEnabled();

      const attachmentsSection = page.getByTestId("attachments-section");
      await expect(attachmentsSection.getByRole("button")).toBeEnabled();

      const swornStatementSection = page.getByTestId("sworn-statement-section");
      await expect(swornStatementSection.getByRole("button")).toBeEnabled();

      await expect(
        page.getByTestId("candidate-decision-comment-section"),
      ).not.toBeVisible();
      await expect(
        page.getByTestId(
          "send-file-certification-authority-tile-pending-validation",
        ),
      ).toBeVisible();
    });
  });

  test.describe("When all sections except send file to candidate, sworn statement, and send file to certification authority are completed", () => {
    const feasibilityEligibilityAndCertificationCompleted = {
      ...DEFAULT_FEASIBILITY_FILE,
      dematerializedFeasibilityFile: {
        ...DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
        eligibilityRequirement: DFF_FULL_ELIGIBILITY,
        certificationPartComplete: true,
        blocsDeCompetences: DEFAULT_BLOCS_COMPETENCES_COMPLETED,
        attachmentsPartComplete: true,
        prerequisitesPartComplete: true,
        competenceBlocsPartCompletion: DFF_BLOCS_COMPETENCES_COMPLETED,
        isReadyToBeSentToCandidate: true,
      },
    };

    const candidacy = createCandidacyHelpers({
      feasibility: feasibilityEligibilityAndCertificationCompleted,
    });

    test.use({
      mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
    });

    test("should display 'completed' badges for all sections", async ({
      page,
    }) => {
      await visitFeasibilityPage(page);

      const eligibilitySection = page.getByTestId("eligibility-section");
      await expect(
        eligibilitySection.getByTestId("completed-badge"),
      ).toBeVisible();

      const certificationSection = page.getByTestId("certification-section");
      await expect(
        certificationSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const competenciesBlocksSection = page.getByTestId(
        "competencies-blocks-section",
      );
      await expect(
        competenciesBlocksSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const prerequisitesSection = page.getByTestId("prerequisites-section");
      await expect(
        prerequisitesSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const attachmentsSection = page.getByTestId("attachments-section");
      await expect(
        attachmentsSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const swornStatementSection = page.getByTestId("sworn-statement-section");
      await expect(swornStatementSection.getByRole("button")).toBeEnabled();

      await expect(
        page.getByTestId("candidate-decision-comment-section"),
      ).not.toBeVisible();
      await expect(
        page.getByTestId(
          "send-file-certification-authority-tile-pending-validation",
        ),
      ).toBeVisible();
    });

    test("the certification expired alert should not be visible", async ({
      page,
    }) => {
      await visitFeasibilityPage(page);

      await expect(
        page.getByTestId("certification-expired-alert"),
      ).not.toBeVisible();
    });

    test.describe("when certification is expired", () => {
      const candidacy = createCandidacyHelpers({
        feasibility: feasibilityEligibilityAndCertificationCompleted,
        certificationExpired: true,
      });

      test.use({
        mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
      });

      test("the certification expired alert should be visible", async ({
        page,
      }) => {
        await visitFeasibilityPage(page);

        await expect(
          page.getByTestId("certification-expired-alert"),
        ).toBeVisible();
      });
    });
  });

  test.describe("When sworn attestation is completed", () => {
    const feasibilityAllCompletedWithSwornAttestation = {
      ...DEFAULT_FEASIBILITY_FILE,
      dematerializedFeasibilityFile: {
        ...DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
        eligibilityRequirement: DFF_FULL_ELIGIBILITY,
        certificationPartComplete: true,
        blocsDeCompetences: DEFAULT_BLOCS_COMPETENCES_COMPLETED,
        attachmentsPartComplete: true,
        prerequisitesPartComplete: true,
        competenceBlocsPartCompletion: DFF_BLOCS_COMPETENCES_COMPLETED,
        isReadyToBeSentToCandidate: true,
        sentToCandidateAt: DATE_NOW,
        swornStatementFileId: "some-file-id",
        isReadyToBeSentToCertificationAuthority: true,
      },
    };

    const candidacy = createCandidacyHelpers({
      feasibility: feasibilityAllCompletedWithSwornAttestation,
    });

    test.use({
      mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
    });

    test("should enable the 'send to certification authority' section if the sworn attestation is completed", async ({
      page,
    }) => {
      await visitFeasibilityPage(page);

      const eligibilitySection = page.getByTestId("eligibility-section");
      await expect(
        eligibilitySection.getByTestId("completed-badge"),
      ).toBeVisible();

      const certificationSection = page.getByTestId("certification-section");
      await expect(
        certificationSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const competenciesBlocksSection = page.getByTestId(
        "competencies-blocks-section",
      );
      await expect(
        competenciesBlocksSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const prerequisitesSection = page.getByTestId("prerequisites-section");
      await expect(
        prerequisitesSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const attachmentsSection = page.getByTestId("attachments-section");
      await expect(
        attachmentsSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const swornStatementSection = page.getByTestId("sworn-statement-section");
      await expect(swornStatementSection.getByRole("button")).toBeEnabled();

      await expect(
        page.getByTestId("send-file-certification-authority-tile-ready"),
      ).toBeVisible();
    });
  });
});

test.describe("When the feasibility file has been sent to the certification authority", () => {
  const feasibilityFileSent = {
    ...DEFAULT_FEASIBILITY_FILE,
    feasibilityFileSentAt: DATE_NOW as number,
    dematerializedFeasibilityFile: {
      ...DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
      eligibilityRequirement: DFF_FULL_ELIGIBILITY,
      certificationPartComplete: true,
      blocsDeCompetences: DEFAULT_BLOCS_COMPETENCES_COMPLETED,
      attachmentsPartComplete: true,
      prerequisitesPartComplete: true,
      competenceBlocsPartCompletion: DFF_BLOCS_COMPETENCES_COMPLETED,
      isReadyToBeSentToCandidate: true,
      sentToCandidateAt: DATE_NOW,
      swornStatementFileId: "some-file-id",
      isReadyToBeSentToCertificationAuthority: true,
      sentToCertificationAuthorityAt: DATE_NOW,
    },
  };

  const candidacy = createCandidacyHelpers({
    feasibility: feasibilityFileSent,
  });

  test.use({
    mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
  });

  test("should hide all badges and section buttons", async ({ page }) => {
    await visitFeasibilityPage(page);

    const eligibilitySection = page.getByTestId("eligibility-section");
    await expect(
      eligibilitySection.getByTestId("completed-badge"),
    ).not.toBeVisible();
    await expect(eligibilitySection.getByRole("button")).not.toBeVisible();

    const certificationSection = page.getByTestId("certification-section");
    await expect(
      certificationSection.getByTestId("completed-badge"),
    ).not.toBeVisible();
    await expect(certificationSection.getByRole("button")).not.toBeVisible();

    const competenciesBlocksSection = page.getByTestId(
      "competencies-blocks-section",
    );
    await expect(
      competenciesBlocksSection.getByTestId("completed-badge"),
    ).not.toBeVisible();
    await expect(
      competenciesBlocksSection.getByTestId(
        "competencies-blocks-section-button",
      ),
    ).not.toBeVisible();

    const prerequisitesSection = page.getByTestId("prerequisites-section");
    await expect(
      prerequisitesSection.getByTestId("completed-badge"),
    ).not.toBeVisible();
    await expect(prerequisitesSection.getByRole("button")).not.toBeVisible();

    const attachmentsSection = page.getByTestId("attachments-section");
    await expect(
      attachmentsSection.getByTestId("completed-badge"),
    ).not.toBeVisible();
    await expect(attachmentsSection.getByRole("button")).not.toBeVisible();

    const swornStatementSection = page.getByTestId("sworn-statement-section");
    await expect(swornStatementSection.getByRole("button")).not.toBeVisible();

    await expect(
      page.getByTestId("send-file-certification-authority-tile-sent"),
    ).toBeVisible();
  });
});

test.describe("When the decision is ADMISSIBLE or REJECTED", () => {
  const candidacy = createCandidacyHelpers({
    feasibility: FEASIBILITY_ADMISSIBLE_DECISION,
  });

  test.use({
    mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
  });

  test("should display the feasibility summary when the decision is ADMISSIBLE", async ({
    page,
  }) => {
    await loginAndWaitForInitialLoad(page);
    await page.goto(
      `candidates/${candidate.id}/candidacies/${candidacy.id}/feasibility-demat-autonome/`,
    );
    await waitGraphQL(page, "getCandidacyByIdForFeasibilityDematAutonomePage");

    await expect(page.getByTestId("dff-summary")).toBeVisible();
  });

  test("should display the contact info section with the correct information", async ({
    page,
  }) => {
    await visitFeasibilityPage(page);

    const contactInfosSection = page.getByTestId("contact-infos-section");
    const organismContactInfoTile = contactInfosSection.getByTestId(
      "organism-contact-info-tile",
    );
    await expect(organismContactInfoTile).not.toBeVisible();

    await expect(
      page.getByTestId("certification-authority-contact-info-tile"),
    ).toBeVisible();
    const certificationAuthorityLocalAccount = page.getByTestId(
      "certification-authority-local-account-0",
    );
    await expect(certificationAuthorityLocalAccount).toBeVisible();
    await expect(certificationAuthorityLocalAccount).toContainText(
      "Jane Doe public contact",
    );
  });

  test.describe("when the decision is REJECTED", () => {
    const feasibilityRejectedDecision = {
      ...DEFAULT_FEASIBILITY_FILE,
      decision: DFF_CERTIFICATION_AUTHORITY_DECISION_REJECTED,
      dematerializedFeasibilityFile: {
        ...DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
        eligibilityRequirement: DFF_FULL_ELIGIBILITY,
        certificationPartComplete: true,
        blocsDeCompetences: DEFAULT_BLOCS_COMPETENCES_COMPLETED,
        attachmentsPartComplete: true,
        prerequisitesPartComplete: true,
        competenceBlocsPartCompletion: DFF_BLOCS_COMPETENCES_COMPLETED,
        isReadyToBeSentToCandidate: true,
        sentToCandidateAt: DATE_NOW,
        swornStatementFileId: "some-file-id",
        isReadyToBeSentToCertificationAuthority: true,
      },
    };

    const candidacy = createCandidacyHelpers({
      feasibility: feasibilityRejectedDecision,
    });

    test.use({
      mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
    });

    test("should display the feasibility summary when the decision is REJECTED", async ({
      page,
    }) => {
      await visitFeasibilityPage(page);

      await expect(page.getByTestId("dff-summary")).toBeVisible();
    });
  });
});

test.describe("When the decision is INCOMPLETE", () => {
  test.describe("when the file is not ready to be sent to the certification authority", () => {
    const feasibilityIncompleteDecision = {
      ...DEFAULT_FEASIBILITY_FILE,
      decision: DFF_CERTIFICATION_AUTHORITY_DECISION_INCOMPLETE,
      decisionSentAt: DATE_NOW,
      decisionComment: "some-comment",
      dematerializedFeasibilityFile: {
        ...DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
        eligibilityRequirement: DFF_FULL_ELIGIBILITY,
        certificationPartComplete: true,
        blocsDeCompetences: DEFAULT_BLOCS_COMPETENCES_COMPLETED,
        attachmentsPartComplete: true,
        prerequisitesPartComplete: true,
        competenceBlocsPartCompletion: DFF_BLOCS_COMPETENCES_COMPLETED,
        isReadyToBeSentToCandidate: true,
        swornStatementFileId: "some-file-id",
        isReadyToBeSentToCertificationAuthority: false,
        feasibilityFileSentAt: null,
      },
    };

    const candidacy = createCandidacyHelpers({
      feasibility: feasibilityIncompleteDecision,
    });

    test.use({
      mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
    });

    test("should display all sections as editable with completed badges when the file is not ready to be sent to the certification authority", async ({
      page,
    }) => {
      await visitFeasibilityPage(page);

      await expect(page.getByTestId("decision-incomplete-alert")).toBeVisible();

      const eligibilitySection = page.getByTestId("eligibility-section");
      await expect(
        eligibilitySection.getByTestId("completed-badge"),
      ).toBeVisible();

      const certificationSection = page.getByTestId("certification-section");
      await expect(
        certificationSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const competenciesBlocksSection = page.getByTestId(
        "competencies-blocks-section",
      );
      await expect(
        competenciesBlocksSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const prerequisitesSection = page.getByTestId("prerequisites-section");
      await expect(
        prerequisitesSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const attachmentsSection = page.getByTestId("attachments-section");
      await expect(
        attachmentsSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const swornStatementSection = page.getByTestId("sworn-statement-section");
      await expect(swornStatementSection.getByRole("button")).toBeEnabled();

      await expect(
        page.getByTestId(
          "send-file-certification-authority-tile-pending-validation",
        ),
      ).toBeVisible();
    });
  });

  test.describe("when the file is ready to be sent to the certification authority", () => {
    const feasibilityIncompleteDecision = {
      ...DEFAULT_FEASIBILITY_FILE,
      decision: DFF_CERTIFICATION_AUTHORITY_DECISION_INCOMPLETE,
      dematerializedFeasibilityFile: {
        ...DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
        eligibilityRequirement: DFF_FULL_ELIGIBILITY,
        certificationPartComplete: true,
        blocsDeCompetences: DEFAULT_BLOCS_COMPETENCES_COMPLETED,
        attachmentsPartComplete: true,
        prerequisitesPartComplete: true,
        competenceBlocsPartCompletion: DFF_BLOCS_COMPETENCES_COMPLETED,
        isReadyToBeSentToCandidate: true,
        swornStatementFileId: "some-file-id",
        isReadyToBeSentToCertificationAuthority: true,
        feasibilityFileSentAt: null,
        sentToCandidateAt: DATE_NOW,
        candidateConfirmationAt: DATE_NOW,
      },
    };

    const candidacy = createCandidacyHelpers({
      feasibility: feasibilityIncompleteDecision,
    });

    test.use({
      mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
    });

    test("should display all sections as editable with completed badges when the file is ready to be sent to the certification authority", async ({
      page,
    }) => {
      await visitFeasibilityPage(page);

      const eligibilitySection = page.getByTestId("eligibility-section");
      await expect(
        eligibilitySection.getByTestId("completed-badge"),
      ).toBeVisible();

      const certificationSection = page.getByTestId("certification-section");
      await expect(
        certificationSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const competenciesBlocksSection = page.getByTestId(
        "competencies-blocks-section",
      );
      await expect(
        competenciesBlocksSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const prerequisitesSection = page.getByTestId("prerequisites-section");
      await expect(
        prerequisitesSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const attachmentsSection = page.getByTestId("attachments-section");
      await expect(
        attachmentsSection.getByTestId("completed-badge"),
      ).toBeVisible();

      const swornStatementSection = page.getByTestId("sworn-statement-section");
      await expect(swornStatementSection.getByRole("button")).toBeEnabled();

      await expect(
        page.getByTestId("send-file-certification-authority-tile-ready"),
      ).toBeVisible();
    });
  });
});

test.describe("ComplementExperienceParcoursViseAccordion", () => {
  test.describe("when certificationAuthorityStructure is absent", () => {
    const candidacy = createCandidacyHelpers();

    test.use({
      mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
    });

    test("should not show the accordion", async ({ page }) => {
      await visitFeasibilityPage(page);

      await expect(
        page.getByTestId("complement-experience-parcours-vise-accordion"),
      ).not.toBeVisible();
    });
  });

  test.describe("when certificationAuthorityStructureHasReducedRequirements is false", () => {
    const candidacy = createCandidacyHelpers({
      certificationAuthorityStructureHasReducedRequirements: false,
    });

    test.use({
      mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
    });

    test("should not show the accordion", async ({ page }) => {
      await visitFeasibilityPage(page);

      await expect(
        page.getByTestId("complement-experience-parcours-vise-accordion"),
      ).not.toBeVisible();
    });
  });

  test.describe("when certificationAuthorityStructureHasReducedRequirements is true", () => {
    test.describe("when complementExperienceParcoursVise is null", () => {
      const feasibilityEditable = {
        ...DEFAULT_FEASIBILITY_FILE,
        dematerializedFeasibilityFile: {
          ...DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
          certificationPartComplete: true,
        },
      };

      const candidacy = createCandidacyHelpers({
        feasibility: feasibilityEditable,
        certificationAuthorityStructureHasReducedRequirements: true,
      });

      test.use({
        mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
      });

      test("it should show the accordion with a 'Compléter' button", async ({
        page,
      }) => {
        await visitFeasibilityPage(page);

        await expect(
          page.getByTestId("complement-experience-parcours-vise-accordion"),
        ).toBeVisible();
        const button = page.getByTestId(
          "complement-experience-parcours-vise-button",
        );
        await expect(button).toBeVisible();
        await expect(button).toContainText("Compléter");
      });

      test("it should lead me to the complement experience parcours vise page when i click on the button", async ({
        page,
      }) => {
        await visitFeasibilityPage(page);

        await page
          .getByTestId("complement-experience-parcours-vise-button")
          .click();
        await expect(page).toHaveURL(
          `candidates/${candidate.id}/candidacies/${candidacy.id}/feasibility-demat-autonome/complement-experience-parcours-vise/`,
        );
      });
    });

    test.describe("when complementExperienceParcoursVise has content", () => {
      const feasibilityWithContent = {
        ...DEFAULT_FEASIBILITY_FILE,
        dematerializedFeasibilityFile: {
          ...DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
          certificationPartComplete: true,
          complementExperienceParcoursVise:
            "Contenu du complément d'expérience",
        },
      };

      const candidacy = createCandidacyHelpers({
        feasibility: feasibilityWithContent,
        certificationAuthorityStructureHasReducedRequirements: true,
      });

      test.use({
        mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
      });

      test("itshould show the accordion with a 'Modifier' button", async ({
        page,
      }) => {
        await visitFeasibilityPage(page);

        await expect(
          page.getByTestId("complement-experience-parcours-vise-accordion"),
        ).toBeVisible();
        const button = page.getByTestId(
          "complement-experience-parcours-vise-button",
        );
        await expect(button).toBeVisible();
        await expect(button).toContainText("Modifier");
      });
    });

    test.describe("when the file is not editable (sent to certification authority)", () => {
      const feasibilitySent = {
        ...DEFAULT_FEASIBILITY_FILE,
        feasibilityFileSentAt: DATE_NOW,
      };

      const candidacy = createCandidacyHelpers({
        feasibility: feasibilitySent,
        certificationAuthorityStructureHasReducedRequirements: true,
      });

      test.use({
        mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
      });

      test("it should show the accordion without a button", async ({
        page,
      }) => {
        await visitFeasibilityPage(page);

        await expect(
          page.getByTestId("complement-experience-parcours-vise-accordion"),
        ).toBeVisible();
        await expect(
          page.getByTestId("complement-experience-parcours-vise-button"),
        ).not.toBeVisible();
      });
    });
  });

  test.describe("when the feasibility summary is displayed", () => {
    const admissibleFeasibilityWithoutBlocs = {
      ...DEFAULT_FEASIBILITY_FILE,
      decision: DFF_CERTIFICATION_AUTHORITY_DECISION_ADMISSIBLE,
      dematerializedFeasibilityFile: {
        ...DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
        blocsDeCompetences: [],
      },
    };

    test.describe("when certificationAuthorityStructureHasReducedRequirements is false", () => {
      const candidacy = createCandidacyHelpers({
        feasibility: admissibleFeasibilityWithoutBlocs,
        certificationAuthorityStructureHasReducedRequirements: false,
      });

      test.use({
        mswHandlers: [createFeasibilityHandlers(candidacy), { scope: "test" }],
      });

      test("should not show the complement in the summary", async ({
        page,
      }) => {
        await visitFeasibilityPage(page);

        const dffSummary = page.getByTestId("dff-summary");
        await expect(dffSummary).toBeVisible();
        await expect(
          dffSummary.getByRole("heading", { name: "Blocs de compétences" }),
        ).not.toBeVisible();
        await expect(
          dffSummary.getByTestId(
            "complement-experience-parcours-vise-accordion",
          ),
        ).not.toBeVisible();
      });
    });

    test.describe("when certificationAuthorityStructureHasReducedRequirements is true", () => {
      test.describe("when complementExperienceParcoursVise is null", () => {
        const candidacy = createCandidacyHelpers({
          feasibility: admissibleFeasibilityWithoutBlocs,
          certificationAuthorityStructureHasReducedRequirements: true,
        });

        test.use({
          mswHandlers: [
            createFeasibilityHandlers(candidacy),
            { scope: "test" },
          ],
        });

        test("should show the label in the summary without a button", async ({
          page,
        }) => {
          await visitFeasibilityPage(page);

          const dffSummary = page.getByTestId("dff-summary");
          const complement = dffSummary.getByTestId(
            "complement-experience-parcours-vise-accordion",
          );

          await expect(
            dffSummary.getByRole("heading", { name: "Blocs de compétences" }),
          ).toBeVisible();
          await expect(complement).toBeVisible();
          await expect(complement).toContainText(
            "Complément d’expérience lié au parcours visé (optionnel)",
          );
          await expect(
            page.getByTestId("complement-experience-parcours-vise-button"),
          ).not.toBeVisible();
        });
      });

      test.describe("when complementExperienceParcoursVise has content", () => {
        const feasibilityWithContent = {
          ...admissibleFeasibilityWithoutBlocs,
          dematerializedFeasibilityFile: {
            ...admissibleFeasibilityWithoutBlocs.dematerializedFeasibilityFile,
            complementExperienceParcoursVise:
              "Contenu du complément d'expérience",
          },
        };

        const candidacy = createCandidacyHelpers({
          feasibility: feasibilityWithContent,
          certificationAuthorityStructureHasReducedRequirements: true,
        });

        test.use({
          mswHandlers: [
            createFeasibilityHandlers(candidacy),
            { scope: "test" },
          ],
        });

        test("should show the complement content in the summary without a button", async ({
          page,
        }) => {
          await visitFeasibilityPage(page);

          const complement = page
            .getByTestId("dff-summary")
            .getByTestId("complement-experience-parcours-vise-accordion");

          await expect(complement).toBeVisible();
          await complement
            .getByText(
              "Complément d’expérience lié au parcours visé (optionnel)",
            )
            .click();
          await expect(complement).toContainText(
            "Contenu du complément d'expérience",
          );
          await expect(
            page.getByTestId("complement-experience-parcours-vise-button"),
          ).not.toBeVisible();
        });
      });
    });
  });
});
