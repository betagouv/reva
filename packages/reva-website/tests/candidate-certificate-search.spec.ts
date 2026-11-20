import {
  expect,
  graphql,
  HttpResponse,
  test,
} from "next/experimental/testmode/playwright/msw";

import chaudronnierCertificationData from "./fixtures/certifications/chaudronnier.json";
import activeFeaturesEmptyData from "./fixtures/espace-candidat/active_features_empty.json";
import articlesDAideData from "./fixtures/espace-candidat/articlesDAide.json";
import candidateCertificateSearchData from "./fixtures/espace-candidat/candidate_certificate_search.json";
import candidateCertificateSearchEmptyData from "./fixtures/espace-candidat/candidate_certificate_search_empty.json";
import searchCertificationsEmptyResult from "./fixtures/espace-candidat/recherche/searchCertificationsEmptyResult.json";
import articlesForCertificationPageUsefulResources from "./fixtures/strapi/articlesForCertificationPageUsefulResources.json";

const strapi = graphql.link("https://strapi.vae.gouv.fr/graphql");
const fvae = graphql.link("https://reva-api/api/graphql");

test.describe("with search results", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/espace-candidat");
  });

  test.use({
    mswHandlers: [
      [
        strapi.query("getArticlesDAide", () => {
          return HttpResponse.json(articlesDAideData);
        }),
        strapi.query("getArticlesForCertificationPageUsefulResources", () => {
          return HttpResponse.json(articlesForCertificationPageUsefulResources);
        }),
        fvae.query("activeFeaturesForConnectedUser", () => {
          return HttpResponse.json(activeFeaturesEmptyData);
        }),
        fvae.query("searchCertificationsQuery", () => {
          return HttpResponse.json(candidateCertificateSearchData);
        }),
        fvae.query("getCertificationForCertificationPage", () => {
          return HttpResponse.json(chaudronnierCertificationData);
        }),
      ],
      { scope: "test" },
    ],
  });

  test("should show the relevant certificates when typing text in the search bar", async ({
    page,
  }) => {
    const searchInput = page.locator('[data-testid="autocomplete-input"]');
    await searchInput.fill("chaudronnier");

    const firstOption = page
      .locator('[data-testid="autocomplete-options"] > div')
      .first();

    await expect(firstOption).toHaveText("BTS ChaudronnierRNCP 13125");
  });

  test("should go to the next page when a certificate is found and clicked on", async ({
    page,
  }) => {
    const searchInput = page.locator('[data-testid="autocomplete-input"]');
    await searchInput.fill("chaudronnier");

    const firstOption = page
      .locator('[data-testid="autocomplete-options"] > div')
      .first();
    await expect(firstOption).toBeVisible();
    await firstOption.click();

    await expect(page).toHaveURL(
      "/certifications/7ad608c2-5a4b-40eb-8ef9-7a85421b40f0/",
    );
  });
});

test.describe("with no search results", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/espace-candidat");
  });

  test.use({
    mswHandlers: [
      [
        strapi.query("getArticlesDAide", () => {
          return HttpResponse.json(articlesDAideData);
        }),
        fvae.query("activeFeaturesForConnectedUser", () => {
          return HttpResponse.json(activeFeaturesEmptyData);
        }),
        fvae.query("searchCertificationsQuery", () => {
          return HttpResponse.json(candidateCertificateSearchEmptyData);
        }),
        fvae.query("searchCertificationsQueryForResultPage", () => {
          return HttpResponse.json(searchCertificationsEmptyResult);
        }),
      ],
      { scope: "test" },
    ],
  });

  test("should go to the next page when no certificate is found and the search button is clicked on", async ({
    page,
  }) => {
    const searchInput = page.locator('[data-testid="autocomplete-input"]');
    await searchInput.fill("chaudronnier");
    await searchInput.press("Enter");

    await expect(page).toHaveURL(
      "/espace-candidat/recherche/?searchText=chaudronnier",
    );
  });
});
