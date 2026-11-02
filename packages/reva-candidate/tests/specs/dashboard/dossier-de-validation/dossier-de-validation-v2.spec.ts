import { format } from "date-fns";
import { expect, test } from "next/experimental/testmode/playwright/msw";

import { login } from "@tests/helpers/auth/auth";
import {
  createCandidacyEntity,
  type CandidacyEntity,
  type CreateCandidacyEntityOptions,
} from "@tests/helpers/entities/create-candidacy.entity";
import { createCandidateEntity } from "@tests/helpers/entities/create-candidate.entity";
import { createCertificationEntity } from "@tests/helpers/entities/create-certification.entity";
import { createFeasibilityEntity } from "@tests/helpers/entities/create-feasibility.entity";
import {
  dossierDeValidationV2Handlers,
  navigateToDossierValidationV2,
} from "@tests/helpers/handlers/dossier-de-validation/dossier-de-validation.handler";
import { uploadFile } from "@tests/helpers/handlers/dossier-de-validation/upload";

import type { MswFixture } from "next/experimental/testmode/playwright/msw";
import type { Page } from "playwright";

const ESTIMATED_DATE = "2026-12-15";
const AMENAGEMENT_CHECKBOX_LABEL =
  "Intégrer une demande d’aménagement spécifique de jury";
const FILE_REQUIRED_ERROR = "Vous devez sélectionner un fichier à transmettre.";
const DESCRIPTION_REQUIRED_ERROR =
  "Ce champ doit contenir au moins 10 caractères";
const DOSSIER_FILE_INPUT = 'input[name="dossierDeValidationFile"]';

function createCandidacy(
  overrides: CreateCandidacyEntityOptions = {},
): CandidacyEntity {
  return createCandidacyEntity({
    certification: createCertificationEntity(),
    candidate: createCandidateEntity(),
    typeAccompagnement: "AUTONOME",
    status: "DOSSIER_FAISABILITE_RECEVABLE",
    feasibility: createFeasibilityEntity({
      decision: "ADMISSIBLE",
      feasibilityFileSentAt: Date.now(),
    }),
    ...overrides,
  });
}

async function openDossierDeValidationV2(
  page: Page,
  msw: MswFixture,
  candidacy: CandidacyEntity,
) {
  const { handlers, dossierDeValidationV2Wait } = dossierDeValidationV2Handlers(
    { candidacy },
  );
  msw.use(...handlers);

  await login(page);
  await navigateToDossierValidationV2(
    page,
    candidacy.candidate?.id,
    candidacy.id,
  );
  await dossierDeValidationV2Wait(page);
}

function tileByTitle(page: Page, title: string) {
  return page.locator(".fr-tile").filter({
    has: page.getByRole("link", { name: title, exact: true }),
  });
}

async function openDepotPage(page: Page) {
  await tileByTitle(page, "Déposer un dossier de validation")
    .getByRole("link")
    .click();

  await expect(
    page.getByRole("heading", { name: "Dépôt du dossier de validation" }),
  ).toBeVisible();
}

