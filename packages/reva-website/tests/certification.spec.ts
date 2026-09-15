import {
  expect,
  graphql,
  HttpResponse,
  test,
  type Page,
} from "next/experimental/testmode/playwright/msw";

import certificationBtsChaudronnierData from "./fixtures/certifications/chaudronnier.json";
import articlesForCertificationPageUsefulResources from "./fixtures/strapi/articlesForCertificationPageUsefulResources.json";

const fvae = graphql.link("https://reva-api/api/graphql");
const strapi = graphql.link("https://strapi.vae.gouv.fr/graphql");

const chaudronnier = certificationBtsChaudronnierData.data.getCertification;
const certificationId = "610b6e86-9435-4781-abda-4cad3a746f32";
const certificationPath = `/certifications/${certificationId}/`;

const certificationTabLabels = [
  "Métier",
  "Blocs de compétences",
  "Prérequis",
  "Jury",
  "Documentation",
  "Établissements",
] as const;

type CertificationTabLabel = (typeof certificationTabLabels)[number];
type ReducedRequirementsState = true | false | null;
type CertificationTabVisibility = Record<CertificationTabLabel, boolean>;

const fullCertificationTabVisibility: CertificationTabVisibility = {
  Métier: true,
  "Blocs de compétences": true,
  Prérequis: true,
  Jury: true,
  Documentation: true,
  Établissements: false,
};

const reducedCertificationTabVisibility: CertificationTabVisibility = {
  Métier: true,
  "Blocs de compétences": true,
  Prérequis: false,
  Jury: false,
  Documentation: false,
  Établissements: true,
};

function createCertificationResponse({
  certificationLabel,
  structureLabel,
  reducedRequirementsState,
}: {
  certificationLabel: string;
  structureLabel: string | null;
  reducedRequirementsState: ReducedRequirementsState;
}) {
  return {
    data: {
      getCertification: {
        ...chaudronnier,
        parcoursByCertificationAuthorities: reducedRequirementsState
          ? [
              {
                certificationAuthority: {
                  label: "Certification Authority",
                  websiteUrl: "https://www.certification-authority.com",
                },
                parcours: [
                  {
                    id: "parcours-1",
                    label: "Parcours 1",
                    nomEtablissement: "Etablissement 1",
                    uai: "uai-1",
                  },
                ],
              },
            ]
          : [],
        label: certificationLabel,
        certificationAuthorityStructure:
          structureLabel === null
            ? null
            : {
                ...chaudronnier.certificationAuthorityStructure,
                label: structureLabel,
                hasReducedRequirements: reducedRequirementsState,
              },
      },
    },
  };
}

const certificationTabsVisibilityScenarios = [
  {
    name: "hasReducedRequirements=true",
    certificationLabel: "Certification SUP",
    structureLabel: "Structure SUP",
    reducedRequirementsState: true,
    expectedTabVisibility: reducedCertificationTabVisibility,
  },
  {
    name: "hasReducedRequirements=false",
    certificationLabel: "Certification standard",
    structureLabel: "Structure standard",
    reducedRequirementsState: false,
    expectedTabVisibility: fullCertificationTabVisibility,
  },
  {
    name: "certificationAuthorityStructure=null",
    certificationLabel: "Certification sans structure",
    structureLabel: null,
    reducedRequirementsState: null,
    expectedTabVisibility: fullCertificationTabVisibility,
  },
] as const;

async function assertCertificationTabVisibility(
  page: Page,
  expectedTabVisibility: CertificationTabVisibility,
) {
  for (const tabLabel of certificationTabLabels) {
    await expect(page.getByRole("tab", { name: tabLabel })).toHaveCount(
      expectedTabVisibility[tabLabel] ? 1 : 0,
    );
  }
}

test.use({
  mswHandlers: [
    [
      fvae.query("activeFeaturesForConnectedUser", () => {
        return HttpResponse.json({
          data: {
            activeFeaturesForConnectedUser: ["WEBSITE_CERTIFICATION_PAGE_V2"],
          },
        });
      }),
      fvae.query("getCertificationForCertificationPage", () => {
        return HttpResponse.json(certificationBtsChaudronnierData);
      }),
      strapi.query("getArticlesForCertificationPageUsefulResources", () => {
        return HttpResponse.json(articlesForCertificationPageUsefulResources);
      }),
    ],
    { scope: "test" },
  ],
});

test("display certification page with correct data info", async ({ page }) => {
  await page.goto(certificationPath);
  await expect(page.getByTestId("certification-label")).toHaveText(
    chaudronnier.label,
  );
});

test("display certification authority structure label", async ({ page }) => {
  await page.goto(certificationPath);
  const heading = page.getByRole("heading", { name: chaudronnier.label });
  await expect(heading.locator("+ p")).toHaveText(
    chaudronnier.certificationAuthorityStructure.label,
  );
});

test("display level tile with diploma type", async ({ page }) => {
  await page.goto(certificationPath);
  const levelTile = page.getByRole("heading", {
    name: `Niveau ${chaudronnier.level}`,
  });
  await expect(levelTile).toBeVisible();
  await expect(
    levelTile.locator("..").getByText(chaudronnier.typeDiplome),
  ).toBeVisible();
});

test("display expiration date tile", async ({ page }) => {
  await page.goto(certificationPath);
  const expirationTile = page.getByRole("heading", {
    name: "Date d'expiration",
  });
  await expect(expirationTile).toBeVisible();
  const expectedDate = new Date(chaudronnier.rncpExpiresAt).toLocaleDateString(
    "fr-FR",
  );
  await expect(
    expirationTile.locator("..").getByText(expectedDate),
  ).toBeVisible();
});

certificationTabsVisibilityScenarios.forEach(
  ({
    name,
    certificationLabel,
    structureLabel,
    reducedRequirementsState,
    expectedTabVisibility,
  }) => {
    test(`shows expected tabs when ${name}`, async ({ page, msw }) => {
      msw.use(
        fvae.query("getCertificationForCertificationPage", () => {
          return HttpResponse.json(
            createCertificationResponse({
              certificationLabel,
              structureLabel,
              reducedRequirementsState,
            }),
          );
        }),
      );

      await page.goto(certificationPath);
      await expect(
        page.getByRole("heading", { name: certificationLabel, level: 1 }),
      ).toBeVisible();
      await assertCertificationTabVisibility(page, expectedTabVisibility);
    });
  },
);

test("shows available parcours", async ({ page, msw }) => {
  msw.use(
    fvae.query("getCertificationForCertificationPage", () => {
      return HttpResponse.json(
        createCertificationResponse({
          certificationLabel: "Certification SUP",
          structureLabel: "Structure SUP",
          reducedRequirementsState: true,
        }),
      );
    }),
  );

  await page.goto(certificationPath);
  // DSFR wires up tab switching asynchronously (dynamic import of its core
  // script, deferred until after hydration), so a click can land before the
  // behavior is attached and be silently dropped. Retry the click until the
  // panel actually switches instead of clicking once.
  await expect(async () => {
    await page.getByRole("tab", { name: "Établissements" }).click();
    await expect(
      page.getByText(
        "Établissements proposant ce diplôme sur la plateforme France VAE",
      ),
    ).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(page.getByText("Certification Authority")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Certification Authority" }),
  ).toHaveAttribute("href", "https://www.certification-authority.com");
  await expect(page.getByText("Parcours 1")).toBeVisible();
});
