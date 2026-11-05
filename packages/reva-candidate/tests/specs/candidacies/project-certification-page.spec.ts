import { expect, test } from "next/experimental/testmode/playwright/msw";
import { graphql } from "next/experimental/testmode/playwright/msw";

import {
  assertCertificationTabVisibility,
  certificationTabsVisibilityScenarios,
  createCertificationForReducedRequirementsScenario,
} from "@tests/helpers/certification-page-tabs-visibility";
import {
  CandidacyEntity,
  createCandidacyEntity,
} from "@tests/helpers/entities/create-candidacy.entity";
import { createCandidateEntity } from "@tests/helpers/entities/create-candidate.entity";
import { createCertificationEntity } from "@tests/helpers/entities/create-certification.entity";
import {
  createCandidacyGuardsAndDashboardHandlers,
  createCandidaciesGuardsHandlers,
  loginAndWaitForCandidaciesInitialLoad,
} from "@tests/helpers/handlers/candidacies/candidacies-guards.handler";
import { getArticlesForCertificationPageUsefulResourcesHandler } from "@tests/helpers/handlers/certification-page/useful-resources.handler";
import { graphQLResolver } from "@tests/helpers/network/msw";

import { Certification } from "@/graphql/generated/graphql";

const fvae = graphql.link("https://reva-api/api/graphql");

const candidate = createCandidateEntity();

function createProjectCertificationPageHandlers({
  certification,
  candidacy,
}: {
  certification: Certification;
  candidacy: CandidacyEntity;
}) {
  return [
    ...createCandidaciesGuardsHandlers({
      candidate,
      candidacies: [candidacy],
    }),
    ...createCandidacyGuardsAndDashboardHandlers(candidacy),
    fvae.query(
      "candidate_getCandidacyByIdWithCertification",
      graphQLResolver({
        getCandidacyById: {
          ...candidacy,
          hasMoreThanOneCertificationAvailable: false,
        },
      }),
    ),
    fvae.query(
      "getCertificationByIdForCertificationPage",
      graphQLResolver({ getCertification: certification }),
    ),
    getArticlesForCertificationPageUsefulResourcesHandler(),
  ];
}

test.describe("project certification page tabs visibility", () => {
  certificationTabsVisibilityScenarios.forEach(
    ({
      name,
      certificationLabel,
      structureLabel,
      reducedRequirementsState,
      expectedTabVisibility,
    }) => {
      test(`shows expected tabs when ${name}`, async ({ page, msw }) => {
        const certificationForScenario =
          createCertificationForReducedRequirementsScenario({
            certificationLabel,
            structureLabel,
            reducedRequirementsState,
            idPrefix: "project-certification",
          });
        const candidacyForScenario = createCandidacyEntity({
          candidate,
          certification: certificationForScenario,
          status: "PROJET",
        });

        msw.use(
          ...createProjectCertificationPageHandlers({
            certification: certificationForScenario,
            candidacy: candidacyForScenario,
          }),
        );

        await loginAndWaitForCandidaciesInitialLoad(page);
        await page.goto(
          `candidates/${candidate.id}/candidacies/${candidacyForScenario.id}/certification/${certificationForScenario.id}/`,
        );

        await expect(
          page.getByRole("heading", {
            name: certificationForScenario.label,
            level: 1,
          }),
        ).toBeVisible();
        await assertCertificationTabVisibility(page, expectedTabVisibility);
      });
    },
  );
});

test.describe("Shows available parcours", () => {
  test("when i access the tab it shows the available parcours", async ({
    page,
    msw,
  }) => {
    const certification = createCertificationForReducedRequirementsScenario({
      certificationLabel: "Certification du SUP",
      structureLabel: "Structure SUP",
      reducedRequirementsState: true,
      idPrefix: "project-certification",
    });
    const candidacy = createCandidacyEntity({
      candidate,
      certification: certification,
      status: "PROJET",
    });

    msw.use(
      ...createProjectCertificationPageHandlers({
        certification: certification,
        candidacy: candidacy,
      }),
    );

    await loginAndWaitForCandidaciesInitialLoad(page);
    await page.goto(
      `candidates/${candidate.id}/candidacies/${candidacy.id}/certification/${certification.id}/`,
    );

    await page.getByRole("tab", { name: "Établissements" }).click();

    await expect(
      page.getByText(
        "Établissements proposant ce diplôme sur la plateforme France VAE",
      ),
    ).toBeVisible();
    await expect(page.getByText("Certification Authority")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Certification Authority" }),
    ).toHaveAttribute("href", "https://www.certification-authority.com");
    await expect(page.getByText("Parcours 1")).toBeVisible();
    await expect(
      page.getByText("Certification Authority Without Parcours"),
    ).toHaveCount(0);
  });
});

