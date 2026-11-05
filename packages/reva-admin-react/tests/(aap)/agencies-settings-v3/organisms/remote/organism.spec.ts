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

const ORGANISM_ID = "b162e2fc-f640-4802-8808-45b99689b671";
const MAISON_MERE_ID = "733540e0-1bb1-4b8d-a66d-97fc992ff522";
const VAE_COLLECTIVE_TOGGLE_TITLE =
  "Je souhaite activer la VAE collective à distance ou en présentiel";

function createOrganismHandlers(args?: {
  disponiblePourVaeCollective?: boolean;
  fermePourAbsenceOuConges?: boolean;
}) {
  const disponiblePourVaeCollective =
    args?.disponiblePourVaeCollective ?? false;
  const fermePourAbsenceOuConges = args?.fermePourAbsenceOuConges ?? false;

  return [
    fvae.query(
      "getOrganismForOrganismRemotePage",
      graphQLResolver({
        organism_getOrganism: {
          id: ORGANISM_ID,
          nomPublic: "Nom affiché",
          telephone: "0650505050",
          siteInternet: "https://example.com",
          emailContact: "test@example.com",
          remoteZones: ["FRANCE_METROPOLITAINE"],
          modaliteAccompagnementRenseigneeEtValide: true,
          maisonMereAAP: {
            raisonSociale: "Raison Sociale Example",
          },
          managedDegrees: [],
          formacodes: [],
          conventionCollectives: [],
          certifications: [],
        },
      }),
    ),
    fvae.query(
      "getOrganismForOrganismDisponiblePourVaeCollectiveToggle",
      graphQLResolver({
        organism_getOrganism: {
          id: ORGANISM_ID,
          disponiblePourVaeCollective,
        },
      }),
    ),
    fvae.query(
      "getOrganismForOrganismVisibilityToggle",
      graphQLResolver({
        organism_getOrganism: {
          id: ORGANISM_ID,
          fermePourAbsenceOuConges,
        },
      }),
    ),
  ];
}

function createUpdateVaeCollectiveMutationHandler() {
  return fvae.mutation(
    "updateOrganismDisponiblePourVaeCollectiveMutation",
    graphQLResolver({
      organism_updateDisponiblePourVaeCollective: {
        id: ORGANISM_ID,
      },
    }),
  );
}

const { aapCommonHandlers } = getAAPCommonHandlers();

async function waitForPageQueries(page: Page) {
  await Promise.all([
    waitGraphQL(page, "getOrganismForOrganismRemotePage"),
    waitGraphQL(
      page,
      "getOrganismForOrganismDisponiblePourVaeCollectiveToggle",
    ),
    waitGraphQL(page, "getOrganismForOrganismVisibilityToggle"),
  ]);
}

test.describe("when accessing the page", () => {
  test.use({
    mswHandlers: [
      [
        ...aapCommonHandlers,
        ...createOrganismHandlers({
          disponiblePourVaeCollective: false,
        }),
      ],
      { scope: "test" },
    ],
  });

  test("displays page title", async ({ page }) => {
    await login({ role: "aap", page });

    await page.goto(
      `/admin2/agencies-settings-v3/${MAISON_MERE_ID}/organisms/${ORGANISM_ID}/remote/`,
    );
    await waitForPageQueries(page);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Accompagnement à distance",
    );
  });
});

test.describe("VAE collective toggle", () => {
  test.describe("when disabled", () => {
    test.use({
      mswHandlers: [
        [
          ...aapCommonHandlers,
          ...createOrganismHandlers({
            disponiblePourVaeCollective: false,
          }),
          createUpdateVaeCollectiveMutationHandler(),
        ],
        { scope: "test" },
      ],
    });

    test("displays unchecked toggle", async ({ page }) => {
      await login({ role: "aap", page });

      await page.goto(
        `/admin2/agencies-settings-v3/${MAISON_MERE_ID}/organisms/${ORGANISM_ID}/remote/`,
      );

      await waitForPageQueries(page);

      const toggle = page.getByTitle(VAE_COLLECTIVE_TOGGLE_TITLE);

      await expect(toggle).not.toBeChecked();
    });

    test("displays visibility information text", async ({ page }) => {
      await login({ role: "aap", page });

      await page.goto(
        `/admin2/agencies-settings-v3/${MAISON_MERE_ID}/organisms/${ORGANISM_ID}/remote/`,
      );

      await waitForPageQueries(page);

      await expect(
        page.getByText(
          /Ce référencement vous permet d'être visible dans les résultats de recherche des porteurs de projet VAE collective/i,
        ),
      ).toBeVisible();
    });

    test("enables toggle and updates availability", async ({ page }) => {
      await login({ role: "aap", page });

      await page.goto(
        `/admin2/agencies-settings-v3/${MAISON_MERE_ID}/organisms/${ORGANISM_ID}/remote/`,
      );

      await waitForPageQueries(page);

      const toggle = page.getByTitle(VAE_COLLECTIVE_TOGGLE_TITLE);

      await toggle.click();

      await expect(
        page.getByText("Disponibilité pour la VAE collective mise à jour"),
      ).toBeVisible();
    });
  });

  test.describe("when enabled", () => {
    test.use({
      mswHandlers: [
        [
          ...aapCommonHandlers,
          ...createOrganismHandlers({
            disponiblePourVaeCollective: true,
          }),
          createUpdateVaeCollectiveMutationHandler(),
        ],
        { scope: "test" },
      ],
    });

    test("displays checked toggle", async ({ page }) => {
      await login({ role: "aap", page });

      await page.goto(
        `/admin2/agencies-settings-v3/${MAISON_MERE_ID}/organisms/${ORGANISM_ID}/remote/`,
      );

      await waitForPageQueries(page);

      const toggle = page.getByTitle(VAE_COLLECTIVE_TOGGLE_TITLE);

      await expect(toggle).toBeChecked();
    });

    test("disables toggle and updates availability", async ({ page }) => {
      await login({ role: "aap", page });

      await page.goto(
        `/admin2/agencies-settings-v3/${MAISON_MERE_ID}/organisms/${ORGANISM_ID}/remote/`,
      );

      await waitForPageQueries(page);

      const toggle = page.getByTitle(VAE_COLLECTIVE_TOGGLE_TITLE);

      await toggle.click();

      await waitGraphQL(
        page,
        "getOrganismForOrganismDisponiblePourVaeCollectiveToggle",
      );

      await expect(
        page.getByText("Disponibilité pour la VAE collective mise à jour"),
      ).toBeVisible();
    });
  });
});
