import { expect, test } from "next/experimental/testmode/playwright/msw";

import { login } from "@tests/helpers/auth/auth";
import { createCandidacyEntity } from "@tests/helpers/entities/create-candidacy.entity";
import { createCandidateEntity } from "@tests/helpers/entities/create-candidate.entity";
import { createCertificationEntity } from "@tests/helpers/entities/create-certification.entity";
import { createDematerializedFeasibilityFileEntity } from "@tests/helpers/entities/create-dematerialized-feasibility-file.entity";
import { createDossierDeValidationEntity } from "@tests/helpers/entities/create-dossier-de-validation.entity";
import { createFeasibilityEntity } from "@tests/helpers/entities/create-feasibility.entity";
import {
  createJuryEntity,
  type JuryEntity,
} from "@tests/helpers/entities/create-jury.entity";
import { createOrganismEntity } from "@tests/helpers/entities/create-organism.entity";
import { dashboardHandlers } from "@tests/helpers/handlers/dashboard.handler";

import { TypeAccompagnement } from "@/graphql/generated/graphql";

// Candidacy
const createCandidacyWithGoals = (goalsCount: number) => {
  const certification = createCertificationEntity();
  const organism = createOrganismEntity();
  const candidate = createCandidateEntity();
  const candidacy = createCandidacyEntity({
    candidate,
    status: "PROJET",
    certification,
    organism,
    goalsCount,
  });
  return candidacy;
};

const createCandidacyWithGoalsAndExperiences = (
  goalsCount: number,
  experiencesCount: number,
) => {
  const certification = createCertificationEntity();
  const organism = createOrganismEntity();
  const candidate = createCandidateEntity();
  const candidacy = createCandidacyEntity({
    candidate,
    status: "PROJET",
    certification,
    organism,
    goalsCount,
    experiencesCount,
  });
  return candidacy;
};

