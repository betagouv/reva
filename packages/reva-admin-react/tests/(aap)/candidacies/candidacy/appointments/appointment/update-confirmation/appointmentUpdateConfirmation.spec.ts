import {
  expect,
  graphql,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../../../../../shared/helpers/auth/login";
import { getAAPCommonHandlers } from "../../../../../../shared/helpers/common-handlers/aap/getAapCommon.handlers";
import { graphQLResolver } from "../../../../../../shared/helpers/network/msw";
import { waitGraphQL } from "../../../../../../shared/helpers/network/requests";

import type { Page } from "@playwright/test";

const fvae = graphql.link("https://reva-api/api/graphql");

const CANDIDACY_ID = "fb451fbc-3218-416d-9ac9-65b13432469f";
const APPOINTMENT_ID = "5e3acd4a-128f-4d1d-b9d7-4a1bd126bdd3";

function createUpdateConfirmationHandlers() {
  return [
    fvae.query(
      "getCandidacyAndAppointmentForAppointmentUpdateConfirmationPage",
      graphQLResolver({
        getCandidacyById: {
          id: CANDIDACY_ID,
          candidate: {
            id: "6c814f7c-09a0-4621-9a0e-5bf5212696c8",
            firstname: "John",
            lastname: "Doe",
          },
        },
        appointment_getAppointmentById: {
          id: APPOINTMENT_ID,
          title: "Rendez-vous pédagogique",
          date: "2025-01-01",
          time: "10:00:00.000Z",
        },
      }),
    ),
  ];
}

const { aapCommonHandlers, aapCommonWait } = getAAPCommonHandlers();

async function waitForUpdateConfirmationQueries(page: Page) {
  await waitGraphQL(
    page,
    "getCandidacyAndAppointmentForAppointmentUpdateConfirmationPage",
  );
}

async function waitForAllQueries(page: Page) {
  await Promise.all([
    aapCommonWait(page),
    waitForUpdateConfirmationQueries(page),
  ]);
}

test.describe("when I access the update appointment confirmation page", () => {
  test.use({
    mswHandlers: [
      [...aapCommonHandlers, ...createUpdateConfirmationHandlers()],
      { scope: "test" },
    ],
  });

  test("show the correct title", async ({ page }) => {
    await login({ role: "aap", page });
    await page.goto(
      `/admin2/candidacies/${CANDIDACY_ID}/appointments/${APPOINTMENT_ID}/update-confirmation`,
    );
    await waitForAllQueries(page);

    await expect(
      page.getByTestId("appointment-update-confirmation-page-title"),
    ).toHaveText("Rendez-vous enregistré");
  });

  test("let me click on the 'Gestion des rendez-vous' button and redirect me to the appointments page", async ({
    page,
  }) => {
    await login({ role: "aap", page });
    await page.goto(
      `/admin2/candidacies/${CANDIDACY_ID}/appointments/${APPOINTMENT_ID}/update-confirmation`,
    );
    await waitForAllQueries(page);

    await page
      .getByTestId(
        "appointment-update-confirmation-page-go-back-to-appointments-button",
      )
      .click();

    await expect(page).toHaveURL(
      `/admin2/candidacies/${CANDIDACY_ID}/appointments/`,
    );
  });
});
