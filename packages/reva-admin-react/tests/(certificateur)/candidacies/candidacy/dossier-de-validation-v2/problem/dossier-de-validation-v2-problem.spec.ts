import {
  expect,
  graphql,
  HttpResponse,
  Page,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../../../../shared/helpers/auth/login";
import { getCertificateurCommonHandlers } from "../../../../../shared/helpers/common-handlers/certificateur/getCertificateurCommon.handlers";
import { graphQLResolver } from "../../../../../shared/helpers/network/msw";
import { waitGraphQL } from "../../../../../shared/helpers/network/requests";

const fvae = graphql.link("https://reva-api/api/graphql");

const CANDIDACY_ID = "42288593-2a6b-4606-aedd-0d76348b39f4";
const DOSSIER_DE_VALIDATION_ID = "ddv-id-1";
const PROBLEM_PAGE_PATH = `/admin2/candidacies/${CANDIDACY_ID}/dossier-de-validation-v2/problem`;
const MAIN_PAGE_PATH = `/admin2/candidacies/${CANDIDACY_ID}/dossier-de-validation-v2`;
// Next.js normalizes every rendered/navigated-to URL with a trailing
// slash, so URL assertions (unlike page.goto, which tolerates either
// form) must match that exact trailing-slash form.
const PROBLEM_PAGE_URL = `${PROBLEM_PAGE_PATH}/`;
const MAIN_PAGE_URL = `${MAIN_PAGE_PATH}/`;
const SENT_AT = 1716984000000; // 2024-05-29

const { certificateurCommonHandlers, certificateurCommonWait } =
  getCertificateurCommonHandlers({
    candidacyId: CANDIDACY_ID,
    candidateFirstname: "Camille",
    candidateLastname: "Durand",
  });

const getCandidacyQueryHandler = fvae.query(
  "getCandidacyWithDossierDeValidationQueryForProblemPage",
  graphQLResolver({
    getCandidacyById: {
      id: CANDIDACY_ID,
      activeDossierDeValidation: {
        id: DOSSIER_DE_VALIDATION_ID,
        dossierDeValidationSentAt: SENT_AT,
      },
    },
  }),
);

async function openProblemPage(page: Page) {
  await login({ page, role: "certificateur" });
  await page.goto(PROBLEM_PAGE_PATH);
  await Promise.all([
    certificateurCommonWait(page),
    // This query is only reachable through the local v2 copy of
    // dossierDeValidationProblemPageLogic.ts. If problem/page.tsx ever
    // regresses back to importing the sibling legacy folder's logic file,
    // this query is never requested and this wait times out, failing
    // every test below.
    waitGraphQL(page, "getCandidacyWithDossierDeValidationQueryForProblemPage"),
  ]);
}

test.describe("Dossier de validation v2 – problem page", () => {
  test.use({
    mswHandlers: [
      [
        ...certificateurCommonHandlers,
        getCandidacyQueryHandler,
        fvae.mutation(
          "dossierDeValidation_markAsIncomplete",
          graphQLResolver({
            dossierDeValidation_markAsIncomplete: {
              id: DOSSIER_DE_VALIDATION_ID,
            },
          }),
        ),
      ],
      { scope: "test" },
    ],
  });

  test.beforeEach(async ({ page }) => {
    await openProblemPage(page);
  });

  test("shows the heading, disclaimer and deposit date", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Demander une correction", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Sauf mention contraire “(optionnel)” dans le label, tous les champs sont obligatoires.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Dossier déposé le :")).toBeVisible();
    await expect(page.getByText("29/05/2024")).toBeVisible();
  });

  test("keeps the submit button disabled until the observations field has content", async ({
    page,
  }) => {
    const submitButton = page.getByRole("button", {
      name: "Envoyer le formulaire",
    });
    const textarea = page.getByLabel("Observations à transmettre :");

    await expect(submitButton).toBeDisabled();

    await textarea.fill("Un problème.");
    await expect(submitButton).toBeEnabled();

    await textarea.fill("");
    await expect(submitButton).toBeDisabled();
  });

  test("submits the mutation with the correct variables, shows a success toast, and redirects to the v2 page", async ({
    page,
  }) => {
    await page
      .getByLabel("Observations à transmettre :")
      .fill("Pièce manquante : justificatif de domicile.");

    const mutationRequest = waitGraphQL(
      page,
      "dossierDeValidation_markAsIncomplete",
    );
    await page.getByRole("button", { name: "Envoyer le formulaire" }).click();
    const mutationResponse = await mutationRequest;

    const { variables } = mutationResponse.request().postDataJSON();
    expect(variables.dossierDeValidationId).toBe(DOSSIER_DE_VALIDATION_ID);
    expect(variables.decisionComment).toBe(
      "Pièce manquante : justificatif de domicile.",
    );

    await expect(page.getByTestId("toast-success")).toBeVisible();

    // Regression: must redirect to the v2 page, not the legacy
    // (non "-v2") dossier-de-validation page.
    await expect(page).toHaveURL(MAIN_PAGE_URL);
  });

  test("navigates back to the v2 page when the back button is clicked on a pristine form", async ({
    page,
  }) => {
    await page.getByTestId("back-button").click();

    // Regression: must navigate to the v2 page, not the legacy
    // (non "-v2") dossier-de-validation page.
    await expect(page).toHaveURL(MAIN_PAGE_URL);
  });

  test("navigates back to the v2 page via the leave-page confirmation modal on a dirty form", async ({
    page,
  }) => {
    await page.getByLabel("Observations à transmettre :").fill("Un problème.");

    await page.getByTestId("back-button").click();

    await expect(
      page.getByRole("dialog", {
        name: "Voulez-vous vraiment quitter la page ?",
      }),
    ).toBeVisible();

    await page.getByTestId("leave-page-button").click();

    await expect(page).toHaveURL(MAIN_PAGE_URL);
  });
});

test.describe("Dossier de validation v2 – problem page — when the correction fails to save", () => {
  test.use({
    mswHandlers: [
      [
        ...certificateurCommonHandlers,
        getCandidacyQueryHandler,
        fvae.mutation("dossierDeValidation_markAsIncomplete", () =>
          HttpResponse.json({
            errors: [{ message: "Une erreur est survenue" }],
          }),
        ),
      ],
      { scope: "test" },
    ],
  });

  test.beforeEach(async ({ page }) => {
    await openProblemPage(page);
  });

  test("shows an error toast and does not redirect", async ({ page }) => {
    await page
      .getByLabel("Observations à transmettre :")
      .fill("Pièce manquante : justificatif de domicile.");

    // waitGraphQL only resolves for responses without GraphQL `errors`,
    // so the error toast itself is the completion signal here.
    await page.getByRole("button", { name: "Envoyer le formulaire" }).click();

    await expect(page.getByTestId("toast-error")).toBeVisible();
    await expect(page).toHaveURL(PROBLEM_PAGE_URL);
  });
});
