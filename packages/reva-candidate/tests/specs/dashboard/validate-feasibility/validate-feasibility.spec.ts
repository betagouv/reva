import { expect, test } from "next/experimental/testmode/playwright/msw";

import { login } from "@tests/helpers/auth/auth";
import {
  navigateToValidateFeasibility,
  validateFeasibilityHandlers,
} from "@tests/helpers/handlers/validate-feasibility/validate-feasibility.handler";

test.describe("Dematerialized feasibility résumé", () => {
  const { handlers, validateFeasibilityWait, candidateId, candidacyId } =
    validateFeasibilityHandlers();

  test.use({
    mswHandlers: [handlers, { scope: "test" }],
  });

  test.beforeEach(async ({ page }) => {
    await page.route("https://files.example.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "application/pdf",
        },
        body: "fake-pdf-content",
      });
    });

    await login(page);
    await navigateToValidateFeasibility(page, candidateId, candidacyId);
    await validateFeasibilityWait(page);
  });

  test("displays candidate information", async ({ page }) => {
    const dffSummary = page.getByTestId("dff-summary");
    await expect(dffSummary.getByLabel("Civilité")).toHaveText("Mme");
    await expect(dffSummary.getByLabel("Nom de naissance")).toHaveText(
      "Dupont",
    );
    await expect(dffSummary.getByLabel("Prénoms")).toHaveText("Claire, Marie");
    await expect(dffSummary.getByLabel("Date de naissance")).toHaveText(
      "12/04/1988",
    );
    await expect(dffSummary.getByLabel("Ville de naissance")).toHaveText(
      "Lyon (69)",
    );
    await expect(dffSummary.getByLabel("Nationalité")).toHaveText("Francaise");
    await expect(dffSummary.getByLabel("Adresse postale")).toHaveText(
      "12 rue du Port 13002 Marseille",
    );
    await expect(dffSummary.getByLabel("Téléphone")).toHaveText("0601020304");
    await expect(dffSummary.getByLabel("Adresse électronique")).toHaveText(
      "claire.dupont@example.com",
    );
  });

  test("displays candidate education levels", async ({ page }) => {
    const dffSummary = page.getByTestId("dff-summary");
    await expect(
      dffSummary.getByLabel("Niveau de formation le plus élevé"),
    ).toHaveText("5");
    await expect(
      dffSummary.getByLabel(
        "Niveau de la certification obtenue la plus élevée",
      ),
    ).toHaveText("4");
    await expect(
      dffSummary.getByLabel(
        "Intitulé de la certification la plus élevée obtenue",
      ),
    ).toHaveText("BTS logistique");
  });

  test("displays certification information", async ({ page }) => {
    const dffSummary = page.getByTestId("dff-summary");
    await expect(
      dffSummary.getByTestId("dff-summary-certification-card"),
    ).toBeVisible();
    await expect(
      dffSummary
        .getByTestId("dff-summary-certification-card")
        .getByText("RNCP 9083904"),
    ).toBeVisible();
    await expect(
      dffSummary
        .getByTestId("dff-summary-certification-card")
        .getByText("Titre professionnel Responsable logistique"),
    ).toBeVisible();
    await expect(dffSummary.getByLabel("Certificateur :")).toHaveText(
      "Certificateur Metiers Services",
    );
    await expect(
      dffSummary
        .getByLabel("Option ou parcours :")
        .getByText("Option pilotage d'activite"),
    ).toBeVisible();
    await expect(dffSummary.getByLabel("Langue vivante 1 :")).toHaveText(
      "Anglais",
    );
    await expect(dffSummary.getByLabel("Langue vivante 2 :")).toHaveText(
      "Espagnol",
    );
  });

  test("displays blocs de competences", async ({ page }) => {
    const dffSummary = page.getByTestId("dff-summary");

    const bloc1 = dffSummary
      .locator("section.fr-accordion")
      .filter({
        hasText: "48379857 - Organiser et piloter les activites logistiques",
      })
      .nth(1);
    await bloc1.click();
    await expect(
      bloc1.getByText("Definir les indicateurs de performance"),
    ).toBeVisible();
    await expect(bloc1.getByText("Oui")).toBeVisible();
    await expect(
      bloc1.getByText("Manager les equipes logistiques"),
    ).toBeVisible();
    await expect(bloc1.getByText("Partiellement")).toBeVisible();
    await expect(
      bloc1.getByText(
        "Experience significative en gestion d'equipe sur site logistique.",
      ),
    ).toBeVisible();

    const bloc2 = dffSummary
      .locator("section.fr-accordion")
      .filter({
        hasText: "2849037 - Digitaliser les processus logistiques",
      })
      .nth(1);
    await bloc2.click();
    await expect(
      bloc2.getByText("Mettre en place des outils de suivi en temps reel"),
    ).toBeVisible();
    await expect(bloc2.getByText("Non")).toBeVisible();
    await expect(
      bloc2.getByText("Superviser l'integration des donnees"),
    ).toBeVisible();
    await expect(bloc2.getByText("Oui")).toBeVisible();
    await expect(
      bloc2.getByText(
        "Competences a confirmer sur la digitalisation des flux.",
      ),
    ).toBeVisible();
  });

  test("displays prerequisites", async ({ page }) => {
    const dffSummary = page.getByTestId("dff-summary");

    const acquisAccordion = dffSummary
      .locator("section.fr-accordion")
      .filter({ hasText: "Acquis" });
    await expect(acquisAccordion.locator("li")).toContainText(
      "Justifier de 2 ans d'experience en logistique",
    );

    const enCoursAccordion = dffSummary
      .locator("section.fr-accordion")
      .filter({ hasText: "En cours" });
    await expect(enCoursAccordion.locator("li")).toContainText(
      "Avoir suivi une formation securite",
    );

    const preconisesAccordion = dffSummary
      .locator("section.fr-accordion")
      .filter({ hasText: "Préconisés" });
    await expect(preconisesAccordion.locator("li")).toContainText(
      "Detenir un permis cariste a jour",
    );
  });

  test("displays professional experiences", async ({ page }) => {
    const dffSummary = page.getByTestId("dff-summary");

    const experience1 = dffSummary.getByTestId("experience-accordion-0");
    await experience1.click();
    await expect(
      experience1.getByText("Cheffe d'equipe logistique"),
    ).toBeVisible();
    await expect(
      experience1.getByText("Démarrée le 01 janvier 2021"),
    ).toBeVisible();
    await expect(
      experience1.getByText("Expérience plus de 3 ans"),
    ).toBeVisible();
    await expect(
      experience1.getByText(
        "Pilotage d'une equipe de 8 personnes sur une plateforme multi-sites.",
      ),
    ).toBeVisible();

    const experience2 = dffSummary.getByTestId("experience-accordion-1");
    await experience2.click();
    await expect(
      experience2.getByText("Coordinatrice supply chain"),
    ).toBeVisible();
    await expect(
      experience2.getByText("Démarrée le 01 janvier 2019"),
    ).toBeVisible();
    await expect(
      experience2.getByText("Expérience plus de 5 ans"),
    ).toBeVisible();
    await expect(
      experience2.getByText(
        "Supervision des flux entrants et sortants avec optimisation des stocks.",
      ),
    ).toBeVisible();
  });

  test("displays training hours", async ({ page }) => {
    const dffSummary = page.getByTestId("dff-summary");

    await expect(
      dffSummary.getByLabel("Accompagnement individuel :"),
    ).toHaveText("42h");
    await expect(
      dffSummary.getByLabel("Accompagnement collectif :"),
    ).toHaveText("18h");
    await expect(dffSummary.getByLabel("Formation :")).toHaveText("9h");
    await expect(
      dffSummary.getByText("Prevention des risques professionnels"),
    ).toBeVisible();
    await expect(dffSummary.getByText("Analyse de donnees")).toBeVisible();
    await expect(dffSummary.getByText("Gestion de projet")).toBeVisible();
  });

  test("displays goals", async ({ page }) => {
    const dffSummary = page.getByTestId("dff-summary");

    const goalsSection = dffSummary.getByTestId("goals-list");

    await expect(
      goalsSection.getByText("Trouver plus facilement un emploi"),
    ).toBeVisible();
    await expect(
      goalsSection.getByText("Se maintenir ou évoluer dans son emploi"),
    ).toBeVisible();
  });

  test("displays AAP comment", async ({ page }) => {
    const commentSection = page.getByTestId("decision-section");

    await expect(commentSection.getByText("Favorable")).toBeVisible();
    await expect(
      commentSection.getByText("Candidat très motive et dossier solide."),
    ).toBeVisible();
  });

  test("displays eligibility information", async ({ page }) => {
    const dffSummary = page.getByTestId("dff-summary");
    await expect(
      dffSummary.getByText("Première demande de recevabilité"),
    ).toBeVisible();
  });

  test("displays validation form and enables submit button", async ({
    page,
  }) => {
    await expect(
      page.locator(
        'iframe[title="Joindre l’attestation sur l’honneur complétée et signée"]',
      ),
    ).toBeVisible();

    const submitButton = page.getByRole("button", { name: "Envoyer" });
    await expect(submitButton).toBeDisabled();

    await page
      .getByText("J'ai lu et accepte cette version du dossier.")
      .click();

    await expect(submitButton).toBeEnabled();
  });
});
