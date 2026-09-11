import {
  expect,
  graphql,
  Page,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../../shared/helpers/auth/login";
import { getAAPCommonHandlers } from "../../../shared/helpers/common-handlers/aap/getAapCommon.handlers";
import { graphQLResolver } from "../../../shared/helpers/network/msw";
import { waitGraphQL } from "../../../shared/helpers/network/requests";

const fvae = graphql.link("https://reva-api/api/graphql");

const { aapCommonHandlers } = getAAPCommonHandlers({
  activeFeaturesForConnectedUser: ["CANDIDACIES_FOR_AAP"],
});

async function waitForPageQueries(page: Page) {
  await Promise.all([
    waitGraphQL(page, "activeFeaturesForConnectedUser"),
    waitGraphQL(page, "getAccountInfo"),
    waitGraphQL(page, "getMaisonMereCGUQuery"),
    waitGraphQL(page, "getCandidaciesForAAP"),
    waitGraphQL(page, "getCohortesForAAP"),
  ]);
}

function createCandidacyRow({
  id,
  firstname,
  lastname,
  certificationLabel,
  codeRncp,
}: {
  id: string;
  firstname: string;
  lastname: string;
  certificationLabel: string;
  codeRncp: string;
}) {
  return {
    id,
    typeAccompagnement: "ACCOMPAGNE",
    endAccompagnementStatus: null,
    endAccompagnementDate: null,
    candidate: {
      firstname,
      lastname,
      givenName: null,
      firstname2: null,
      firstname3: null,
      middleNames: null,
      department: {
        code: "75",
        label: "Paris",
      },
    },
    cohorteVaeCollective: null,
    feasibility: null,
    activeDossierDeValidation: null,
    readyForJuryEstimatedAt: null,
    jury: null,
    certification: {
      label: certificationLabel,
      codeRncp,
    },
    organism: {
      label: "Organisme Lorem Ipsum",
      nomPublic: "Organisme Lorem Ipsum",
      modaliteAccompagnement: "A_DISTANCE",
    },
    candidacyDropOut: null,
    status: "VALIDATION",
    candidacyStatuses: [
      {
        status: "VALIDATION",
        createdAt: 1721832988943,
      },
    ],
  };
}

function createCandidaciesForAapHandlers(args?: { empty?: boolean }) {
  const empty = args?.empty ?? false;

  return [
    fvae.query(
      "getCandidaciesForAAP",
      graphQLResolver({
        candidacy_getCandidaciesForAAP: empty
          ? {
              rows: [],
              info: {
                totalRows: 0,
                totalPages: 0,
                currentPage: 1,
              },
            }
          : {
              rows: [
                createCandidacyRow({
                  id: "fb451fbc-3218-416d-9ac9-65b13432469f",
                  firstname: "Alice",
                  lastname: "Doe",
                  certificationLabel:
                    "Titre à finalité professionnelle Assistant de vie dépendance (ADVD)",
                  codeRncp: "RNCP12345",
                }),
                createCandidacyRow({
                  id: "773275af-60a3-44ec-9710-0367b0425e83",
                  firstname: "John",
                  lastname: "Doe",
                  certificationLabel:
                    "Titre à finalité professionnelle Conducteur accompagnateur de personnes à mobilité réduite - CAPMR",
                  codeRncp: "RNCP67890",
                }),
              ],
              info: {
                totalRows: 2,
                totalPages: 1,
                currentPage: 1,
              },
            },
      }),
    ),
    fvae.query(
      "getCohortesForAAP",
      graphQLResolver({
        cohortesVaeCollectivesForConnectedAap: [
          {
            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            nom: "Cohorte VAE Collective Test",
            organism: {
              maisonMereAAP: {
                id: "7b7539e7-a30c-4a6e-b13a-a82cdb6b4081",
              },
            },
          },
        ],
      }),
    ),
  ];
}

const FILTER_ACCORDION_LABELS = [
  "Candidatures",
  "Parcours et financement",
  "Dossier de faisabilité",
  "Dossier de validation",
  "Passage devant le jury",
  "Résultat de jury",
  "Financement France VAE",
  "VAE Collective",
  "Candidatures arrêtées",
  "Accompagnement",
] as const;

const ALL_FILTERS_QUERY_STRING =
  "activeCandidacies=true&candidacy=VALIDATION&training=PARCOURS_ENVOYE&feasibility=RECEVABLE&dossierDeValidation=ENVOYE&juryStatuses=SCHEDULED&juryResults=FAILURE&funding=FVAE_FINANCEMENT&cohorteVaeCollectiveIds=a1b2c3d4-e5f6-7890-abcd-ef1234567890&archive=ARCHIVE&accompagnement=EN_COURS";

const FILTER_QUERY_PARAMS = [
  "activeCandidacies",
  "candidacy",
  "training",
  "feasibility",
  "dossierDeValidation",
  "juryStatuses",
  "juryResults",
  "funding",
  "cohorteVaeCollectiveIds",
  "archive",
  "accompagnement",
] as const;

test.describe("Candidacies for AAP page", () => {
  test.describe("when there are candidacies", () => {
    test.use({
      mswHandlers: [
        [...aapCommonHandlers, ...createCandidaciesForAapHandlers()],
        { scope: "test" },
      ],
    });

    test("displays the candidacies list", async ({ page }) => {
      await login({ role: "aap", page });
      await page.goto("/admin2/candidacies/candidacies-for-aap/");
      await waitForPageQueries(page);

      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Candidatures",
      );

      await expect(page.getByText("2 résultats")).toBeVisible();

      const results = page.getByTestId("results");
      await expect(results.locator("li")).toHaveCount(2);

      await expect(results.getByText("Doe Alice")).toBeVisible();
      await expect(results.getByText("Doe John")).toBeVisible();
    });
  });

  test.describe("when there are no candidacies", () => {
    test.use({
      mswHandlers: [
        [
          ...aapCommonHandlers,
          ...createCandidaciesForAapHandlers({ empty: true }),
        ],
        { scope: "test" },
      ],
    });

    test("displays the empty state", async ({ page }) => {
      await login({ role: "aap", page });
      await page.goto("/admin2/candidacies/candidacies-for-aap/");
      await waitForPageQueries(page);

      await expect(page.getByText("0 résultat")).toBeVisible();
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Aucun résultat pour votre recherche",
        }),
      ).toBeVisible();
      await expect(page.getByAltText("Pas de résultat")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Effacer les filtres" }),
      ).toBeHidden();
    });

    test("displays the empty state with a clear filters button when filters are selected", async ({
      page,
    }) => {
      await login({ role: "aap", page });
      await page.goto(
        "/admin2/candidacies/candidacies-for-aap/?candidacy=VALIDATION",
      );
      await waitForPageQueries(page);

      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Aucun résultat pour votre recherche",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Effacer les filtres" }),
      ).toBeVisible();
    });

    test("displays the empty state with a clear filters button when the Actives filter is selected", async ({
      page,
    }) => {
      await login({ role: "admin", page });
      await page.goto(
        "/admin2/candidacies/candidacies-for-aap/?activeCandidacies=true",
      );
      await waitForPageQueries(page);

      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Aucun résultat pour votre recherche",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Effacer les filtres" }),
      ).toBeVisible();
    });
  });

  test.describe("when no filter is selected", () => {
    test.use({
      mswHandlers: [
        [...aapCommonHandlers, ...createCandidaciesForAapHandlers()],
        { scope: "test" },
      ],
    });

    test("closes all filter accordions by default", async ({ page }) => {
      await login({ role: "aap", page });
      await page.goto("/admin2/candidacies/candidacies-for-aap/");
      await waitForPageQueries(page);

      for (const label of FILTER_ACCORDION_LABELS) {
        await expect(
          page.getByRole("button", { name: label, exact: true }),
        ).toHaveAttribute("aria-expanded", "false");
      }
    });
  });

  test.describe("when filters are selected", () => {
    test.use({
      mswHandlers: [
        [...aapCommonHandlers, ...createCandidaciesForAapHandlers()],
        { scope: "test" },
      ],
    });

    test("opens all filter accordions that have a selected filter", async ({
      page,
    }) => {
      await login({ role: "aap", page });
      await page.goto(
        `/admin2/candidacies/candidacies-for-aap/?${ALL_FILTERS_QUERY_STRING}`,
      );
      await waitForPageQueries(page);

      for (const label of FILTER_ACCORDION_LABELS) {
        await expect(
          page.getByRole("button", { name: label, exact: true }),
        ).toHaveAttribute("aria-expanded", "true");
      }
    });

    test("clears all filters when clicking on Réinitialiser les filtres", async ({
      page,
    }) => {
      await login({ role: "aap", page });
      await page.goto(
        `/admin2/candidacies/candidacies-for-aap/?${ALL_FILTERS_QUERY_STRING}`,
      );
      await waitForPageQueries(page);

      const getCandidaciesPromise = waitGraphQL(page, "getCandidaciesForAAP");
      await page
        .getByRole("button", { name: "Réinitialiser les filtres" })
        .click();
      await getCandidaciesPromise;

      const searchParams = new URL(page.url()).searchParams;
      for (const param of FILTER_QUERY_PARAMS) {
        expect(searchParams.has(param)).toBe(false);
      }

      await expect(
        page.getByRole("button", { name: "Réinitialiser les filtres" }),
      ).toBeDisabled();

      await page.reload();

      for (const label of FILTER_ACCORDION_LABELS) {
        await expect(
          page.getByRole("button", { name: label, exact: true }),
        ).toHaveAttribute("aria-expanded", "false");
      }
    });
  });

  test.describe("Modalité de parcours accordion", () => {
    test.use({
      mswHandlers: [
        [...aapCommonHandlers, ...createCandidaciesForAapHandlers()],
        { scope: "test" },
      ],
    });

    test("is hidden when an AAP is connected", async ({ page }) => {
      await login({ role: "aap", page });
      await page.goto("/admin2/candidacies/candidacies-for-aap/");
      await waitForPageQueries(page);

      await expect(
        page.getByRole("button", { name: "Modalité de parcours" }),
      ).toBeHidden();
    });

    test("is visible when an admin is connected", async ({ page }) => {
      await login({ role: "admin", page });
      await page.goto("/admin2/candidacies/candidacies-for-aap/");
      await waitForPageQueries(page);

      await expect(
        page.getByRole("button", { name: "Modalité de parcours" }),
      ).toBeVisible();
    });
  });

  test.describe("Actives filter", () => {
    test.use({
      mswHandlers: [
        [...aapCommonHandlers, ...createCandidaciesForAapHandlers()],
        { scope: "test" },
      ],
    });

    test("is hidden when an AAP is connected", async ({ page }) => {
      await login({ role: "aap", page });
      await page.goto("/admin2/candidacies/candidacies-for-aap/");
      await waitForPageQueries(page);

      await page
        .getByRole("button", { name: "Candidatures", exact: true })
        .click();

      await expect(
        page.getByRole("checkbox", { name: "Actives" }),
      ).toBeHidden();
    });

    test("is visible when an admin is connected", async ({ page }) => {
      await login({ role: "admin", page });
      await page.goto("/admin2/candidacies/candidacies-for-aap/");
      await waitForPageQueries(page);

      await page
        .getByRole("button", { name: "Candidatures", exact: true })
        .click();

      await expect(
        page.getByRole("checkbox", { name: "Actives" }),
      ).toBeVisible();
    });

    test("is checked and opens the Candidatures accordion when selected", async ({
      page,
    }) => {
      await login({ role: "admin", page });
      await page.goto(
        "/admin2/candidacies/candidacies-for-aap/?activeCandidacies=true",
      );
      await waitForPageQueries(page);

      await expect(
        page.getByRole("button", { name: "Candidatures", exact: true }),
      ).toHaveAttribute("aria-expanded", "true");

      await expect(
        page.getByRole("checkbox", { name: "Actives" }),
      ).toBeChecked();
    });

    test("adds activeCandidacies to the URL when checked", async ({ page }) => {
      await login({ role: "admin", page });
      await page.goto("/admin2/candidacies/candidacies-for-aap/");
      await waitForPageQueries(page);

      await page
        .getByRole("button", { name: "Candidatures", exact: true })
        .click();

      const getCandidaciesPromise = waitGraphQL(page, "getCandidaciesForAAP");
      await page.locator("label").filter({ hasText: "Actives" }).click();
      await getCandidaciesPromise;

      const searchParams = new URL(page.url()).searchParams;
      expect(searchParams.get("activeCandidacies")).toBe("true");
    });

    test("removes activeCandidacies from the URL when unchecked", async ({
      page,
    }) => {
      await login({ role: "admin", page });
      await page.goto(
        "/admin2/candidacies/candidacies-for-aap/?activeCandidacies=true",
      );
      await waitForPageQueries(page);

      const getCandidaciesPromise = waitGraphQL(page, "getCandidaciesForAAP");
      await page.locator("label").filter({ hasText: "Actives" }).click();
      await getCandidaciesPromise;

      const searchParams = new URL(page.url()).searchParams;
      expect(searchParams.get("activeCandidacies")).toBe(null);
    });
  });

  test.describe("Brouillon / Projet filter", () => {
    test.use({
      mswHandlers: [
        [...aapCommonHandlers, ...createCandidaciesForAapHandlers()],
        { scope: "test" },
      ],
    });

    test("is hidden when an AAP is connected", async ({ page }) => {
      await login({ role: "aap", page });
      await page.goto("/admin2/candidacies/candidacies-for-aap/");
      await waitForPageQueries(page);

      await page
        .getByRole("button", { name: "Candidatures", exact: true })
        .click();

      await expect(
        page.getByRole("checkbox", { name: "Brouillon / Projet" }),
      ).toBeHidden();
    });

    test("is visible when an admin is connected", async ({ page }) => {
      await login({ role: "admin", page });
      await page.goto("/admin2/candidacies/candidacies-for-aap/");
      await waitForPageQueries(page);

      await page
        .getByRole("button", { name: "Candidatures", exact: true })
        .click();

      await expect(
        page.getByRole("checkbox", { name: "Brouillon / Projet" }),
      ).toBeVisible();
    });

    test("is checked and opens the Candidatures accordion when selected", async ({
      page,
    }) => {
      await login({ role: "admin", page });
      await page.goto(
        "/admin2/candidacies/candidacies-for-aap/?candidacy=PROJET",
      );
      await waitForPageQueries(page);

      await expect(
        page.getByRole("button", { name: "Candidatures", exact: true }),
      ).toHaveAttribute("aria-expanded", "true");

      await expect(
        page.getByRole("checkbox", { name: "Brouillon / Projet" }),
      ).toBeChecked();
    });

    test("adds Brouillon / Projet to the URL when checked", async ({
      page,
    }) => {
      await login({ role: "admin", page });
      await page.goto("/admin2/candidacies/candidacies-for-aap/");
      await waitForPageQueries(page);

      await page
        .getByRole("button", { name: "Candidatures", exact: true })
        .click();

      const getCandidaciesPromise = waitGraphQL(page, "getCandidaciesForAAP");
      await page
        .locator("label")
        .filter({ hasText: "Brouillon / Projet" })
        .click();
      await getCandidaciesPromise;

      const searchParams = new URL(page.url()).searchParams;
      expect(searchParams.get("candidacy")).toBe("PROJET");
    });

    test("removes Brouillon / Projet from the URL when unchecked", async ({
      page,
    }) => {
      await login({ role: "admin", page });
      await page.goto(
        "/admin2/candidacies/candidacies-for-aap/?candidacy=PROJET",
      );
      await waitForPageQueries(page);

      const getCandidaciesPromise = waitGraphQL(page, "getCandidaciesForAAP");
      await page
        .locator("label")
        .filter({ hasText: "Brouillon / Projet" })
        .click();
      await getCandidaciesPromise;

      const searchParams = new URL(page.url()).searchParams;
      expect(searchParams.get("candidacy")).toBe(null);
    });
  });
});