test.describe("Certification info display", () => {
  test("does not show the VAE en autonomie label", async ({ page, msw }) => {
    const certification = createCertificationEntity({
      id: "project-certification-info-autonomie",
      codeRncp: "RNCP9999",
    });
    const candidacy = createCandidacyEntity({
      candidate,
      certification,
      status: "PROJET",
    });

    msw.use(
      ...createProjectCertificationPageHandlers({ certification, candidacy }),
    );

    await loginAndWaitForCandidaciesInitialLoad(page);
    await page.goto(
      `candidates/${candidate.id}/candidacies/${candidacy.id}/certification/${certification.id}/`,
    );

    await expect(
      page.getByText(`RNCP ${certification.codeRncp}`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("VAE en autonomie")).not.toBeVisible();
  });

  test("shows the RNCP code as a tag", async ({ page, msw }) => {
    const certification = createCertificationEntity({
      id: "project-certification-info-rncp",
      codeRncp: "RNCP9999",
    });
    const candidacy = createCandidacyEntity({
      candidate,
      certification,
      status: "PROJET",
    });

    msw.use(
      ...createProjectCertificationPageHandlers({ certification, candidacy }),
    );

    await loginAndWaitForCandidaciesInitialLoad(page);
    await page.goto(
      `candidates/${candidate.id}/candidacies/${candidacy.id}/certification/${certification.id}/`,
    );

    await expect(
      page
        .locator("p.fr-tag")
        .filter({ hasText: `RNCP ${certification.codeRncp}` }),
    ).toBeVisible();
  });

  test("shows the diploma type merged into the level tile", async ({
    page,
    msw,
  }) => {
    const certification = createCertificationEntity({
      id: "project-certification-info-level",
      level: 3,
      typeDiplome: "Brevet professionnel",
    });
    const candidacy = createCandidacyEntity({
      candidate,
      certification,
      status: "PROJET",
    });

    msw.use(
      ...createProjectCertificationPageHandlers({ certification, candidacy }),
    );

    await loginAndWaitForCandidaciesInitialLoad(page);
    await page.goto(
      `candidates/${candidate.id}/candidacies/${candidacy.id}/certification/${certification.id}/`,
    );

    const levelTile = page.getByRole("heading", {
      name: `Niveau ${certification.level}`,
    });
    await expect(levelTile).toBeVisible();
    await expect(
      levelTile.locator("..").getByText("Brevet professionnel"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Brevet professionnel" }),
    ).toHaveCount(0);
  });

  test("shows the expiration date tile", async ({ page, msw }) => {
    const rncpExpiresAt = new Date("2030-06-15").getTime();
    const certification = createCertificationEntity({
      id: "project-certification-info-expiration",
      rncpExpiresAt,
    });
    const candidacy = createCandidacyEntity({
      candidate,
      certification,
      status: "PROJET",
    });

    msw.use(
      ...createProjectCertificationPageHandlers({ certification, candidacy }),
    );

    await loginAndWaitForCandidaciesInitialLoad(page);
    await page.goto(
      `candidates/${candidate.id}/candidacies/${candidacy.id}/certification/${certification.id}/`,
    );

    const expirationTile = page.getByRole("heading", {
      name: "Date d'expiration",
    });
    await expect(expirationTile).toBeVisible();
    const expectedDate = new Date(rncpExpiresAt).toLocaleDateString("fr-FR");
    await expect(
      expirationTile.locator("..").getByText(expectedDate),
    ).toBeVisible();
  });
});
