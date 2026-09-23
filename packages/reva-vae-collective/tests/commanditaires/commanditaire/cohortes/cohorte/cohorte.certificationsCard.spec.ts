import {
  expect,
  graphql,
  HttpResponse,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../../../shared/utils/auth/login";
import { mockQueryActiveFeatures } from "../../../../shared/utils/mockActiveFeatures";
import { mockQueryGetUserPermissions } from "../../../../shared/utils/mockGetUserPermissions";
const fvae = graphql.link("https://reva-api/api/graphql");

test.describe("certifications card", () => {
  test.describe("when there are one or more certifications selected", () => {
    test.use({
      mswHandlers: [
        [
          fvae.query("getCohorteByIdForCohortePage", () => {
            return HttpResponse.json({
              data: {
                vaeCollective_getCohorteVaeCollectiveById: {
                  id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                  nom: "macohorte",
                  status: "PUBLIE",
                  certificationCohorteVaeCollectives: [
                    {
                      id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                      certification: {
                        id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                        certification: {
                          label: "Certification 1",
                          codeRncp: "123456",
                        },
                      },
                    },
                    {
                      id: "6a343906-3bbd-443a-9eb0-b5ba4f398f9d",
                      certification: {
                        id: "b818b1e0-0d59-49ee-9868-840d6b463e45",
                        certification: {
                          label: "Certification 2",
                          codeRncp: "78910",
                        },
                      },
                    },
                  ],
                },
              },
            });
          }),
          mockQueryActiveFeatures(),
          mockQueryGetUserPermissions(["MODIFIER_COHORTE"]),
        ],
        { scope: "test" },
      ],
    });

    test("when i access the page, the filled certifications card should be displayed", async ({
      page,
    }) => {
      await login({ page, role: "gestionnaireVaeCollective" });

      await page.goto(
        "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
      );
      await expect(page.getByTestId("certifications-card")).toBeVisible();
    });

    test("when i click on the visualiser button, i should be redirected to the certifications selectionnees page", async ({
      page,
    }) => {
      await login({ page, role: "gestionnaireVaeCollective" });

      await page.goto(
        "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
      );
      await page
        .getByTestId("certifications-card")
        .getByRole("link", { name: "Visualiser" })
        .click();
      await expect(page).toHaveURL(
        "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712/certifications-selectionnees",
      );
    });
  });

  test.describe("when the VAE_COLLECTIVE_MULTI_CERTIFICATION feature flag is active", () => {
    test.describe("when the cohorte status is 'BROUILLON'", () => {
      test.describe("when there are no certifications selected", () => {
        test.use({
          mswHandlers: [
            [
              fvae.query("getCohorteByIdForCohortePage", () => {
                return HttpResponse.json({
                  data: {
                    vaeCollective_getCohorteVaeCollectiveById: {
                      id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                      nom: "macohorte",
                      status: "BROUILLON",
                      certificationCohorteVaeCollectives: [],
                    },
                  },
                });
              }),
              mockQueryActiveFeatures(["VAE_COLLECTIVE_MULTI_CERTIFICATION"]),
              mockQueryGetUserPermissions(["MODIFIER_COHORTE"]),
            ],
            { scope: "test" },
          ],
        });

        test("when i click on the 'Compléter' button it should lead me to the select certifications page", async ({
          page,
        }) => {
          await login({ page, role: "gestionnaireVaeCollective" });

          await page.goto(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
          );
          await page
            .getByTestId("certifications-card")
            .getByRole("link", { name: "Compléter" })
            .click();
          await expect(page).toHaveURL(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712/selection-certifications",
          );
        });
      });

      test.describe("when there is a certification already selected", () => {
        test.use({
          mswHandlers: [
            [
              fvae.query("getCohorteByIdForCohortePage", () => {
                return HttpResponse.json({
                  data: {
                    vaeCollective_getCohorteVaeCollectiveById: {
                      id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                      nom: "macohorte",
                      status: "BROUILLON",
                      certificationCohorteVaeCollectives: [
                        {
                          id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                          certification: {
                            id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                            certification: {
                              label: "Certification 1",
                              codeRncp: "123456",
                            },
                          },
                        },
                      ],
                    },
                  },
                });
              }),
              mockQueryActiveFeatures(["VAE_COLLECTIVE_MULTI_CERTIFICATION"]),
              mockQueryGetUserPermissions(["MODIFIER_COHORTE"]),
            ],
            { scope: "test" },
          ],
        });

        test("when i click on the 'Modifier' button it should lead me to the select certifications page", async ({
          page,
        }) => {
          await login({ page, role: "gestionnaireVaeCollective" });

          await page.goto(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
          );
          await page
            .getByTestId("certifications-card")
            .getByRole("link", { name: "Modifier" })
            .click();
          await expect(page).toHaveURL(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712/selection-certifications",
          );
        });
      });

      test.describe("when the user lacks the MODIFIER_COHORTE permission", () => {
        test.describe("when there is a certification already selected", () => {
          test.use({
            mswHandlers: [
              [
                fvae.query("getCohorteByIdForCohortePage", () => {
                  return HttpResponse.json({
                    data: {
                      vaeCollective_getCohorteVaeCollectiveById: {
                        id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                        nom: "macohorte",
                        status: "BROUILLON",
                        certificationCohorteVaeCollectives: [
                          {
                            id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                            certification: {
                              id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                              certification: {
                                label: "Certification 1",
                                codeRncp: "123456",
                              },
                            },
                          },
                        ],
                      },
                    },
                  });
                }),
                mockQueryActiveFeatures(["VAE_COLLECTIVE_MULTI_CERTIFICATION"]),
                mockQueryGetUserPermissions(),
              ],
              { scope: "test" },
            ],
          });

          test("the card should be readonly and show a 'Visualiser' link instead of 'Modifier'", async ({
            page,
          }) => {
            await login({ page, role: "gestionnaireVaeCollective" });

            await page.goto(
              "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
            );

            const certificationsCard = page.getByTestId("certifications-card");
            await expect(
              certificationsCard.getByRole("link", { name: "Visualiser" }),
            ).toBeVisible();
            await expect(
              certificationsCard.getByRole("button", { name: "Modifier" }),
            ).not.toBeVisible();
          });
        });

        test.describe("when there are no certifications selected", () => {
          test.use({
            mswHandlers: [
              [
                fvae.query("getCohorteByIdForCohortePage", () => {
                  return HttpResponse.json({
                    data: {
                      vaeCollective_getCohorteVaeCollectiveById: {
                        id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                        nom: "macohorte",
                        status: "BROUILLON",
                        certificationCohorteVaeCollectives: [],
                      },
                    },
                  });
                }),
                mockQueryActiveFeatures(["VAE_COLLECTIVE_MULTI_CERTIFICATION"]),
                mockQueryGetUserPermissions(),
              ],
              { scope: "test" },
            ],
          });

          test("the card should be readonly and show no action button", async ({
            page,
          }) => {
            await login({ page, role: "gestionnaireVaeCollective" });

            await page.goto(
              "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
            );

            const certificationsCard = page.getByTestId("certifications-card");
            await expect(certificationsCard).toBeVisible();
            await expect(
              certificationsCard.getByRole("link", { name: "Visualiser" }),
            ).not.toBeVisible();
            await expect(
              certificationsCard.getByRole("link", { name: "Compléter" }),
            ).not.toBeVisible();
          });
        });
      });
    });

    test.describe("when the cohorte status is 'PUBLIE'", () => {
      test.describe("when the user has the MODIFIER_COHORTE permission", () => {
        test.use({
          mswHandlers: [
            [
              fvae.query("getCohorteByIdForCohortePage", () => {
                return HttpResponse.json({
                  data: {
                    vaeCollective_getCohorteVaeCollectiveById: {
                      id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                      nom: "macohorte",
                      status: "PUBLIE",
                      certificationCohorteVaeCollectives: [
                        {
                          id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                          certification: {
                            id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                            certification: {
                              label: "Certification 1",
                              codeRncp: "123456",
                            },
                          },
                        },
                      ],
                    },
                  },
                });
              }),
              mockQueryActiveFeatures(["VAE_COLLECTIVE_MULTI_CERTIFICATION"]),
              mockQueryGetUserPermissions(["MODIFIER_COHORTE"]),
            ],
            { scope: "test" },
          ],
        });

        test("the card should still be readonly because the cohorte is published", async ({
          page,
        }) => {
          await login({ page, role: "gestionnaireVaeCollective" });

          await page.goto(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
          );

          const certificationsCard = page.getByTestId("certifications-card");
          await expect(
            certificationsCard.getByRole("link", { name: "Visualiser" }),
          ).toBeVisible();
          await expect(
            certificationsCard.getByRole("button", { name: "Modifier" }),
          ).not.toBeVisible();
        });
      });
    });
  });
});
