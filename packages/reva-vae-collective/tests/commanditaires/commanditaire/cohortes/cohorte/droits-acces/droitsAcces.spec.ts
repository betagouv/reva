import {
  expect,
  graphql,
  HttpResponse,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../../../../shared/utils/auth/login";
import { mockQueryActiveFeatures } from "../../../../../shared/utils/mockActiveFeatures";
import { mockQueryGetUserPermissions } from "../../../../../shared/utils/mockGetUserPermissions";

const fvae = graphql.link("https://reva-api/api/graphql");

const commanditaireId = "115c2693-b625-491b-8b91-c7b3875d86a0";
const cohorteVaeCollectiveId = "0eda2cbf-78ae-47af-9f28-34d05f972712";
const pageUrl = `/vae-collective/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}/droits-acces`;

test.describe("Cohorte with more than one page of sous comptes", () => {
  const firstPageRows = Array.from({ length: 10 }, (_, i) => ({
    id: `sous-compte-page1-${i}`,
    account: {
      firstname: "Jean",
      lastname: `Dupont${i}`,
      email: `jean.dupont${i}@example.com`,
    },
    rolesSpecificToCohorte: i === 0 ? ["EDITEUR_COHORTE"] : [],
  }));
  const secondPageRows = [
    {
      id: "sous-compte-page2-0",
      account: {
        firstname: "Marie",
        lastname: "Curie",
        email: "marie.curie@example.com",
      },
      rolesSpecificToCohorte: ["LECTEUR_COHORTE"],
    },
  ];

  test.use({
    mswHandlers: [
      [
        fvae.query(
          "getCommanditaireVaeCollectiveAndCohorteByIdQuery",
          ({ variables }) => {
            const rows =
              variables.offset === 0 ? firstPageRows : secondPageRows;
            return HttpResponse.json({
              data: {
                vaeCollective_getCommanditaireVaeCollective: {
                  id: commanditaireId,
                  sousComptes: {
                    info: { totalRows: 11 },
                    rows,
                  },
                },
                vaeCollective_getCohorteVaeCollectiveById: {
                  id: cohorteVaeCollectiveId,
                  nom: "macohorte",
                },
              },
            });
          },
        ),
        mockQueryActiveFeatures(),
        mockQueryGetUserPermissions(),
      ],
      { scope: "test" },
    ],
  });

  test("it should display only the first 10 sous comptes", async ({ page }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await expect(
      page.getByRole("heading", { name: "Droits d'accès" }),
    ).toBeVisible();

    await expect(page.getByText("Dupont0 Jean")).toBeVisible();
    await expect(page.getByText("jean.dupont0@example.com")).toBeVisible();
    await expect(page.getByText("Curie Marie")).not.toBeVisible();
  });

  test("it should navigate to the next page", async ({ page }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await page.getByRole("button", { name: "2", exact: true }).click();

    await expect(page.getByText("Curie Marie")).toBeVisible();
    await expect(page.getByText("marie.curie@example.com")).toBeVisible();
  });

  test("it should keep unsaved role changes when navigating back and forth between pages", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await page
      .getByRole("combobox", { name: "Droits d'accès de Jean Dupont1" })
      .selectOption("LECTEUR_COHORTE");

    await page.getByRole("button", { name: "2", exact: true }).click();
    await expect(page.getByText("Curie Marie")).toBeVisible();

    await page.getByRole("button", { name: "1", exact: true }).click();

    await expect(
      page.getByRole("combobox", { name: "Droits d'accès de Jean Dupont1" }),
    ).toHaveValue("LECTEUR_COHORTE");
  });

  test("it should lead me back to the cohorte page when i click on the back button", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await page.getByRole("link", { name: "Retour" }).click();

    await page.waitForURL(
      `/vae-collective/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}`,
    );
  });

  test("it should prefill each sous compte's access rights select with their current roles", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await expect(
      page.getByRole("combobox", { name: "Droits d'accès de Jean Dupont0" }),
    ).toHaveValue("EDITEUR_COHORTE");
    await expect(
      page.getByRole("combobox", { name: "Droits d'accès de Jean Dupont1" }),
    ).toHaveValue("AUCUN_DROIT");
  });
});

