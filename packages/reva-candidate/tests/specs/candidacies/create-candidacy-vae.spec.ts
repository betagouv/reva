import {
  expect,
  graphql,
  test,
  type Page,
} from "next/experimental/testmode/playwright/msw";

import { createCandidacyEntity } from "@tests/helpers/entities/create-candidacy.entity";
import { createCandidateEntity } from "@tests/helpers/entities/create-candidate.entity";
import { createCertificationEntity } from "@tests/helpers/entities/create-certification.entity";
import { createOrganismEntity } from "@tests/helpers/entities/create-organism.entity";
import {
  createCandidacyGuardsAndDashboardHandlers,
  createCandidaciesGuardsHandlers,
  loginAndWaitForCandidaciesInitialLoad,
} from "@tests/helpers/handlers/candidacies/candidacies-guards.handler";
import { graphQLResolver } from "@tests/helpers/network/msw";
import { waitGraphQL } from "@tests/helpers/network/requests";

const fvae = graphql.link("https://reva-api/api/graphql");

const candidate = createCandidateEntity();
const certification = createCertificationEntity({
  label: "Certification 1",
  codeRncp: "RNCP0001",
});
const certification2 = createCertificationEntity({
  id: "cert-2",
  label: "Certification 2",
  codeRncp: "RNCP0002",
});
const candidacy = createCandidacyEntity({
  candidate,
  certification,
  status: "PROJET",
  typeAccompagnement: "ACCOMPAGNE",
});
const organism = createOrganismEntity({
  label: "Organisme Accompagnateur",
  adresseNumeroEtNomDeRue: "12 rue de la VAE",
  adresseCodePostal: "75011",
  adresseVille: "Paris",
  telephone: "01 02 03 04 05",
});
const cohorteVaeCollective = {
  id: "12345678",
  nom: "Cohorte VAE Collective",
  codeInscription: "12345678",
  commanditaireVaeCollective: {
    raisonSociale: "Société VAE Collective",
  },
  organism,
  certificationCohorteVaeCollectives: [
    {
      certification,
    },
  ],
};
const cohorteWithSeveralCertifications = {
  ...cohorteVaeCollective,
  certificationCohorteVaeCollectives: [
    { certification },
    { certification: certification2 },
  ],
};

