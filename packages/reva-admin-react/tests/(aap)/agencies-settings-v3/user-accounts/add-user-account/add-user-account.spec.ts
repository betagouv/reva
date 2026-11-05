import {
  expect,
  graphql,
  Page,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../../../shared/helpers/auth/login";
import { getAAPCommonHandlers } from "../../../../shared/helpers/common-handlers/aap/getAapCommon.handlers";
import { graphQLResolver } from "../../../../shared/helpers/network/msw";
import { waitGraphQL } from "../../../../shared/helpers/network/requests";

const { aapCommonHandlers } = getAAPCommonHandlers();
const fvae = graphql.link("https://reva-api/api/graphql");

async function waitForPageQueries(page: Page) {
  await Promise.all([
    waitGraphQL(page, "activeFeaturesForConnectedUser"),
    waitGraphQL(page, "getAccountInfo"),
    waitGraphQL(page, "getMaisonMereCGUQuery"),
  ]);
}

const addUserAccountV2Handlers = () => {
  const createOrganismAccountForAddUserAccountPageHandler = fvae.mutation(
    "createOrganismAccountForAddUserAccountPage",
    graphQLResolver({
      organism_createAccount: {
        id: "new-account-id",
      },
    }),
  );

  return [createOrganismAccountForAddUserAccountPageHandler];
};

test.describe("Settings Add user account", () => {
  test.use({
    mswHandlers: [
      [...addUserAccountV2Handlers(), ...aapCommonHandlers],
      { scope: "test" },
    ],
  });
  test.describe("as a Gestionnaire AAP", () => {
    test.describe("when I access i access the add user account page", () => {
      test("it shows the correct title", async ({ page }) => {
        await login({ role: "aap", page });
        await page.goto(
          "/admin2/agencies-settings-v3/a8e32301-86b8-414b-8b55-af86d289adee/user-accounts/add-user-account/",
        );
        await waitForPageQueries(page);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          "Création d’un compte collaborateur",
        );
      });

      test("it let me go back to the settings page", async ({ page }) => {
        await login({ role: "aap", page });
        await page.goto(
          "/admin2/agencies-settings-v3/a8e32301-86b8-414b-8b55-af86d289adee/user-accounts/add-user-account/",
        );
        await waitForPageQueries(page);

        const backButton = page.getByTestId("back-button");
        await backButton.click();

        await expect(page).toHaveURL("/admin2/agencies-settings-v3/");
      });

      test("it shows an error when i try to submit the form with empty fields", async ({
        page,
      }) => {
        await login({ role: "aap", page });
        await page.goto(
          "/admin2/agencies-settings-v3/a8e32301-86b8-414b-8b55-af86d289adee/user-accounts/add-user-account/",
        );
        await waitForPageQueries(page);

        await page
          .getByTestId("lastname-input")
          .locator("input")
          .fill("Lastname");

        await page.getByRole("button", { name: "Créer" }).click();

        await expect(page.getByTestId("firstname-input")).toHaveClass(
          /fr-input-group--error/,
        );
        await expect(page.getByTestId("email-input")).toHaveClass(
          /fr-input-group--error/,
        );

        await page.getByTestId("lastname-input").locator("input").fill("");
        await page
          .getByTestId("firstname-input")
          .locator("input")
          .fill("Firstname");

        await page.getByRole("button", { name: "Créer" }).click();

        await expect(page.getByTestId("lastname-input")).toHaveClass(
          /fr-input-group--error/,
        );
        await expect(page.getByTestId("email-input")).toHaveClass(
          /fr-input-group--error/,
        );

        await expect(page).toHaveURL(
          "/admin2/agencies-settings-v3/a8e32301-86b8-414b-8b55-af86d289adee/user-accounts/add-user-account/",
        );
      });

      test("it let me submit a valid form", async ({ page }) => {
        await login({ role: "aap", page });
        await page.goto(
          "/admin2/agencies-settings-v3/a8e32301-86b8-414b-8b55-af86d289adee/user-accounts/add-user-account/",
        );
        await waitForPageQueries(page);

        await page.getByTestId("lastname-input").locator("input").fill("Doe");
        await page.getByTestId("firstname-input").locator("input").fill("John");
        await page
          .getByTestId("email-input")
          .locator("input")
          .fill("john.doe@example.com");
        await page.getByRole("button", { name: "Créer" }).click();

        const mutationPromise = waitGraphQL(
          page,
          "createOrganismAccountForAddUserAccountPage",
        );

        await page.getByRole("button", { name: "Créer" }).click();

        await mutationPromise;

        await expect(page).toHaveURL(
          "/admin2/agencies-settings-v3/a8e32301-86b8-414b-8b55-af86d289adee/user-accounts/new-account-id/",
        );
      });
    });
  });
});