test.describe("Searching for a sous compte", () => {
  const allRows = [
    {
      id: "sous-compte-1",
      account: {
        firstname: "Jean",
        lastname: "Dupont",
        email: "jean.dupont@example.com",
      },
      rolesSpecificToCohorte: [],
    },
    {
      id: "sous-compte-2",
      account: {
        firstname: "Marie",
        lastname: "Curie",
        email: "marie.curie@example.com",
      },
      rolesSpecificToCohorte: [],
    },
  ];

  test.use({
    mswHandlers: [
      [
        fvae.query(
          "getCommanditaireVaeCollectiveAndCohorteByIdQuery",
          ({ variables }) => {
            const searchFilter = (variables.searchFilter as string) || "";
            const rows = searchFilter
              ? allRows.filter((row) =>
                  row.account.firstname
                    .toLowerCase()
                    .includes(searchFilter.toLowerCase()),
                )
              : allRows;
            return HttpResponse.json({
              data: {
                vaeCollective_getCommanditaireVaeCollective: {
                  id: commanditaireId,
                  sousComptes: {
                    info: { totalRows: rows.length },
                    rows,
                  },
                },
                vaeCollective_getCohorteVaeCollectiveById: {
                  id: cohorteVaeCollectiveId,
                  nom: "macohorte",
                },
              },
            });
          },
        ),
        mockQueryActiveFeatures(),
        mockQueryGetUserPermissions(),
      ],
      { scope: "test" },
    ],
  });

  test("it should filter the sous comptes list when searching", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await expect(page.getByText("Curie Marie")).toBeVisible();

    await page.getByRole("search").locator("input").fill("jean");
    await page.getByRole("button", { name: "Rechercher" }).click();

    await expect(page.getByText("Dupont Jean")).toBeVisible();
    await expect(page.getByText("Curie Marie")).not.toBeVisible();
  });

  test("it should display an empty state when no sous compte matches the search", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await page.getByRole("search").locator("input").fill("nobody");
    await page.getByRole("button", { name: "Rechercher" }).click();

    await expect(
      page.getByText("Aucun compte ne correspond à votre recherche."),
    ).toBeVisible();
  });
});

test.describe("Submitting the access rights form", () => {
  const sousCompteId = "sous-compte-1";

  let capturedVariables: unknown;

  test.use({
    mswHandlers: [
      [
        fvae.query("getCommanditaireVaeCollectiveAndCohorteByIdQuery", () => {
          return HttpResponse.json({
            data: {
              vaeCollective_getCommanditaireVaeCollective: {
                id: commanditaireId,
                sousComptes: {
                  info: { totalRows: 1 },
                  rows: [
                    {
                      id: sousCompteId,
                      account: {
                        firstname: "Jean",
                        lastname: "Dupont",
                        email: "jean.dupont@example.com",
                      },
                      rolesSpecificToCohorte: [],
                    },
                  ],
                },
              },
              vaeCollective_getCohorteVaeCollectiveById: {
                id: cohorteVaeCollectiveId,
                nom: "macohorte",
              },
            },
          });
        }),
        fvae.mutation(
          "updateRolesSpecificToCohorteOfSousCompteVaeCollective",
          async ({ variables }) => {
            capturedVariables = variables;
            return HttpResponse.json({
              data: {
                vaeCollective_updateRolesSpecificToCohorteOfSousCompteVaeCollective:
                  {
                    id: cohorteVaeCollectiveId,
                  },
              },
            });
          },
        ),
        mockQueryActiveFeatures(),
        mockQueryGetUserPermissions(),
      ],
      { scope: "test" },
    ],
  });

  test.beforeEach(() => {
    capturedVariables = undefined;
  });

  test("it should call the update mutation with the selected roles when submitting the form", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await page
      .getByRole("combobox", { name: "Droits d'accès de Jean Dupont" })
      .selectOption("LECTEUR_COHORTE");

    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect
      .poll(() => capturedVariables)
      .toEqual({
        commanditaireVaeCollectiveId: commanditaireId,
        cohorteVaeCollectiveId: cohorteVaeCollectiveId,
        sousComptesIdsAndRoles: [
          {
            sousCompteVaeCollectiveId: sousCompteId,
            roles: ["LECTEUR_COHORTE"],
          },
        ],
      });
  });

  test("it should redirect to the cohorte page after a successful submit", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await page.getByRole("button", { name: "Enregistrer" }).click();

    await page.waitForURL(
      `/vae-collective/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}`,
    );
  });
});

