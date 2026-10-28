import { expect, test } from "next/experimental/testmode/playwright/msw";

import { login } from "@tests/helpers/auth/auth";
import { createCandidacyEntity } from "@tests/helpers/entities/create-candidacy.entity";
import { createCandidateEntity } from "@tests/helpers/entities/create-candidate.entity";
import { createCertificationEntity } from "@tests/helpers/entities/create-certification.entity";
import { createOrganismEntity } from "@tests/helpers/entities/create-organism.entity";
import { loginAndWaitForCandidaciesInitialLoad } from "@tests/helpers/handlers/candidacies/candidacies-guards.handler";
import { dashboardHandlers } from "@tests/helpers/handlers/dashboard.handler";
import {
  setOrganismHandlers,
  setOrganismPageWait,
} from "@tests/helpers/handlers/set-organism/set-organism.handler";
import { waitGraphQL } from "@tests/helpers/network/requests";

import type { MswFixture } from "next/experimental/testmode/playwright/msw";
import type { Page, Response } from "playwright";

const candidate = createCandidateEntity({
  id: "candidate1",
  email: "email@example.com",
  phone: "06 01 02 03 04",
});

const certification = createCertificationEntity({
  id: "c6898498-3b07-4b84-9120-b163aacbd916",
  label: "Titre 1",
  codeRncp: "34691",
  status: "AVAILABLE",
});

const emptyCandidacy = createCandidacyEntity({
  id: "c6898498-3b07-4b84-9120-b163aacbd916",
  candidate,
  certification: null,
  feasibilityFormat: "UPLOADED_PDF",
  status: "PROJET",
  typeAccompagnement: "ACCOMPAGNE",
});

const candidacyWithCertification = createCandidacyEntity({
  id: "b5b996a2-2c5f-421c-ac06-19c37c4178b8",
  candidate,
  certification,
  goalsCount: 1,
  experiencesCount: 1,
  status: "PROJET",
  typeAccompagnement: "ACCOMPAGNE",
});

const onsiteOrganism = createOrganismEntity({
  id: "o1",
  label: "Architecte 1",
  nomPublic: "Architecte 1",
  contactAdministrativeEmail: "email@exemple.com",
  contactAdministrativePhone: "0111111111",
  emailContact: "email@exemple.com",
  telephone: "0111111111",
  adresseNumeroEtNomDeRue: "1 rue de l'exemple",
  adresseCodePostal: "75000",
  adresseVille: "Paris",
  conformeNormesAccessibilite: "CONFORME",
  modaliteAccompagnement: "LIEU_ACCUEIL",
});

const remoteOrganism = createOrganismEntity({
  id: "o2",
  label: "Architecte 2",
  nomPublic: "Architecte 2",
  contactAdministrativeEmail: "email2@exemple.com",
  contactAdministrativePhone: "0222222222",
  emailContact: "email2@exemple.com",
  telephone: "0222222222",
  adresseNumeroEtNomDeRue: "2 rue de l'exemple",
  adresseCodePostal: "44000",
  adresseVille: "Nantes",
  modaliteAccompagnement: "A_DISTANCE",
});

function organismZipInput(page: Page) {
  return page.getByRole("textbox", {
    name: "Où souhaitez-vous réaliser votre accompagnement ?",
  });
}

const nantesAddressSearchResult = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-1.553621, 47.218371],
      },
      properties: {
        label: "Nantes",
        score: 0.97,
        type: "municipality",
        id: "44109",
        name: "Nantes",
        postcode: "44000",
        citycode: "44109",
        city: "Nantes",
        context: "44, Loire-Atlantique, Pays de la Loire",
        street: "Nantes",
      },
    },
  ],
  query: "44000",
  limit: 10,
};

async function mockNantesAddressSearch(page: Page) {
  await page.route(/api-adresse\.data\.gouv\.fr\/search\//, async (route) => {
    await route.fulfill({ json: nantesAddressSearchResult });
  });
}

