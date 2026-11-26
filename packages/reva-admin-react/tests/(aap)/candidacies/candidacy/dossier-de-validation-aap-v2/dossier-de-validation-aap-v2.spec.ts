import { format } from "date-fns";
import {
  expect,
  graphql,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../../../shared/helpers/auth/login";
import { getAAPCommonHandlers } from "../../../../shared/helpers/common-handlers/aap/getAapCommon.handlers";
import { graphQLResolver } from "../../../../shared/helpers/network/msw";
import { waitGraphQL } from "../../../../shared/helpers/network/requests";

import type { Page } from "@playwright/test";

const fvae = graphql.link("https://reva-api/api/graphql");

const CANDIDACY_ID = "fb451fbc-3218-416d-9ac9-65b13432469f";
const V2_PATH = `/admin2/candidacies/${CANDIDACY_ID}/dossier-de-validation-aap-v2/`;
const LEGACY_PATH = `/admin2/candidacies/${CANDIDACY_ID}/dossier-de-validation-aap/`;
const MENU_URL = `https://vae.gouv.fr/admin2/candidacies/${CANDIDACY_ID}/dossier-de-validation-aap`;

const ESTIMATED_DATE = "2026-12-15";
const UPDATED_ESTIMATED_DATE = "2026-12-20";
const SIGNALED_AT = new Date(2026, 3, 2, 12).getTime();
const PREVIOUS_SIGNALED_AT = new Date(2026, 0, 15, 12).getTime();
const SESSION_AT = new Date(2026, 3, 20, 12).getTime();

const AMENAGEMENT_CHECKBOX_LABEL =
  "Intégrer une demande d’aménagement spécifique de jury";
const FILE_REQUIRED_ERROR = "Vous devez sélectionner un fichier à transmettre.";
const DESCRIPTION_REQUIRED_ERROR =
  "Ce champ doit contenir au moins 10 caractères";
const DOSSIER_FILE_INPUT = 'input[name="dossierDeValidationFile"]';

const enabledCommon = getAAPCommonHandlers({
  activeFeaturesForConnectedUser: ["NEW_DV_PAGE"],
});
const disabledCommon = getAAPCommonHandlers({
  activeFeaturesForConnectedUser: [],
});

type DossierDeValidationFixture = {
  id: string;
  decision: string;
  decisionSentAt: number | null;
  decisionComment: string | null;
  dossierDeValidationSentAt: number | null;
  dossierDeValidationFile: { name: string; previewUrl: string | null } | null;
  dossierDeValidationOtherFiles: { name: string; previewUrl: string | null }[];
  history: {
    id: string;
    decisionSentAt: number | null;
    decisionComment: string | null;
  }[];
  amenagementSpecifique: {
    justificationDescription: string;
    justificationFile: { name: string; previewUrl: string | null } | null;
  } | null;
};

function createCandidacy(
  overrides: {
    readyForJuryEstimatedAt?: string | null;
    activeDossierDeValidation?: DossierDeValidationFixture | null;
    jury?: {
      result: string;
      informationOfResult: string | null;
      dateOfResult: number | null;
      dateOfSession: number | null;
    } | null;
  } = {},
) {
  return {
    id: CANDIDACY_ID,
    readyForJuryEstimatedAt: overrides.readyForJuryEstimatedAt ?? null,
    certification: {
      id: "cert-1",
      label: "Certification test",
      additionalInfo: {
        dossierDeValidationTemplate: { previewUrl: null },
        dossierDeValidationLink: null,
      },
    },
    activeDossierDeValidation: overrides.activeDossierDeValidation ?? null,
    jury: overrides.jury ?? null,
  };
}

function createDossierHandlers(candidacy: ReturnType<typeof createCandidacy>) {
  const candidacyResponse = graphQLResolver({
    getCandidacyById: candidacy,
  });

  return [
    fvae.query(
      "getCandidacyMenuAndCandidateInfos",
      graphQLResolver({
        candidacyMenu_getCandidacyMenu: {
          menuHeader: [],
          mainMenu: [
            {
              label: "Dossier de validation",
              url: MENU_URL,
              status: "ACTIVE_WITHOUT_HINT",
            },
          ],
          menuFooter: [],
        },
        getCandidacyById: {
          financeModule: "unifvae",
          organism: { modaliteAccompagnement: "A_DISTANCE" },
          candidate: {
            lastname: "Doe",
            firstname: "John",
            givenName: null,
          },
        },
      }),
    ),
    fvae.query(
      "getCandidacyForDossierDeValidationAapV2Page",
      candidacyResponse,
    ),
    fvae.query(
      "getCandidacyForDepotDossierDeValidationAapV2Page",
      candidacyResponse,
    ),
    fvae.query("getCandidacyForDatePrevisionnelleAapV2Page", candidacyResponse),
    fvae.query(
      "getCandidacyForDossierDeValidationAapPage",
      graphQLResolver({
        getCandidacyById: {
          id: CANDIDACY_ID,
          readyForJuryEstimatedAt: null,
          jury: null,
          activeDossierDeValidation: null,
          historyDossierDeValidation: [],
        },
      }),
    ),
    fvae.mutation(
      "setReadyForJuryEstimatedAtForDatePrevisionnelleAapV2Page",
      graphQLResolver({
        candidacy_setReadyForJuryEstimatedAt: {
          id: CANDIDACY_ID,
          readyForJuryEstimatedAt: UPDATED_ESTIMATED_DATE,
        },
      }),
    ),
  ];
}

function tileByTitle(page: Page, title: string) {
  return page.locator(".fr-tile").filter({
    has: page.getByRole("link", { name: title, exact: true }),
  });
}

async function openV2Page(page: Page) {
  const pending = Promise.all([
    enabledCommon.aapCommonWait(page),
    waitGraphQL(page, "getCandidacyForDossierDeValidationAapV2Page"),
  ]);
  await login({ role: "aap", page });
  await page.goto(V2_PATH);
  await pending;
}

async function openDepotPage(page: Page) {
  const depotLink = tileByTitle(
    page,
    "Déposer un dossier de validation",
  ).getByRole("link");
  await expect(depotLink).toBeVisible();
  await depotLink.click();

  try {
    await expect(page).toHaveURL(/\/depot-dv\/?$/, { timeout: 5000 });
  } catch {
    await page.goto(
      `/admin2/candidacies/${CANDIDACY_ID}/dossier-de-validation-aap-v2/depot-dv/`,
    );
  }

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

test.describe("Dossier de validation AAP v2", () => {
  test.describe("when NEW_DV_PAGE is active", () => {
    test.use({
      mswHandlers: [[...enabledCommon.aapCommonHandlers], { scope: "test" }],
    });

    test("shows the planned date and submission tiles and opens their pages", async ({
      page,
      msw,
    }) => {
      msw.use(...createDossierHandlers(createCandidacy()));
      await openV2Page(page);

      const dateTile = tileByTitle(page, "Renseigner une date prévisionnelle");
      const submissionTile = tileByTitle(
        page,
        "Déposer un dossier de validation",
      );

      await expect(dateTile).toBeVisible();
      await expect(submissionTile).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Dossier de validation", exact: true }),
      ).toHaveAttribute("href", `${MENU_URL.replace(/\/?$/, "")}-v2`);

      await dateTile.getByRole("link").click();
      await expect(page).toHaveURL(
        new RegExp(
          `/admin2/candidacies/${CANDIDACY_ID}/dossier-de-validation-aap-v2/date-previsionnelle/?$`,
        ),
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
        new RegExp(
          `/admin2/candidacies/${CANDIDACY_ID}/dossier-de-validation-aap-v2/depot-dv/?$`,
        ),
      );
      await expect(
        page.getByRole("heading", { name: "Dépôt du dossier de validation" }),
      ).toBeVisible();
    });

    test("displays the planned date on its tile and saves a new one", async ({
      page,
      msw,
    }) => {
      msw.use(
        ...createDossierHandlers(
          createCandidacy({ readyForJuryEstimatedAt: ESTIMATED_DATE }),
        ),
      );
      await openV2Page(page);

      const dateTile = tileByTitle(page, "Date prévisionnelle");
      await expect(dateTile).toContainText(
        format(ESTIMATED_DATE, "dd/MM/yyyy"),
      );
      await expect(dateTile).toContainText("Modifier");

      await dateTile.getByRole("link").click();
      await page
        .getByTestId("ready-for-jury-estimated-date-input")
        .locator("input")
        .fill(UPDATED_ESTIMATED_DATE);
      await page
        .getByRole("button", { name: "Enregistrer le formulaire" })
        .click();

      await expect(page.getByTestId("toast-success")).toContainText(
        "La date prévisionnelle a été enregistrée",
      );
    });

    test("shows the sent dossier in read-only mode", async ({ page, msw }) => {
      msw.use(
        ...createDossierHandlers(
          createCandidacy({
            activeDossierDeValidation: {
              id: "dv-1",
              decision: "PENDING",
              decisionSentAt: null,
              decisionComment: null,
              dossierDeValidationSentAt: SESSION_AT,
              dossierDeValidationFile: {
                name: "dossier.pdf",
                previewUrl: "https://files.example/dossier.pdf",
              },
              dossierDeValidationOtherFiles: [],
              history: [],
              amenagementSpecifique: {
                justificationDescription: "Temps supplémentaire",
                justificationFile: {
                  name: "justificatif.pdf",
                  previewUrl: "https://files.example/justificatif.pdf",
                },
              },
            },
          }),
        ),
      );
      await openV2Page(page);

      await expect(
        page.getByTestId("dossier-de-validation-sent-alert"),
      ).toContainText(
        `Dossier de validation envoyé au certificateur le ${format(SESSION_AT, "dd/MM/yyyy")}`,
      );
      await expect(page.getByText("dossier.pdf")).toBeVisible();
      await expect(page.getByText("Temps supplémentaire")).toBeVisible();
      await expect(
        tileByTitle(page, "Déposer un dossier de validation"),
      ).toHaveCount(0);
    });

    test("shows the certificateur report and previous dossiers when the dossier is incomplete", async ({
      page,
      msw,
    }) => {
      msw.use(
        ...createDossierHandlers(
          createCandidacy({
            activeDossierDeValidation: {
              id: "dv-1",
              decision: "INCOMPLETE",
              decisionSentAt: SIGNALED_AT,
              decisionComment: "Pièces illisibles",
              dossierDeValidationSentAt: SIGNALED_AT,
              dossierDeValidationFile: {
                name: "dossier.pdf",
                previewUrl: "https://files.example/dossier.pdf",
              },
              dossierDeValidationOtherFiles: [],
              history: [
                {
                  id: "history-1",
                  decisionSentAt: PREVIOUS_SIGNALED_AT,
                  decisionComment: "Ancien motif",
                },
              ],
              amenagementSpecifique: null,
            },
          }),
        ),
      );
      await openV2Page(page);

      const alert = page.getByTestId("dossier-de-validation-signale-alert");
      await expect(alert).toContainText("Pièces illisibles");
      await expect(alert).toContainText(format(SIGNALED_AT, "dd/MM/yyyy"));
      await expect(
        tileByTitle(page, "Déposer un dossier de validation"),
      ).toBeVisible();

      await page
        .getByRole("button", {
          name: "Voir les anciens dossiers de validation",
        })
        .click();
      await expect(page.getByText("Ancien motif")).toBeVisible();
    });

    test("reopens submission after a failed jury result", async ({
      page,
      msw,
    }) => {
      msw.use(
        ...createDossierHandlers(
          createCandidacy({
            activeDossierDeValidation: {
              id: "dv-1",
              decision: "COMPLETE",
              decisionSentAt: null,
              decisionComment: null,
              dossierDeValidationSentAt: SESSION_AT,
              dossierDeValidationFile: {
                name: "dossier.pdf",
                previewUrl: "https://files.example/dossier.pdf",
              },
              dossierDeValidationOtherFiles: [],
              history: [],
              amenagementSpecifique: null,
            },
            jury: {
              result: "FAILURE",
              informationOfResult: "Compétences insuffisantes",
              dateOfResult: SESSION_AT,
              dateOfSession: SESSION_AT,
            },
          }),
        ),
      );
      await openV2Page(page);

      await expect(
        page.getByText(
          `Vous n’avez pas validé la totalité de votre VAE à la suite de votre passage devant le jury le ${format(SESSION_AT, "dd/MM/yyyy")}`,
        ),
      ).toBeVisible();
      await expect(page.getByText("Compétences insuffisantes")).toBeVisible();
      await expect(
        tileByTitle(page, "Déposer un dossier de validation"),
      ).toBeVisible();
    });

    test("shows a three-step form when an amenagement is requested", async ({
      page,
      msw,
    }) => {
      msw.use(...createDossierHandlers(createCandidacy()));
      await openV2Page(page);
      await openDepotPage(page);
      await startDepotWithAmenagement(page);

      const stepperSteps = page.locator(".fr-stepper__steps");
      await expect(stepperSteps).toHaveAttribute("data-fr-steps", "3");
      await expect(page.locator(".fr-stepper__title")).toContainText(
        "Dépot du dossier",
      );
      await expect(page.locator(".fr-stepper__details")).toContainText(
        "Demande d’aménagement spécifique du jury",
      );
    });

    test("shows a two-step form when no amenagement is requested", async ({
      page,
      msw,
    }) => {
      msw.use(...createDossierHandlers(createCandidacy()));
      await openV2Page(page);
      await openDepotPage(page);
      await page.getByRole("button", { name: "Commencer" }).click();

      await expect(page.locator(".fr-stepper__steps")).toHaveAttribute(
        "data-fr-steps",
        "2",
      );
      await expect(page.locator(".fr-stepper__details")).toContainText(
        "Vérification, validation et envoi",
      );
    });

    test("shows an error on each step when required fields are missing", async ({
      page,
      msw,
    }) => {
      msw.use(...createDossierHandlers(createCandidacy()));
      await openV2Page(page);
      await openDepotPage(page);
      await startDepotWithAmenagement(page);

      await page.getByRole("button", { name: "Suivant" }).click();

      const dossierFileError = page.locator(
        ".dossier-de-validation-file-upload .fr-error-text",
      );
      await expect(dossierFileError).toContainText(FILE_REQUIRED_ERROR);
      await expect(page.locator(".fr-stepper__steps")).toHaveAttribute(
        "data-fr-current-step",
        "1",
      );

      await page.locator(DOSSIER_FILE_INPUT).setInputFiles({
        name: "dossier.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("dossier"),
      });
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

  test.describe("when NEW_DV_PAGE is inactive", () => {
    test.use({
      mswHandlers: [[...disabledCommon.aapCommonHandlers], { scope: "test" }],
    });

    test("keeps the menu on the legacy page and redirects a direct v2 URL", async ({
      page,
      msw,
    }) => {
      msw.use(...createDossierHandlers(createCandidacy()));

      const pendingMenu = disabledCommon.aapCommonWait(page);
      await login({ role: "aap", page });
      await page.goto(LEGACY_PATH);
      await pendingMenu;

      await expect(
        page.getByRole("link", { name: "Dossier de validation", exact: true }),
      ).toHaveAttribute("href", MENU_URL);

      await page.goto(V2_PATH);
      await expect(page).toHaveURL(new RegExp(`${LEGACY_PATH}$`));
      await expect(page.getByRole("tab", { name: "Dossier" })).toBeVisible();
    });
  });
});
