import {
  expect,
  graphql,
  test,
  type Page,
} from "next/experimental/testmode/playwright/msw";

import { login } from "@tests/helpers/auth/auth";
import { createCandidacyEntity } from "@tests/helpers/entities/create-candidacy.entity";
import { createCandidateEntity } from "@tests/helpers/entities/create-candidate.entity";
import { createCertificationEntity } from "@tests/helpers/entities/create-certification.entity";
import { graphQLResolver } from "@tests/helpers/network/msw";
import { waitGraphQL } from "@tests/helpers/network/requests";

const fvae = graphql.link("https://reva-api/api/graphql");
const strapi = graphql.link("https://strapi.vae.gouv.fr/graphql");

const candidate = createCandidateEntity();
const certification = createCertificationEntity({
  label: "Certification 1",
  codeRncp: "RNCP0001",
});
const candidacy = createCandidacyEntity({
  candidate,
  certification,
  status: "PROJET",
  typeAccompagnement: "ACCOMPAGNE",
});

function createCandidaciesHandlers() {
  return [
    fvae.query(
      "candidate_getCandidateForCandidatesGuard",
      graphQLResolver({
        candidate_getCandidateWithCandidacy: {
          ...candidate,
        },
      }),
    ),
    fvae.query(
      "getCandidateByIdForCandidateGuard",
      graphQLResolver({
        candidate_getCandidateById: {
          ...candidate,
        },
      }),
    ),
    fvae.query(
      "candidate_getCandidateByIdWithCandidaciesForCandidaciesGuard",
      graphQLResolver({
        candidate_getCandidateById: {
          candidacies: [],
        },
      }),
    ),
    fvae.query(
      "certifications",
      graphQLResolver({
        searchCertificationsForCandidate: {
          rows: [certification],
          info: {
            totalRows: 1,
            currentPage: 1,
            totalPages: 1,
            pageLength: 10,
          },
        },
      }),
    ),
    fvae.query(
      "getCertificationById",
      graphQLResolver({ getCertification: certification }),
    ),
    strapi.query(
      "getArticlesForCertificationPageUsefulResources",
      graphQLResolver({
        articleDAides: [
          {
            documentId: "y0qlgrno9xs9fr588l7806ie",
            titre: "Comment financer son accompagnement VAE ?",
            slug: "financer-son-accompagnement-vae",
            description:
              "Découvrez comment financer son accompagnement VAE avec France VAE et les droits CPF.",
          },
          {
            documentId: "jorukunnafy4ko96eolx26b7",
            titre: "Dans quels cas est-il pertinent de faire une VAE ?",
            slug: "quand-faire-une-vae",
            description:
              "Quels sont les critères pour assurer la réussite de son projet ? Et comment savoir si c’est le bon moment de démarrer ? Voici un aperçu des questions importantes à se poser avant de se lancer.",
          },
          {
            documentId: "smok96d8r73weybh3lbippxf",
            titre: "Comment bien choisir son diplôme ?",
            slug: "comment-bien-choisir-son-diplome",
            description:
              "Il peut être complexe de choisir le diplôme qui correspond le mieux à son projet. Voici un résumé des questions à se poser pour faire le bon choix.",
          },
        ],
      }),
    ),
    fvae.query(
      "getCertificationByIdForCreateCandidacy",
      graphQLResolver({
        getCertification: {
          id: certification.id,
          label: certification.label,
          codeRncp: certification.codeRncp,
          isAapAvailable: true,
        },
      }),
    ),
    fvae.mutation(
      "createCandidacy",
      graphQLResolver({
        candidacy_createCandidacy: {
          id: candidacy.id,
        },
      }),
    ),
    fvae.query(
      "getCandidacyByIdForCandidacyGuard",
      graphQLResolver({ getCandidacyById: candidacy }),
    ),
    fvae.query(
      "getCandidacyByIdWithCandidate",
      graphQLResolver({ getCandidacyById: candidacy }),
    ),
    fvae.query(
      "getCandidacyByIdForDashboard",
      graphQLResolver({ getCandidacyById: candidacy }),
    ),
    fvae.mutation(
      "candidate_loginWithToken",
      graphQLResolver({ candidate_loginWithToken: null }),
    ),
    fvae.query(
      "activeFeaturesForConnectedUser",
      graphQLResolver({ activeFeaturesForConnectedUser: ["MULTI_CANDIDACY"] }),
    ),
  ];
}

async function loginAndWaitForInitialLoad(page: Page) {
  await login(page);
  await Promise.all([
    waitGraphQL(page, "candidate_getCandidateForCandidatesGuard"),
    waitGraphQL(page, "getCandidateByIdForCandidateGuard"),
    waitGraphQL(
      page,
      "candidate_getCandidateByIdWithCandidaciesForCandidaciesGuard",
    ),
    waitGraphQL(page, "activeFeaturesForConnectedUser"),
  ]);
}

test.describe("create candidacy accompagnée from candidacies page", () => {
  test.use({
    mswHandlers: [createCandidaciesHandlers(), { scope: "test" }],
  });

  test("create candidacy", async ({ page }) => {
    await loginAndWaitForInitialLoad(page);

    await page.goto(`candidates/${candidate.id}/candidacies/`);

    await expect(
      page.getByText(
        "Valorisez votre expérience professionnelle en commençant une candidature dès maintenant.",
      ),
    ).toBeVisible();

    const createCandidacyButton = page.getByRole("button", {
      name: "Commencer une VAE",
    });
    createCandidacyButton.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/create/`,
    );

    await expect(
      page.getByRole("heading", { name: "Commencer une VAE" }),
    ).toBeVisible();

    const maDemarcheEstPersonnelleCard = page.getByText(
      "Ma démarche est personnelle",
    );
    await expect(maDemarcheEstPersonnelleCard).toBeVisible();
    maDemarcheEstPersonnelleCard.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/create/certifications/`,
    );

    await waitGraphQL(page, "certifications");

    const certificationCard = page.getByText(certification.label);
    await expect(certificationCard).toBeVisible();
    certificationCard.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/create/certifications/${certification.id}/`,
    );

    const selectCertificationButton = page.getByRole("button", {
      name: "Choisir ce diplôme",
    });
    selectCertificationButton.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/create/certifications/${certification.id}/type-accompagnement/`,
    );

    const accompagnementButton = page.getByRole("button", {
      name: "Avec un accompagnateur",
    });
    await expect(accompagnementButton).toBeVisible();
    accompagnementButton.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/${candidacy.id}/`,
    );
  });
});