async function selectNantes(page: Page) {
  const input = organismZipInput(page);
  await input.fill("44000");
  await page
    .getByTestId("autocomplete-options")
    .getByText("Nantes (44000)", { exact: true })
    .click();
  await expect(input).toHaveValue("Nantes (44)");
  await input.press("Escape");
  await expect(page.getByTestId("autocomplete-options")).toHaveCount(0);
}

function searchFilterZip(response: Response) {
  return response.request().postDataJSON().variables?.searchFilter?.zip;
}

async function openSetOrganismPage({
  page,
  msw,
  organisms,
}: {
  page: Page;
  msw: MswFixture;
  organisms: (typeof onsiteOrganism)[];
}) {
  msw.use(
    ...setOrganismHandlers({
      candidacy: candidacyWithCertification,
      organisms,
    }),
  );

  await loginAndWaitForCandidaciesInitialLoad(page);
  const setOrganismPagePromise = Promise.all([
    waitGraphQL(page, "getCandidacyByIdForCandidacyGuard"),
    setOrganismPageWait(page),
  ]);
  await page.goto(
    `/candidat/candidates/${candidate.id}/candidacies/${candidacyWithCertification.id}/set-organism/`,
  );
  await setOrganismPagePromise;
}

test.describe("Empty candidacy", () => {
  test("set organism tile is disabled when certification is missing", async ({
    page,
    msw,
  }) => {
    const { handlers, dashboardWait } = dashboardHandlers({
      candidacy: emptyCandidacy,
    });
    msw.use(...handlers);

    await login(page);
    await dashboardWait(page);

    await expect(
      page.getByTestId("organism-tile").getByRole("button"),
    ).toBeDisabled();
  });
});

