import {
  expect,
  graphql,
  HttpResponse,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../../../../shared/utils/auth/login";
import { mockQueryActiveFeatures } from "../../../../../shared/utils/mockActiveFeatures";

const fvae = graphql.link("https://reva-api/api/graphql");

const commanditaireId = "115c2693-b625-491b-8b91-c7b3875d86a0";
const cohorteVaeCollectiveId = "0eda2cbf-78ae-47af-9f28-34d05f972712";
const pageUrl = `/vae-collective/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}/candidatures`;
const cohortePageUrl = `/vae-collective/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}`;
const cohortesPageUrl = `/vae-collective/commanditaires/${commanditaireId}/cohortes`;

const candidacySentAt = Date.UTC(2024, 5, 15, 12);

const jeanCandidacy = {
  id: "candidacy-jean",
  typeAccompagnement: "ACCOMPAGNE",
  endAccompagnementStatus: null,
  endAccompagnementDate: null,
  status: "VALIDATION",
  readyForJuryEstimatedAt: null,
  candidate: {
    firstname: "Jean",
    lastname: "Dupont",
    givenName: null,
    firstname2: null,
    firstname3: null,
    middleNames: null,
    department: { code: "75", label: "Paris" },
  },
  feasibility: null,
  activeDossierDeValidation: null,
  jury: null,
  certification: {
    label: "Titre professionnel",
    codeRncp: "12345",
  },
  organism: {
    label: "Organisme",
    nomPublic: "Organisme public",
    modaliteAccompagnement: "LIEU_ACCUEIL",
  },
  candidacyDropOut: null,
  candidacyStatuses: [{ status: "VALIDATION", createdAt: candidacySentAt }],
};

const marieCandidacy = {
  id: "candidacy-marie",
  typeAccompagnement: "AUTONOME",
  endAccompagnementStatus: null,
  endAccompagnementDate: null,
  status: "PROJET",
  readyForJuryEstimatedAt: null,
  candidate: {
    firstname: "Marie",
    lastname: "Curie",
    givenName: null,
    firstname2: null,
    firstname3: null,
    middleNames: null,
    department: null,
  },
  feasibility: null,
  activeDossierDeValidation: null,
  jury: null,
  certification: null,
  organism: null,
  candidacyDropOut: null,
  candidacyStatuses: [],
};

const mockGetCandidacies = ({
  rows,
  totalRows,
  totalPages,
  currentPage,
}: {
  rows: unknown[];
  totalRows: number;
  totalPages: number;
  currentPage: number;
}) =>
  fvae.query("getCandidaciesForCandidaciesPage", () =>
    HttpResponse.json({
      data: {
        vaeCollective_getCohorteVaeCollectiveById: {
          id: cohorteVaeCollectiveId,
          nom: "macohorte",
        },
        getCandidacies: {
          rows,
          info: { totalRows, totalPages, currentPage },
        },
      },
    }),
  );

test.describe("when the cohorte has no candidacy", () => {
  test.use({
    mswHandlers: [
      [
        mockGetCandidacies({
          rows: [],
          totalRows: 0,
          totalPages: 0,
          currentPage: 1,
        }),
        mockQueryActiveFeatures(),
      ],
      { scope: "test" },
    ],
  });

  test("it should display an empty state", async ({ page }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await expect(
      page.getByRole("heading", { name: "Candidatures" }),
    ).toBeVisible();
    await expect(page.getByText("Aucune candidature")).toBeVisible();
    await expect(page.getByTestId("candidacy-card")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "2", exact: true }),
    ).toHaveCount(0);
  });
});

