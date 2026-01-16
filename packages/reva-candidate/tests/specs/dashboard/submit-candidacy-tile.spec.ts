import { expect, test } from "next/experimental/testmode/playwright/msw";

import { login } from "@tests/helpers/auth/auth";
import { createCandidacyEntity } from "@tests/helpers/entities/create-candidacy.entity";
import { createCandidateEntity } from "@tests/helpers/entities/create-candidate.entity";
import { createCertificationEntity } from "@tests/helpers/entities/create-certification.entity";
import { createOrganismEntity } from "@tests/helpers/entities/create-organism.entity";
import {
  dashboardHandlers,
  type DashboardHandlersOptions,
} from "@tests/helpers/handlers/dashboard.handler";

import type { CandidacyStatusStep } from "@/graphql/generated/graphql";

import type { CreateCandidacyEntityOptions } from "@tests/helpers/entities/create-candidacy.entity";
import type { MswFixture } from "next/experimental/testmode/playwright/msw";
import type { Page } from "playwright";

const createCandidacy = (options: Partial<CreateCandidacyEntityOptions> = {}) =>
  createCandidacyEntity({
    candidate: createCandidateEntity(),
    certification: createCertificationEntity(),
    organism: createOrganismEntity(),
    status: "PROJET",
    ...options,
  });

const setupDashboard = async (
  page: Page,
  msw: MswFixture,
  options: Partial<DashboardHandlersOptions> = {},
) => {
  const { handlers, dashboardWait } = dashboardHandlers({
    candidacy: options.candidacy || createCandidacy(),
    activeFeaturesForConnectedUser: [],
    ...options,
  });

  msw.use(...handlers);
  await login(page);
  await dashboardWait(page);

  return page.getByTestId("submit-candidacy-tile");
};

test.describe("Tile is enabled", () => {
  const enabledStatuses: CandidacyStatusStep[] = [
    "VALIDATION",
    "PRISE_EN_CHARGE",
  ];

  for (const status of enabledStatuses) {
    test(`should be enabled when status is ${status}`, async ({
      page,
      msw,
    }) => {
      const tile = await setupDashboard(page, msw, {
        candidacy: createCandidacy({ status }),
      });

      await expect(tile.getByRole("button")).toBeEnabled();
    });
  }

  test("should show 'à envoyer' badge when all sections are complete", async ({
    page,
    msw,
  }) => {
    const tile = await setupDashboard(page, msw, {
      candidacy: createCandidacy({ goalsCount: 1, experiencesCount: 1 }),
    });

    await expect(tile.getByRole("button")).toBeEnabled();
    await expect(tile).toContainText("Vérifier et envoyer");
  });

  const submittedStatuses: CandidacyStatusStep[] = [
    "VALIDATION",
    "PRISE_EN_CHARGE",
    "PARCOURS_ENVOYE",
    "PARCOURS_CONFIRME",
    "DOSSIER_FAISABILITE_ENVOYE",
    "DOSSIER_FAISABILITE_RECEVABLE",
    "DOSSIER_DE_VALIDATION_ENVOYE",
  ];

  for (const status of submittedStatuses) {
    test(`should show 'Envoyée' badge when status is ${status}`, async ({
      page,
      msw,
    }) => {
      const tile = await setupDashboard(page, msw, {
        candidacy: createCandidacy({
          status,
          candidacyAlreadySubmitted: true,
        }),
      });

      await expect(tile.getByRole("button")).toBeEnabled();
      await expect(tile.getByTestId("sent-badge")).toBeVisible();
    });
  }
});

test.describe("Tile is disabled", () => {
  test("should be disabled when goals are missing", async ({ page, msw }) => {
    const tile = await setupDashboard(page, msw, {
      candidacy: createCandidacy({ experiencesCount: 1 }),
    });

    await expect(tile.getByRole("button")).toBeDisabled();
  });

  test("should be disabled when experiences are missing", async ({
    page,
    msw,
  }) => {
    const tile = await setupDashboard(page, msw, {
      candidacy: createCandidacy({ goalsCount: 1 }),
    });

    await expect(tile.getByRole("button")).toBeDisabled();
  });
});