test.describe("Candidacy with certification selected", () => {
  test("lists all available organisms", async ({ page, msw }) => {
    await openSetOrganismPage({
      page,
      msw,
      organisms: [onsiteOrganism, remoteOrganism],
    });

    const firstOrganism = page.getByTestId("project-organisms-organism-o1");
    await expect(firstOrganism.getByRole("heading")).toHaveText("Architecte 1");
    await expect(
      firstOrganism.getByTestId("project-organisms-organism-email"),
    ).toHaveText("email@exemple.com");
    await expect(
      firstOrganism.getByTestId("project-organisms-organism-phone"),
    ).toHaveText("0111111111");
    await expect(
      firstOrganism.getByTestId("project-organisms-onsite-tag"),
    ).toBeVisible();
    await expect(
      firstOrganism.getByTestId("project-organisms-remote-tag"),
    ).toHaveCount(0);

    const secondOrganism = page.getByTestId("project-organisms-organism-o2");
    await expect(secondOrganism.getByRole("heading")).toHaveText(
      "Architecte 2",
    );
    await expect(
      secondOrganism.getByTestId("project-organisms-organism-email"),
    ).toHaveText("email2@exemple.com");
    await expect(
      secondOrganism.getByTestId("project-organisms-organism-phone"),
    ).toHaveText("0222222222");
    await expect(
      secondOrganism.getByTestId("project-organisms-onsite-tag"),
    ).toHaveCount(0);
    await expect(
      secondOrganism.getByTestId("project-organisms-remote-tag"),
    ).toBeVisible();
  });

  test("onsite filters enable zip and PMR only when onsite is selected", async ({
    page,
    msw,
  }) => {
    await openSetOrganismPage({
      page,
      msw,
      organisms: [onsiteOrganism, remoteOrganism],
    });

    const zipInput = organismZipInput(page);
    const pmrInput = page.getByTestId("checkbox-wrapper-pmr-input");

    await expect(zipInput).toBeDisabled();
    await expect(pmrInput).toBeDisabled();

    const onsiteQueryPromise = waitGraphQL(
      page,
      "getRandomOrganismsForCandidacy",
    );
    await page.getByTestId("button-select-onsite").click();
    await onsiteQueryPromise;

    await expect(page.getByTestId("button-select-onsite")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(zipInput).toBeEnabled();
    await expect(pmrInput).toBeEnabled();

    await mockNantesAddressSearch(page);
    await zipInput.fill("44000");
    const remoteQueryPromise = waitGraphQL(
      page,
      "getRandomOrganismsForCandidacy",
    );
    await page.getByTestId("button-select-remote").click();
    await remoteQueryPromise;

    await expect(zipInput).toBeDisabled();
    await expect(pmrInput).toBeDisabled();
  });

  test("selecting a place filters organisms by its zip code", async ({
    page,
    msw,
  }) => {
    await mockNantesAddressSearch(page);
    await openSetOrganismPage({
      page,
      msw,
      organisms: [onsiteOrganism, remoteOrganism],
    });

    const onsiteQueryPromise = waitGraphQL(
      page,
      "getRandomOrganismsForCandidacy",
    );
    await page.getByTestId("button-select-onsite").click();
    await onsiteQueryPromise;

    const zipQueryPromise = waitGraphQL(page, "getRandomOrganismsForCandidacy");
    await selectNantes(page);
    const zipQuery = await zipQueryPromise;

    expect(searchFilterZip(zipQuery)).toBe("44000");
  });

  test("zip filter is cleared when the selected place is removed", async ({
    page,
    msw,
  }) => {
    await mockNantesAddressSearch(page);
    await openSetOrganismPage({
      page,
      msw,
      organisms: [onsiteOrganism, remoteOrganism],
    });

    const onsiteQueryPromise = waitGraphQL(
      page,
      "getRandomOrganismsForCandidacy",
    );
    await page.getByTestId("button-select-onsite").click();
    await onsiteQueryPromise;

    const zipQueryPromise = waitGraphQL(page, "getRandomOrganismsForCandidacy");
    await selectNantes(page);
    await zipQueryPromise;

    const zipInput = organismZipInput(page);
    await zipInput.fill("");
    const clearQueryPromise = waitGraphQL(
      page,
      "getRandomOrganismsForCandidacy",
    );
    await zipInput.press("Enter");
    const clearQuery = await clearQueryPromise;

    expect(searchFilterZip(clearQuery)).toBe("");
    await expect(zipInput).toHaveValue("");
  });

  test("zip filter is cleared when onsite is deselected", async ({
    page,
    msw,
  }) => {
    await mockNantesAddressSearch(page);
    await openSetOrganismPage({
      page,
      msw,
      organisms: [onsiteOrganism, remoteOrganism],
    });

    const onsiteQueryPromise = waitGraphQL(
      page,
      "getRandomOrganismsForCandidacy",
    );
    await page.getByTestId("button-select-onsite").click();
    await onsiteQueryPromise;

    const zipQueryPromise = waitGraphQL(page, "getRandomOrganismsForCandidacy");
    await selectNantes(page);
    await zipQueryPromise;

    const remoteQueryPromise = waitGraphQL(
      page,
      "getRandomOrganismsForCandidacy",
    );
    await page.getByTestId("button-select-remote").click();
    const remoteQuery = await remoteQueryPromise;

    expect(searchFilterZip(remoteQuery)).toBe("");

    const backToOnsiteQueryPromise = waitGraphQL(
      page,
      "getRandomOrganismsForCandidacy",
    );
    await page.getByTestId("button-select-onsite").click();
    const backToOnsiteQuery = await backToOnsiteQueryPromise;

    expect(searchFilterZip(backToOnsiteQuery)).toBe("");
  });

  test("selecting the first organism triggers candidacy_selectOrganism", async ({
    page,
    msw,
  }) => {
    await openSetOrganismPage({
      page,
      msw,
      organisms: [onsiteOrganism, remoteOrganism],
    });

    const mutationPromise = waitGraphQL(page, "candidacy_selectOrganism");
    await page.getByTestId("project-organisms-submit-organism-o1").click();
    await mutationPromise;
  });
});

test.describe("Candidacy with no organism results", () => {
  test("search by name empty state has no reset button", async ({
    page,
    msw,
  }) => {
    await openSetOrganismPage({ page, msw, organisms: [] });

    const searchPromise = waitGraphQL(page, "getRandomOrganismsForCandidacy");
    await page.getByTestId("search-bar-input").fill("abcd");
    await page.getByTestId("search-bar-input").press("Enter");
    await searchPromise;

    await expect(
      page.getByTestId("no-results-for-search-by-name"),
    ).toBeVisible();
    await expect(
      page.getByTestId("no-results-button-reset-filters"),
    ).toHaveCount(0);
  });

  test("filters empty state has a reset button", async ({ page, msw }) => {
    await openSetOrganismPage({ page, msw, organisms: [] });

    const filterPromise = waitGraphQL(page, "getRandomOrganismsForCandidacy");
    await page.getByTestId("button-select-onsite").click();
    await filterPromise;

    await expect(page.getByTestId("no-results-for-filters")).toBeVisible();
    await expect(
      page.getByTestId("no-results-button-reset-filters"),
    ).toBeVisible();
  });

  for (const filterButton of [
    "no-results-button-reset-filters",
    "sidebar-button-reset-filters",
  ]) {
    test(`onsite filters can be reset with ${filterButton}`, async ({
      page,
      msw,
    }) => {
      await mockNantesAddressSearch(page);
      await openSetOrganismPage({ page, msw, organisms: [] });

      const onsiteQueryPromise = waitGraphQL(
        page,
        "getRandomOrganismsForCandidacy",
      );
      await page.getByTestId("button-select-onsite").click();
      await onsiteQueryPromise;
      await expect(page.getByTestId("button-select-onsite")).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      const zipQueryPromise = waitGraphQL(
        page,
        "getRandomOrganismsForCandidacy",
      );
      await selectNantes(page);
      await zipQueryPromise;
      const pmrQueryPromise = waitGraphQL(
        page,
        "getRandomOrganismsForCandidacy",
      );
      await page.getByTestId("checkbox-wrapper-pmr-input").check({
        force: true,
      });
      await pmrQueryPromise;

      const resetQueryPromise = waitGraphQL(
        page,
        "getRandomOrganismsForCandidacy",
      );
      await page.getByTestId(filterButton).click();
      const resetQuery = await resetQueryPromise;

      await expect(page.getByTestId("button-select-onsite")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(searchFilterZip(resetQuery)).toBe("");
      await expect(organismZipInput(page)).toBeDisabled();
      await expect(
        page.getByTestId("checkbox-wrapper-pmr-input"),
      ).not.toBeChecked();
    });

    test(`remote filters can be reset with ${filterButton}`, async ({
      page,
      msw,
    }) => {
      await openSetOrganismPage({ page, msw, organisms: [] });

      await page.getByTestId("button-select-remote").click();
      await expect(page.getByTestId("button-select-remote")).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      await page.getByTestId(filterButton).click();
      await expect(page.getByTestId("button-select-remote")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    test(`MCF filter can be reset with ${filterButton}`, async ({
      page,
      msw,
    }) => {
      await openSetOrganismPage({ page, msw, organisms: [] });

      await page
        .getByText(
          "Afficher les accompagnateurs référencés sur Mon Compte Formation (MCF)",
        )
        .click();
      await expect(
        page.getByTestId("checkbox-wrapper-mcf-input"),
      ).toBeChecked();

      await page.getByTestId(filterButton).click();
      await expect(
        page.getByTestId("checkbox-wrapper-mcf-input"),
      ).not.toBeChecked();
    });
  }
});

test.describe("Candidacy with PARCOURS_CONFIRME status", () => {
  test("organism tile is read-only and does not show Consulter", async ({
    page,
    msw,
  }) => {
    const candidacy = createCandidacyEntity({
      ...candidacyWithCertification,
      status: "PARCOURS_CONFIRME",
      organism: createOrganismEntity({
        id: "org-id",
        label: "Test Organism",
      }),
    });
    const { handlers, dashboardWait } = dashboardHandlers({ candidacy });
    msw.use(...handlers);

    await login(page);
    await dashboardWait(page);

    const organismTile = page.getByTestId("organism-tile");
    await expect(organismTile.getByRole("button")).toBeDisabled();
    await expect(organismTile).not.toContainText("Consulter");
  });
});