async function startDepotWithAmenagement(page: Page) {
  await page.locator("label", { hasText: AMENAGEMENT_CHECKBOX_LABEL }).click();
  await expect(
    page.getByRole("checkbox", { name: AMENAGEMENT_CHECKBOX_LABEL }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Commencer" }).click();
}

test.describe("Dossier de validation v2", () => {
  test("should show the planned date and submission tiles and open their pages when no dossier has been sent", async ({
    page,
    msw,
  }) => {
    const candidacy = createCandidacy();
    await openDossierDeValidationV2(page, msw, candidacy);

    const dateTile = tileByTitle(page, "Renseigner une date prévisionnelle");
    const submissionTile = tileByTitle(
      page,
      "Déposer un dossier de validation",
    );

    await expect(dateTile).toBeVisible();
    await expect(submissionTile).toBeVisible();

    await dateTile.getByRole("link").click();
    await expect(page).toHaveURL(
      `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/dossier-de-validation-v2/date-previsionnelle/`,
    );
    await expect(
      page.getByRole("heading", {
        name: "Date prévisionnelle de dépôt du dossier de validation",
      }),
    ).toBeVisible();

    await page.goBack();
    await expect(submissionTile).toBeVisible();

    await submissionTile.getByRole("link").click();
    await expect(page).toHaveURL(
      `/candidat/candidates/${candidacy.candidate?.id}/candidacies/${candidacy.id}/dossier-de-validation-v2/depot-dv/`,
    );
    await expect(
      page.getByRole("heading", { name: "Dépôt du dossier de validation" }),
    ).toBeVisible();
  });

  test("should display the planned date on its tile once the candidate has set it", async ({
    page,
    msw,
  }) => {
    const candidacy = createCandidacy({
      readyForJuryEstimatedAt: ESTIMATED_DATE,
    });
    await openDossierDeValidationV2(page, msw, candidacy);

    const dateTile = tileByTitle(page, "Date prévisionnelle");

    await expect(dateTile).toBeVisible();
    await expect(dateTile).toContainText(format(ESTIMATED_DATE, "dd/MM/yyyy"));
    await expect(dateTile).toContainText("Modifier");
    await expect(
      tileByTitle(page, "Renseigner une date prévisionnelle"),
    ).toHaveCount(0);
  });

  test("should show a three-step form, with the amenagement request on the second step, when it is requested", async ({
    page,
    msw,
  }) => {
    const candidacy = createCandidacy();
    await openDossierDeValidationV2(page, msw, candidacy);
    await openDepotPage(page);
    await startDepotWithAmenagement(page);

    const stepperSteps = page.locator(".fr-stepper__steps");
    await expect(stepperSteps).toHaveAttribute("data-fr-steps", "3");
    await expect(stepperSteps).toHaveAttribute("data-fr-current-step", "1");
    await expect(page.locator(".fr-stepper__state")).toHaveText(
      "Étape 1 sur 3",
    );
    await expect(page.locator(".fr-stepper__title")).toContainText(
      "Dépot du dossier",
    );
    await expect(page.locator(".fr-stepper__details")).toContainText(
      "Demande d’aménagement spécifique du jury",
    );

    await uploadFile(page, DOSSIER_FILE_INPUT, "dossier.pdf", "dossier");
    await page.getByRole("button", { name: "Suivant" }).click();

    await expect(stepperSteps).toHaveAttribute("data-fr-current-step", "2");
    await expect(page.locator(".fr-stepper__state")).toHaveText(
      "Étape 2 sur 3",
    );
    await expect(page.locator(".fr-stepper__title")).toContainText(
      "Demande d’aménagement spécifique du jury",
    );
    await expect(
      page.getByRole("textbox", {
        name: "Besoin d’un aménagement spécifique pour le passage devant le jury :",
      }),
    ).toBeVisible();
    await expect(page.getByText("Joindre le justificatif")).toBeVisible();
  });

  test("should show an error on each step when clicking suivant without the required fields", async ({
    page,
    msw,
  }) => {
    const candidacy = createCandidacy();
    await openDossierDeValidationV2(page, msw, candidacy);
    await openDepotPage(page);
    await startDepotWithAmenagement(page);

    await page.getByRole("button", { name: "Suivant" }).click();

    const dossierFileError = page.locator(
      ".dossier-de-validation-file-upload .fr-error-text",
    );
    await expect(dossierFileError).toBeVisible();
    await expect(dossierFileError).toContainText(FILE_REQUIRED_ERROR);
    await expect(page.locator(".fr-stepper__steps")).toHaveAttribute(
      "data-fr-current-step",
      "1",
    );

    await uploadFile(page, DOSSIER_FILE_INPUT, "dossier.pdf", "dossier");
    await page.getByRole("button", { name: "Suivant" }).click();
    await expect(page.locator(".fr-stepper__state")).toHaveText(
      "Étape 2 sur 3",
    );

    await page.getByRole("button", { name: "Suivant" }).click();

    await expect(page.getByText(DESCRIPTION_REQUIRED_ERROR)).toBeVisible();
    await expect(page.getByText(FILE_REQUIRED_ERROR)).toBeVisible();
    await expect(page.locator(".fr-stepper__steps")).toHaveAttribute(
      "data-fr-current-step",
      "2",
    );
  });
});
