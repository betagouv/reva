import { subMonths } from "date-fns";
import { expect, test } from "next/experimental/testmode/playwright/msw";

import { createCandidacyDropOutEntity } from "@tests/helpers/entities/create-candidacy-dropout.entity";
import { createCandidacyEntity } from "@tests/helpers/entities/create-candidacy.entity";
import { createCandidateEntity } from "@tests/helpers/entities/create-candidate.entity";
import { loginAndWaitForCandidaciesInitialLoad } from "@tests/helpers/handlers/candidacies/candidacies-guards.handler";
import { candidacyDropOutHandlers } from "@tests/helpers/handlers/candidacy-dropout.handler";

import type { CandidacyDropOut } from "@/graphql/generated/types";

import type { Page } from "@playwright/test";
import type { MswFixture } from "next/experimental/testmode/playwright/msw";

const candidate = createCandidateEntity();

const createCandidacy = ({
  candidacyDropOut = createCandidacyDropOutEntity(),
}: {
  candidacyDropOut?: CandidacyDropOut | null;
} = {}) =>
  createCandidacyEntity({
    candidate,
    candidacyDropOut,
  });

async function setupDropOutWarningPage(
  page: Page,
  msw: MswFixture,
  {
    candidacy = createCandidacy(),
  }: {
    candidacy?: ReturnType<typeof createCandidacy>;
  } = {},
) {
  msw.use(...candidacyDropOutHandlers({ candidacy }));
  await loginAndWaitForCandidaciesInitialLoad(page);

  return candidacy;
}

test.describe("Candidacy dropout warning", () => {
  test("should redirect to candidacy dropout decision page when the drop out has not been confirmed", async ({
    page,
    msw,
  }) => {
    const candidacy = await setupDropOutWarningPage(page, msw);

    await expect(page).toHaveURL(
      `/candidat/candidates/${candidate.id}/candidacies/${candidacy.id}/candidacy-dropout-decision/`,
    );
  });

  test("should not show the decision button when a drop out proof has been given by the aap", async ({
    page,
    msw,
  }) => {
    const candidacy = await setupDropOutWarningPage(page, msw, {
      candidacy: createCandidacy({
        candidacyDropOut: createCandidacyDropOutEntity({
          proofReceivedByAdmin: true,
        }),
      }),
    });

    await page.goto(
      `/candidat/candidates/${candidate.id}/candidacies/${candidacy.id}/`,
    );

    await expect(page.getByTestId("drop-out-warning")).toBeVisible();
    await expect(
      page.getByTestId("drop-out-warning-decision-button"),
    ).toHaveCount(0);
  });

  test("should not show the decision button when the drop out has been confirmed by the candidate", async ({
    page,
    msw,
  }) => {
    const candidacy = await setupDropOutWarningPage(page, msw, {
      candidacy: createCandidacy({
        candidacyDropOut: createCandidacyDropOutEntity({
          dropOutConfirmedByCandidate: true,
        }),
      }),
    });

    await page.goto(
      `/candidat/candidates/${candidate.id}/candidacies/${candidacy.id}/`,
    );

    await expect(page.getByTestId("drop-out-warning")).toBeVisible();
    await expect(
      page.getByTestId("drop-out-warning-decision-button"),
    ).toHaveCount(0);
  });

  test("should not show the decision button when it has been more than 6 months since the drop out", async ({
    page,
    msw,
  }) => {
    const candidacy = await setupDropOutWarningPage(page, msw, {
      candidacy: createCandidacy({
        candidacyDropOut: createCandidacyDropOutEntity({
          createdAt: subMonths(new Date(), 6).getTime(),
        }),
      }),
    });

    await page.goto(
      `/candidat/candidates/${candidate.id}/candidacies/${candidacy.id}/`,
    );

    await expect(page.getByTestId("drop-out-warning")).toBeVisible();
    await expect(
      page.getByTestId("drop-out-warning-decision-button"),
    ).toHaveCount(0);
  });

  test("should not show the warning when the candidacy has not been dropped out", async ({
    page,
    msw,
  }) => {
    await setupDropOutWarningPage(page, msw, {
      candidacy: createCandidacy({ candidacyDropOut: null }),
    });

    await expect(page.getByTestId("drop-out-warning")).toHaveCount(0);
  });
});