test.describe("when the cohorte has candidacies", () => {
  test.use({
    mswHandlers: [
      [
        mockGetCandidacies({
          rows: [jeanCandidacy, marieCandidacy],
          totalRows: 2,
          totalPages: 1,
          currentPage: 1,
        }),
        mockQueryActiveFeatures(),
      ],
      { scope: "test" },
    ],
  });

  test("it should display the candidacies", async ({ page }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await expect(page.getByTestId("candidacy-card")).toHaveCount(2);

    const jeanCard = page
      .getByTestId("candidacy-card")
      .filter({ hasText: "Dupont Jean" });
    await expect(jeanCard).toContainText("Sur site");
    await expect(jeanCard).toContainText("Nouvelle candidature");
    await expect(jeanCard).toContainText("Organisme public - Paris (75)");
    await expect(jeanCard).toContainText("RNCP 12345 : Titre professionnel");
    await expect(jeanCard).toContainText("Candidature envoyée le 15/06/2024");

    const marieCard = page
      .getByTestId("candidacy-card")
      .filter({ hasText: "Curie Marie" });
    await expect(marieCard).toContainText("Autonome");
    await expect(marieCard).toContainText("En brouillon");
  });

  test("it should go back to the cohorte page when i click on the back button", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await page.getByRole("link", { name: "Retour" }).click();

    await expect(page).toHaveURL(cohortePageUrl);
  });

  test("when i click on the cohorte name it should lead to the cohorte page", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await page
      .getByRole("navigation")
      .getByRole("link", { name: "macohorte" })
      .click();

    await expect(page).toHaveURL(cohortePageUrl);
  });

  test("when i click on the cohortes list link it should lead to the cohortes list page", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Cohortes" })
      .click();

    await expect(page).toHaveURL(cohortesPageUrl);
  });
});

test.describe("when middle names are enabled", () => {
  test.use({
    mswHandlers: [
      [
        mockGetCandidacies({
          rows: [
            {
              ...jeanCandidacy,
              candidate: {
                ...jeanCandidacy.candidate,
                firstname2: "Pierre",
                middleNames: "Louis",
              },
            },
          ],
          totalRows: 1,
          totalPages: 1,
          currentPage: 1,
        }),
        mockQueryActiveFeatures(["MIDDLE_NAMES"]),
      ],
      { scope: "test" },
    ],
  });

  test("it should display the middle names", async ({ page }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await expect(page.getByTestId("candidacy-card")).toContainText(
      "Dupont Jean, Louis",
    );
    await expect(page.getByTestId("candidacy-card")).not.toContainText(
      "Pierre",
    );
  });
});

test.describe("when there is more than one page of candidacies", () => {
  const firstPageRows = Array.from({ length: 10 }, (_, index) => ({
    ...marieCandidacy,
    id: `candidacy-page-1-${index}`,
    candidate: {
      ...marieCandidacy.candidate,
      lastname: `Dupont${index}`,
    },
  }));
  const secondPageRows = [
    {
      ...jeanCandidacy,
      id: "candidacy-page-2",
    },
  ];

  test.use({
    mswHandlers: [
      [
        fvae.query("getCandidaciesForCandidaciesPage", ({ variables }) => {
          const isFirstPage = variables.offset === 0;

          return HttpResponse.json({
            data: {
              vaeCollective_getCohorteVaeCollectiveById: {
                id: cohorteVaeCollectiveId,
                nom: "macohorte",
              },
              getCandidacies: {
                rows: isFirstPage ? firstPageRows : secondPageRows,
                info: {
                  totalRows: 11,
                  totalPages: 2,
                  currentPage: isFirstPage ? 1 : 2,
                },
              },
            },
          });
        }),
        mockQueryActiveFeatures(),
      ],
      { scope: "test" },
    ],
  });

  test("it should display only the first 10 candidacies and navigate to the next page", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await expect(page.getByTestId("candidacy-card")).toHaveCount(10);
    await expect(page.getByText("Dupont0 Marie")).toBeVisible();
    await expect(page.getByText("Dupont Jean")).not.toBeVisible();

    await page.getByRole("link", { name: "2", exact: true }).click();

    await expect(page).toHaveURL(`${pageUrl}?page=2`);
    await expect(page.getByText("Dupont Jean")).toBeVisible();
    await expect(page.getByText("Dupont0 Marie")).not.toBeVisible();
  });
});