async function expectCohorteAndOrganismToBeDisplayed(page: Page) {
  await expect(
    page.getByRole("heading", { name: cohorteVaeCollective.nom }),
  ).toBeVisible();
  await expect(
    page.getByText(
      cohorteVaeCollective.commanditaireVaeCollective.raisonSociale,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Accompagnateur de la cohorte", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(organism.label, { exact: true })).toBeVisible();
  await expect(
    page.getByText(organism.adresseNumeroEtNomDeRue as string, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`${organism.adresseCodePostal} ${organism.adresseVille}`, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(organism.telephone as string, { exact: true }),
  ).toBeVisible();
}

async function expectCertificationToBeDisplayed(page: Page) {
  await expect(
    page.getByRole("heading", { name: cohorteVaeCollective.nom }),
  ).toBeVisible();
  if (cohorteVaeCollective.certificationCohorteVaeCollectives.length === 1) {
    const certification =
      cohorteVaeCollective.certificationCohorteVaeCollectives[0].certification;
    await expect(
      page.getByText(certification.label, { exact: true }),
    ).toBeVisible();
  }
}

function createCandidaciesHandlers(
  cohorte: typeof cohorteVaeCollective = cohorteVaeCollective,
) {
  const certifications = cohorte.certificationCohorteVaeCollectives.map(
    (certificationCohorte) => certificationCohorte.certification,
  );

  return [
    ...createCandidaciesGuardsHandlers({ candidate }),
    fvae.query(
      "getVaeCollectiveCohort",
      graphQLResolver({
        cohorteVaeCollective: {
          id: "12345678",
          codeInscription: "12345678",
        },
      }),
    ),
    fvae.query(
      "getVaeCollectiveCohortForCreateCandidacy",
      graphQLResolver({
        cohorteVaeCollective: cohorte,
      }),
    ),
    fvae.query(
      "getVaeCollectiveCohortForSearchCertification",
      graphQLResolver({
        cohorteVaeCollective: {
          id: cohorte.id,
          nom: cohorte.nom,
        },
      }),
    ),
    fvae.query(
      "searchCertificationsForCandidateVaeCollective",
      graphQLResolver({
        searchCertificationsForCandidate: {
          rows: certifications,
          info: {
            totalRows: certifications.length,
            currentPage: 1,
            totalPages: 1,
            pageLength: 10,
          },
        },
      }),
    ),
    fvae.mutation(
      "createVaeCollectiveCandidacy",
      graphQLResolver({
        candidacy_createCandidacy: {
          id: candidacy.id,
        },
      }),
    ),
    ...createCandidacyGuardsAndDashboardHandlers(candidacy),
  ];
}

test.describe("create candidacy vae from candidacies page", () => {
  test.use({
    mswHandlers: [createCandidaciesHandlers(), { scope: "test" }],
  });

  test("create candidacy", async ({ page }) => {
    await loginAndWaitForCandidaciesInitialLoad(page);

    await page.goto(`candidates/${candidate.id}/candidacies/`);

    await expect(
      page.getByText(
        "Valorisez votre expérience professionnelle en commençant une candidature dès maintenant.",
      ),
    ).toBeVisible();

    const createCandidacyLink = page.getByRole("link", {
      name: "Commencer une VAE",
    });
    await createCandidacyLink.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/create/`,
    );

    await expect(
      page.getByRole("heading", { name: "Commencer une VAE" }),
    ).toBeVisible();

    const vaeCard = page.getByRole("link", {
      name: "Je dispose d'un code VAE collective",
    });
    await expect(vaeCard).toBeVisible();
    await vaeCard.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/create/vae-collective/`,
    );

    await expect(
      page.getByRole("heading", { name: "Rejoindre une VAE collective" }),
    ).toBeVisible();

    const accederAVaeCollectiveButton = page.getByRole("button", {
      name: "Accéder à cette VAE collective",
    });
    await expect(accederAVaeCollectiveButton).toBeVisible();

    const vaeCollectiveCodeForm = page.getByRole("textbox", {
      name: "Code VAE collective",
    });
    await expect(vaeCollectiveCodeForm).toBeVisible();

    await vaeCollectiveCodeForm.fill("1234");
    await accederAVaeCollectiveButton.click();

    await expect(
      page.getByText("Le code doit contenir exactement 8 caractères"),
    ).toBeVisible();

    await vaeCollectiveCodeForm.fill("!nco087B@)");
    await accederAVaeCollectiveButton.click();

    await expect(
      page.getByText(
        "Le code ne doit contenir que des lettres et des chiffres",
      ),
    ).toBeVisible();

    await vaeCollectiveCodeForm.fill("12345678");
    await accederAVaeCollectiveButton.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/create/vae-collective/12345678/`,
    );

    await expect(
      page.getByRole("heading", { name: "Rejoindre cette VAE collective" }),
    ).toBeVisible();

    await expectCohorteAndOrganismToBeDisplayed(page);
    await expectCertificationToBeDisplayed(page);

    const rejoindreCohorteButton = page.getByRole("button", {
      name: "Rejoindre cette cohorte",
    });
    await expect(rejoindreCohorteButton).toBeVisible();
    await rejoindreCohorteButton.click();

    if (cohorteVaeCollective.certificationCohorteVaeCollectives.length === 1) {
      await expect(page).toHaveURL(
        `candidates/${candidate.id}/candidacies/create/vae-collective/12345678/consent/?certificationId=${cohorteVaeCollective.certificationCohorteVaeCollectives[0].certification.id}`,
      );
    } else {
      await expect(page).toHaveURL(
        `candidates/${candidate.id}/candidacies/create/vae-collective/12345678/consent/`,
      );
    }

    await expect(
      page.getByRole("heading", { name: "Rejoindre une VAE collective" }),
    ).toBeVisible();

    const acceptConsentButton = page.getByRole("button", { name: "Accepter" });
    await expect(acceptConsentButton).toBeVisible();
    await acceptConsentButton.click();

    await waitGraphQL(page, "createVaeCollectiveCandidacy");

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/${candidacy.id}/`,
    );
  });

  test("displays the organism associated with the cohorte", async ({
    page,
  }) => {
    await loginAndWaitForCandidaciesInitialLoad(page);

    await page.goto(
      `candidates/${candidate.id}/candidacies/create/vae-collective/12345678/`,
    );

    await expect(
      page.getByRole("heading", { name: "Rejoindre cette VAE collective" }),
    ).toBeVisible();

    await expectCohorteAndOrganismToBeDisplayed(page);
  });

  test("displays the certification associated with the cohorte", async ({
    page,
  }) => {
    await loginAndWaitForCandidaciesInitialLoad(page);

    await page.goto(
      `candidates/${candidate.id}/candidacies/create/vae-collective/12345678/`,
    );

    await expect(
      page.getByRole("heading", { name: "Rejoindre cette VAE collective" }),
    ).toBeVisible();

    await expectCertificationToBeDisplayed(page);
  });

  test.describe("when the cohorte has several certifications", () => {
    test.use({
      mswHandlers: [
        createCandidaciesHandlers(cohorteWithSeveralCertifications),
        { scope: "test" },
      ],
    });

    test("asks to choose a certification", async ({ page }) => {
      await loginAndWaitForCandidaciesInitialLoad(page);

      await page.goto(
        `candidates/${candidate.id}/candidacies/create/vae-collective/12345678/`,
      );

      await expect(
        page.getByRole("heading", { name: "Rejoindre cette VAE collective" }),
      ).toBeVisible();

      await expectCohorteAndOrganismToBeDisplayed(page);

      await expect(
        page.getByTestId("certification-section").getByRole("heading", {
          name: "Certification visée",
        }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Si votre cohorte a plusieurs certifications, la certification que vous visez reste modifiable au début du parcours.",
        ),
      ).toBeVisible();
      await expect(
        page.getByText(certification.label, { exact: true }),
      ).toBeHidden();
      await expect(
        page.getByText(certification2.label, { exact: true }),
      ).toBeHidden();

      await page.getByRole("button", { name: "Compléter" }).click();

      await expect(page).toHaveURL(
        `candidates/${candidate.id}/candidacies/create/vae-collective/12345678/search-certification/`,
      );
    });

    test("selects a certification then joins the cohorte", async ({ page }) => {
      await loginAndWaitForCandidaciesInitialLoad(page);

      await page.goto(
        `candidates/${candidate.id}/candidacies/create/vae-collective/12345678/`,
      );

      const searchCertifications = waitGraphQL(
        page,
        "searchCertificationsForCandidateVaeCollective",
      );
      await page.getByRole("button", { name: "Compléter" }).click();
      await searchCertifications;

      await expect(
        page.getByRole("heading", { name: "Choisir un diplôme" }),
      ).toBeVisible();
      await expect(
        page.getByText("Nombre de diplômes disponibles : 2"),
      ).toBeVisible();

      await page.getByRole("link", { name: certification2.label }).click();

      await expect(page).toHaveURL(
        `candidates/${candidate.id}/candidacies/create/vae-collective/12345678/?certificationId=${certification2.id}`,
      );

      await expect(
        page.getByText(certification2.label, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(`RNCP ${certification2.codeRncp}`, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Certification visée" }),
      ).toBeHidden();

      await page
        .getByRole("button", { name: "Rejoindre cette cohorte" })
        .click();

      await expect(page).toHaveURL(
        `candidates/${candidate.id}/candidacies/create/vae-collective/12345678/consent/?certificationId=${certification2.id}`,
      );

      const acceptConsentButton = page.getByRole("button", {
        name: "Accepter",
      });
      await expect(acceptConsentButton).toBeVisible();
      const createCandidacy = waitGraphQL(page, "createVaeCollectiveCandidacy");
      await acceptConsentButton.click();
      await createCandidacy;

      await expect(page).toHaveURL(
        `candidates/${candidate.id}/candidacies/${candidacy.id}/`,
      );
    });
  });
});