test.describe("Submitting after visiting multiple pages", () => {
  const firstPageRows = Array.from({ length: 10 }, (_, i) => ({
    id: `sous-compte-page1-${i}`,
    account: {
      firstname: "Jean",
      lastname: `Dupont${i}`,
      email: `jean.dupont${i}@example.com`,
    },
    rolesSpecificToCohorte: [],
  }));
  const secondPageRows = [
    {
      id: "sous-compte-page2-0",
      account: {
        firstname: "Marie",
        lastname: "Curie",
        email: "marie.curie@example.com",
      },
      rolesSpecificToCohorte: [],
    },
  ];

  let capturedVariables: unknown;

  test.use({
    mswHandlers: [
      [
        fvae.query(
          "getCommanditaireVaeCollectiveAndCohorteByIdQuery",
          ({ variables }) => {
            const rows =
              variables.offset === 0 ? firstPageRows : secondPageRows;
            return HttpResponse.json({
              data: {
                vaeCollective_getCommanditaireVaeCollective: {
                  id: commanditaireId,
                  sousComptes: {
                    info: { totalRows: 11 },
                    rows,
                  },
                },
                vaeCollective_getCohorteVaeCollectiveById: {
                  id: cohorteVaeCollectiveId,
                  nom: "macohorte",
                },
              },
            });
          },
        ),
        fvae.mutation(
          "updateRolesSpecificToCohorteOfSousCompteVaeCollective",
          async ({ variables }) => {
            capturedVariables = variables;
            return HttpResponse.json({
              data: {
                vaeCollective_updateRolesSpecificToCohorteOfSousCompteVaeCollective:
                  {
                    id: cohorteVaeCollectiveId,
                  },
              },
            });
          },
        ),
        mockQueryActiveFeatures(),
        mockQueryGetUserPermissions(),
      ],
      { scope: "test" },
    ],
  });

  test.beforeEach(() => {
    capturedVariables = undefined;
  });

  test("it should include role changes from every visited page when submitting", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await page
      .getByRole("combobox", { name: "Droits d'accès de Jean Dupont0" })
      .selectOption("EDITEUR_COHORTE");

    await page.getByRole("button", { name: "2", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Droits d'accès de Marie Curie" })
      .selectOption("LECTEUR_COHORTE");

    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect
      .poll(
        () =>
          (
            capturedVariables as
              | { sousComptesIdsAndRoles: unknown[] }
              | undefined
          )?.sousComptesIdsAndRoles.length,
      )
      .toBe(11);

    const sousComptesIdsAndRoles = (
      capturedVariables as {
        sousComptesIdsAndRoles: {
          sousCompteVaeCollectiveId: string;
          roles: string[];
        }[];
      }
    ).sousComptesIdsAndRoles;

    expect(sousComptesIdsAndRoles).toContainEqual({
      sousCompteVaeCollectiveId: "sous-compte-page1-0",
      roles: ["EDITEUR_COHORTE"],
    });
    expect(sousComptesIdsAndRoles).toContainEqual({
      sousCompteVaeCollectiveId: "sous-compte-page2-0",
      roles: ["LECTEUR_COHORTE"],
    });
  });
});