test.describe("Next actions tiles", () => {
  const typesAccompagnement: TypeAccompagnement[] = ["AUTONOME", "ACCOMPAGNE"];
  test.describe("ACCOMPAGNE", () => {
    test.describe("Compléter mes objectifs", () => {
      const candidacy = createCandidacyWithGoals(0);
      const { handlers, dashboardWait } = dashboardHandlers({
        candidacy,
      });
      test.use({
        mswHandlers: [handlers, { scope: "test" }],
      });

      test("shows 'Compléter mes objectifs' when no goals", async ({
        page,
      }) => {
        await login(page);
        await dashboardWait(page);
        await expect(
          page.locator('[data-testid="dashboard-sidebar"]'),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Compléter mes objectifs" }),
        ).toBeVisible();
      });
    });

    test.describe("Compléter mes expériences", () => {
      const candidacy = createCandidacyWithGoalsAndExperiences(1, 0);
      const { handlers, dashboardWait } = dashboardHandlers({
        candidacy,
      });
      test.use({
        mswHandlers: [handlers, { scope: "test" }],
      });

      test("shows 'Compléter mes expériences' when no experiences", async ({
        page,
      }) => {
        await login(page);
        await dashboardWait(page);
        await expect(
          page.getByRole("button", { name: "Compléter mes expériences" }),
        ).toBeVisible();
      });
    });

    test.describe("Choisir mon accompagnateur", () => {
      const candidate = createCandidateEntity();
      const candidacy = createCandidacyEntity({
        candidate,
        status: "PROJET",
        certification: createCertificationEntity(),
        goalsCount: 1,
        experiencesCount: 1,
        typeAccompagnement: "ACCOMPAGNE",
      });
      const { handlers, dashboardWait } = dashboardHandlers({
        candidacy,
      });
      test.use({
        mswHandlers: [handlers, { scope: "test" }],
      });

      test("shows 'Choisir mon accompagnateur' when certification selected but no organism", async ({
        page,
      }) => {
        await login(page);
        await dashboardWait(page);
        await expect(
          page.getByRole("button", { name: "Choisir mon accompagnateur" }),
        ).toBeVisible();
      });
    });

    test.describe("Envoyer ma candidature", () => {
      const organism = createOrganismEntity();
      const candidate = createCandidateEntity();

      const candidacy = createCandidacyEntity({
        candidate,
        status: "PROJET",
        certification: createCertificationEntity(),
        goalsCount: 1,
        experiencesCount: 1,
        organism,
      });
      const { handlers, dashboardWait } = dashboardHandlers({
        candidacy,
      });
      test.use({
        mswHandlers: [handlers, { scope: "test" }],
      });

      test("shows 'Envoyer ma candidature' and routes to submit candidacy", async ({
        page,
      }) => {
        await login(page);
        await dashboardWait(page);
        const btn = page.getByRole("button", {
          name: "Envoyer ma candidature",
        });
        await expect(btn).toBeVisible();
        await btn.scrollIntoViewIfNeeded();
        await Promise.all([
          page.waitForURL(
            `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/submit-candidacy/`,
          ),
          btn.click(),
        ]);
        await expect(page).toHaveURL(
          `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/submit-candidacy/`,
        );
      });
    });

    test.describe("Valider mon parcours et financement", () => {
      const organism = createOrganismEntity();
      const candidate = createCandidateEntity();

      const candidacy = createCandidacyEntity({
        candidate,
        status: "PARCOURS_ENVOYE",
        certification: createCertificationEntity(),
        goalsCount: 1,
        experiencesCount: 1,
        organism,
      });
      const { handlers, dashboardWait } = dashboardHandlers({
        candidacy,
      });
      test.use({
        mswHandlers: [handlers, { scope: "test" }],
      });

      test("shows 'Valider mon parcours et financement' and routes", async ({
        page,
      }) => {
        await login(page);
        await dashboardWait(page);
        const btn = page.getByRole("button", {
          name: "Valider mon parcours et financement",
        });
        await expect(btn).toBeVisible();
        await btn.click();
        await expect(page).toHaveURL(
          `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/validate-training/`,
        );
      });
    });

    test.describe("Valider mon dossier de faisabilité", () => {
      const dematerializedFeasibilityFile =
        createDematerializedFeasibilityFileEntity({
          sentToCandidateAt: new Date().getTime(),
        });
      const feasibility = createFeasibilityEntity({
        dematerializedFeasibilityFile,
        feasibilityFileSentAt: new Date().getTime(),
      });
      const organism = createOrganismEntity();
      const candidate = createCandidateEntity();

      const candidacy = createCandidacyEntity({
        candidate,
        status: "PARCOURS_CONFIRME",
        certification: createCertificationEntity(),
        goalsCount: 1,
        experiencesCount: 1,
        organism,
        candidacyAlreadySubmitted: true,
        feasibility,
      });
      const { handlers, dashboardWait } = dashboardHandlers({
        candidacy,
      });
      test.use({
        mswHandlers: [handlers, { scope: "test" }],
      });

      test("shows 'Valider mon dossier de faisabilité' and routes", async ({
        page,
      }) => {
        await login(page);
        await dashboardWait(page);
        const btn = page.getByRole("button", {
          name: "Valider mon dossier de faisabilité",
        });
        await expect(btn).toBeVisible();
        await btn.click();
        await expect(page).toHaveURL(
          `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/validate-feasibility/`,
        );
      });
    });

    test.describe("Envoyer votre attestation", () => {
      const dematerializedFeasibilityFile =
        createDematerializedFeasibilityFileEntity({
          sentToCandidateAt: new Date().getTime(),
          candidateConfirmationAt: new Date().getTime(),
        });
      const feasibility = createFeasibilityEntity({
        dematerializedFeasibilityFile,
        feasibilityFileSentAt: new Date().getTime(),
      });
      const organism = createOrganismEntity();
      const candidate = createCandidateEntity();
      const candidacy = createCandidacyEntity({
        candidate,
        status: "PARCOURS_CONFIRME",
        certification: createCertificationEntity(),
        goalsCount: 1,
        experiencesCount: 1,
        organism,
        candidacyAlreadySubmitted: true,
        feasibility,
      });
      const { handlers, dashboardWait } = dashboardHandlers({
        candidacy,
      });
      test.use({
        mswHandlers: [handlers, { scope: "test" }],
      });

      test("shows 'Envoyer votre attestation' and opens modal on click", async ({
        page,
      }) => {
        await login(page);
        await dashboardWait(page);
        const btn = page.getByRole("button", {
          name: "Envoyer votre attestation",
        });
        await expect(btn).toBeVisible();
        await btn.click();
        await expect(
          page.getByRole("heading", {
            name: "Envoi de l'attestation sur l'honneur",
          }),
        ).toBeVisible();
      });
    });
  });

  test.describe("AUTONOME", () => {
    test.describe("Compléter mes formations", () => {
      const certification = createCertificationEntity();
      const candidate = createCandidateEntity();
      const candidacy = createCandidacyEntity({
        candidate,
        status: "PROJET",
        certification,
        goalsCount: 1,
        experiencesCount: 1,
      });

      const { handlers, dashboardWait } = dashboardHandlers({
        candidacy,
        activeFeaturesForConnectedUser: ["DF_DEMAT_AUTONOME"],
      });
      test.use({
        mswHandlers: [handlers, { scope: "test" }],
      });

      test("shows 'Compléter mes formations' when no formations", async ({
        page,
      }) => {
        await login(page);
        await dashboardWait(page);
        await expect(
          page.getByRole("button", { name: "Compléter mes formations" }),
        ).toBeVisible();
      });
    });

    test.describe("Envoyer mon dossier de faisabilité pdf", () => {
      const candidate = createCandidateEntity();
      const candidacy = createCandidacyEntity({
        candidate,
        status: "PROJET",
        certification: createCertificationEntity(),
        feasibility: null,
        feasibilityFormat: "UPLOADED_PDF",
      });
      const { handlers, dashboardWait } = dashboardHandlers({
        candidacy,
      });
      test.use({
        mswHandlers: [handlers, { scope: "test" }],
      });

      test("shows 'Envoyer mon dossier de faisabilité' and routes", async ({
        page,
      }) => {
        await login(page);
        await dashboardWait(page);
        const btn = page.getByRole("button", {
          name: "Envoyer mon dossier de faisabilité",
        });
        await expect(btn).toBeVisible();
        await Promise.all([
          page.waitForURL(
            `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/feasibility/`,
          ),
          btn.click(),
        ]);
        await expect(page).toHaveURL(
          `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/feasibility/`,
        );
      });
    });

    test.describe("Envoyer mon dossier de faisabilité dématérialisé ressources", () => {
      const candidate = createCandidateEntity();
      const candidacy = createCandidacyEntity({
        candidate,
        status: "PROJET",
        certification: createCertificationEntity(),
        feasibility: null,
        feasibilityFormat: "DEMATERIALIZED",
      });
      const { handlers, dashboardWait } = dashboardHandlers({
        candidacy,
      });
      test.use({
        mswHandlers: [handlers, { scope: "test" }],
      });

      test("shows 'Envoyer mon dossier de faisabilité' and routes", async ({
        page,
      }) => {
        await login(page);
        await dashboardWait(page);
        const btn = page.getByRole("button", {
          name: "Envoyer mon dossier de faisabilité",
        });
        await expect(btn).toBeVisible();
        await Promise.all([
          page.waitForURL(
            `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/feasibility-demat-autonome-resources/`,
          ),
          btn.click(),
        ]);
        await expect(page).toHaveURL(
          `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/feasibility-demat-autonome-resources/`,
        );
      });
    });

    test.describe("Envoyer mon dossier de faisabilité dématérialisé", () => {
      const candidate = createCandidateEntity();
      const candidacy = createCandidacyEntity({
        candidate,
        status: "PROJET",
        certification: createCertificationEntity(),
        feasibility: null,
        feasibilityFormat: "DEMATERIALIZED",
        feasibilityFileDematAutonomeResourceHidden: true,
      });
      const { handlers, dashboardWait } = dashboardHandlers({
        candidacy,
      });
      test.use({
        mswHandlers: [handlers, { scope: "test" }],
      });

      test("shows 'Envoyer mon dossier de faisabilité' and routes", async ({
        page,
      }) => {
        await login(page);
        await dashboardWait(page);
        const btn = page.getByRole("button", {
          name: "Envoyer mon dossier de faisabilité",
        });
        await expect(btn).toBeVisible();
        await Promise.all([
          page.waitForURL(
            `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/feasibility-demat-autonome/`,
          ),
          btn.click(),
        ]);
        await expect(page).toHaveURL(
          `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/feasibility-demat-autonome/`,
        );
      });
    });
  });

  test.describe("SHARED", () => {
    test.describe("Renseigner une date prévisionnelle de dépot de dossier de validation", () => {
      typesAccompagnement.forEach((typeAccompagnement) => {
        test.describe(`${typeAccompagnement}`, () => {
          const feasibility = createFeasibilityEntity({
            decision: "ADMISSIBLE",
            feasibilityFileSentAt: new Date().getTime(),
          });
          const organism = createOrganismEntity();
          const candidate = createCandidateEntity();

          const candidacy = createCandidacyEntity({
            candidate,
            status: "PROJET",
            certification: createCertificationEntity(),
            goalsCount: 1,
            experiencesCount: 1,
            typeAccompagnement,
            organism: typeAccompagnement === "AUTONOME" ? undefined : organism,
            feasibility,
          });
          const { handlers, dashboardWait } = dashboardHandlers({
            candidacy,
          });
          test.use({
            mswHandlers: [handlers, { scope: "test" }],
          });

          test("shows 'Renseigner une date prévisionnelle ...' and routes", async ({
            page,
          }) => {
            await login(page);
            await dashboardWait(page);
            const btn = page.getByRole("button", {
              name: /Renseigner une date prévisionnelle/,
            });
            await expect(btn).toBeVisible();
            await btn.click();
            await expect(page).toHaveURL(
              `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/dossier-de-validation/`,
            );
          });
        });
      });
    });

    test.describe("Envoyer mon dossier de validation", () => {
      type ValidationScenario =
        | { label: "no decision"; activeDossierDeValidationDecision: null }
        | {
            label: "incomplete";
            activeDossierDeValidationDecision: "INCOMPLETE";
          }
        | { label: "after failed jury"; jury: JuryEntity };

      const scenarios: ValidationScenario[] = [
        { label: "no decision", activeDossierDeValidationDecision: null },
        {
          label: "incomplete",
          activeDossierDeValidationDecision: "INCOMPLETE",
        },
        {
          label: "after failed jury",
          jury: createJuryEntity({ result: "FAILURE" }),
        },
      ];

      scenarios.forEach((scenario) => {
        test.describe(scenario.label, () => {
          let activeDossierDeValidation;
          if (scenario.label === "incomplete") {
            activeDossierDeValidation = createDossierDeValidationEntity({
              decision: "INCOMPLETE",
            });
          }
          const feasibility = createFeasibilityEntity({
            decision: "ADMISSIBLE",
            feasibilityFileSentAt: new Date().getTime(),
          });
          const candidate = createCandidateEntity();

          const candidacy = createCandidacyEntity({
            candidate,
            feasibility,
            activeDossierDeValidation,
            jury: scenario.label === "after failed jury" ? scenario.jury : null,
          });
          const { handlers, dashboardWait } = dashboardHandlers({
            candidacy,
          });
          test.use({
            mswHandlers: [handlers, { scope: "test" }],
          });

          test("shows 'Envoyer mon dossier de validation' and routes", async ({
            page,
          }) => {
            await login(page);
            await dashboardWait(page);
            const btn = page.getByRole("button", {
              name: "Envoyer mon dossier de validation",
            });
            await expect(btn).toBeVisible();
            await btn.click();
            await expect(page).toHaveURL(
              `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/dossier-de-validation/`,
            );
          });
        });
      });
    });

    test.describe("Aucune action attendue de votre part.", () => {
      const feasibility = createFeasibilityEntity({
        decision: "PENDING",
        feasibilityFileSentAt: new Date().getTime(),
      });
      const candidate = createCandidateEntity();
      const candidacy = createCandidacyEntity({
        candidate,
        feasibility,
        goalsCount: 1,
        experiencesCount: 1,
        typeAccompagnement: "ACCOMPAGNE",
      });
      const { handlers, dashboardWait } = dashboardHandlers({
        candidacy,
      });
      test.use({
        mswHandlers: [handlers, { scope: "test" }],
      });

      test("shows 'Aucune action attendue de votre part.' tile", async ({
        page,
      }) => {
        await login(page);
        await dashboardWait(page);
        await expect(
          page.locator('[data-testid="no-action-tile"]'),
        ).toBeVisible();
      });
    });
  });
});
