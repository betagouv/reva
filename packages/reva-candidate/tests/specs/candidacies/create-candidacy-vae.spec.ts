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

function createCandidaciesHandlers() {
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
        cohorteVaeCollective,
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
});
