import {
  expect,
  graphql,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../../../shared/helpers/auth/login";
import { getAAPCommonHandlers } from "../../../../shared/helpers/common-handlers/aap/getAapCommon.handlers";
import { getCertificateurCommonHandlers } from "../../../../shared/helpers/common-handlers/certificateur/getCertificateurCommon.handlers";
import { graphQLResolver } from "../../../../shared/helpers/network/msw";
import { waitGraphQL } from "../../../../shared/helpers/network/requests";

import type { Page } from "@playwright/test";

const CANDIDACY_ID = "42288593-2a6b-4606-aedd-0d76348b39f4";
const fvae = graphql.link("https://reva-api/api/graphql");

const dematerializedFeasibilityFile = {
  id: "3f9b5518-16f8-4b8d-b585-0b046c938ee9",
  swornStatementFile: {
    name: "attestation-honneur.pdf",
    previewUrl: "https://files.example.com/attestation-honneur.pdf",
    mimeType: "application/pdf",
  },
  sentToCandidateAt: 1716984000000,
  aapDecision: "FAVORABLE",
  aapDecisionComment: "Candidat très motivé et dossier solide.",
  candidateDecisionComment: "Je confirme mon engagement dans ce parcours.",
  prerequisites: [
    {
      label: "Justifier de 2 ans d'expérience en logistique",
      state: "ACQUIRED",
    },
    {
      label: "Avoir suivi une formation sécurité",
      state: "IN_PROGRESS",
    },
    {
      label: "Détenir un permis cariste à jour",
      state: "RECOMMENDED",
    },
  ],
  firstForeignLanguage: "Anglais",
  secondForeignLanguage: "Espagnol",
  option: "Option pilotage d'activité",
  blocsDeCompetences: [
    {
      text: "Expérience significative en gestion d'équipe sur site logistique.",
      certificationCompetenceBloc: {
        id: "20849dc9-57d5-4f62-a4ee-acf37d6fb1c4",
        code: "48379857",
        label: "Organiser et piloter les activités logistiques",
        FCCompetences: "Planifier et coordonner les opérations logistiques.",
        competences: [
          {
            id: "51c0e3dd-99ad-4f1a-9d9d-84d412df0c58",
            label: "Définir les indicateurs de performance",
          },
          {
            id: "f1c04640-90ee-4eba-a3c9-066ad0d67b62",
            label: "Manager les équipes logistiques",
          },
        ],
      },
    },
    {
      text: "Compétences à confirmer sur la digitalisation des flux.",
      certificationCompetenceBloc: {
        id: "f8258b9e-3d8e-4c1f-9162-28da7267e202",
        code: "2849037",
        label: "Digitaliser les processus logistiques",
        FCCompetences: "Concevoir des outils numériques pour suivre les flux.",
        competences: [
          {
            id: "2a49720b-5135-4b18-8cba-77f92f8faabd",
            label: "Mettre en place des outils de suivi en temps réel",
          },
          {
            id: "526ef5b3-3fde-4ad2-8a4f-4c95bdc30744",
            label: "Superviser l'intégration des données",
          },
        ],
      },
    },
  ],
  certificationCompetenceDetails: [
    {
      state: "YES",
      certificationCompetence: {
        id: "51c0e3dd-99ad-4f1a-9d9d-84d412df0c58",
        label: "Définir les indicateurs de performance",
      },
    },
    {
      state: "PARTIALLY",
      certificationCompetence: {
        id: "f1c04640-90ee-4eba-a3c9-066ad0d67b62",
        label: "Manager les équipes logistiques",
      },
    },
    {
      state: "NO",
      certificationCompetence: {
        id: "2a49720b-5135-4b18-8cba-77f92f8faabd",
        label: "Mettre en place des outils de suivi en temps réel",
      },
    },
  ],
  attachments: [
    {
      type: "CV",
      file: {
        name: "cv-candidat.pdf",
        previewUrl: "https://files.example.com/cv-candidat.pdf",
        mimeType: "application/pdf",
      },
    },
    {
      type: "PORTFOLIO",
      file: {
        name: "plan-action.pdf",
        previewUrl: "https://files.example.com/plan-action.pdf",
        mimeType: "application/pdf",
      },
    },
  ],
  eligibilityRequirement: "FULL_ELIGIBILITY_REQUIREMENT",
  eligibilityValidUntil: 1735646400000,
  eligibilityCandidateSituation: "PREMIERE_DEMANDE_RECEVABILITE",
  dffFile: {
    url: "https://files.example.com/dff-resume.pdf",
    name: "dossier-feasibilite.pdf",
    previewUrl: "https://files.example.com/dff-resume-preview.pdf",
    mimeType: "application/pdf",
  },
};

const candidacy = {
  id: CANDIDACY_ID,
  status: "DOSSIER_FAISABILITE_COMPLET",
  isCertificationPartial: false,
  organism: {
    contactAdministrativePhone: "0145678901",
    contactAdministrativeEmail: "contact@organism-aap.fr",
    adresseVille: "Marseille",
    adresseCodePostal: "13002",
    adresseInformationsComplementaires: "Bâtiment B",
    adresseNumeroEtNomDeRue: "10 quai du Port",
    emailContact: "suivi@organism-aap.fr",
    telephone: "0499010203",
    nomPublic: "Organisme AAP Méditerranée",
    label: "Organisme AAP Méditerranée",
  },
  certificationAuthorityLocalAccounts: [
    {
      contactFullName: "Claire Lemaire",
      contactEmail: "claire.lemaire@certificateur.fr",
      contactPhone: "0600000001",
    },
    {
      contactFullName: "David Roussel",
      contactEmail: "david.roussel@certificateur.fr",
      contactPhone: "0600000002",
    },
  ],
  individualHourCount: 42,
  collectiveHourCount: 18,
  additionalHourCount: 9,
  basicSkills: [
    {
      label: "Analyse de données",
      id: "06a3a2b8-c94f-4828-9ad6-a1bd4efd5d54",
    },
  ],
  mandatoryTrainings: [
    {
      label: "Prévention des risques professionnels",
      id: "88e62b48-3224-45cb-b6f3-2439278f8cb7",
    },
    {
      label: "Management d'équipe avancé",
      id: "5f8b9f8d-a9f7-4a84-8fdc-8f6f0a0e6d4c",
    },
  ],
  certification: {
    certificationAuthorities: [
      {
        id: "5a8d7f1d-2b48-4cbd-b7f3-4e77dd6db6b2",
        label: "Certificateur Métiers Services",
      },
    ],
    label: "Titre professionnel Responsable logistique",
    codeRncp: "2983029843",
    level: 6,
    degree: {
      level: 6,
    },
    certificationAuthorityStructure: {
      label: "Ministère du Travail",
    },
  },
  goals: [
    {
      id: "5b5bc4ad-032b-4cc0-a721-01740ad3884a",
      label: "Trouver plus facilement un emploi",
      isActive: true,
    },
    {
      id: "4f7a6c89-ef80-45bd-9f0d-d21d6352f173",
      label: "Structurer une équipe logistique multi-sites",
      isActive: true,
    },
  ],
  experiences: [
    {
      id: "4184d861-2e5d-420c-a4fc-b8320bb5d602",
      title: "Chef d'équipe logistique",
      startedAt: 1609459200000,
      duration: "moreThanThreeYears",
      description:
        "Pilotage d'une équipe de 8 personnes sur plateforme multi-sites.",
    },
    {
      id: "7c57f70b-4c2c-476d-a8b1-9b32aa85a5bc",
      title: "Responsable adjoint d'exploitation",
      startedAt: 1672444800000,
      duration: "betweenOneAndThreeYears",
      description:
        "Coordination des flux internationaux et digitalisation des processus.",
    },
  ],
  certificateSkills: "Compétences transverses en management et digitalisation.",
  candidateInfo: {
    street: "10 quai du Port",
    city: "Marseille",
    zip: "13002",
    addressComplement: null,
  },
  candidate: {
    highestDegree: {
      level: "6",
    },
    niveauDeFormationLePlusEleve: {
      level: "6",
    },
    highestDegreeLabel: "Master logistique et transport",
    firstname: "Camille",
    firstname2: "Sabine",
    firstname3: null,
    lastname: "Durand",
    email: "camille.durand@example.com",
    givenName: "Bertrand",
    birthdate: "1987-03-12",
    birthCity: "Lyon",
    birthDepartment: {
      label: "Rhône",
      code: "69",
      region: {
        code: "84",
        label: "Auvergne-Rhône-Alpes",
      },
    },
    country: {
      id: "FR",
      label: "France",
    },
    nationality: "Française",
    gender: "woman",
    phone: "0607080910",
    city: "Marseille",
    street: "10 quai du Port",
    zip: "13002",
  },
  candidacyDropOut: null,
};

const aapCandidacy = {
  id: CANDIDACY_ID,
  status: "DOSSIER_FAISABILITE_COMPLET",
  isCertificationPartial: true,
  organism: {
    contactAdministrativePhone: "0145678901",
    contactAdministrativeEmail: "contact@organism-aap.fr",
    adresseVille: "Marseille",
    adresseCodePostal: "13002",
    adresseInformationsComplementaires: "Bâtiment B",
    adresseNumeroEtNomDeRue: "10 quai du Port",
    emailContact: "suivi@organism-aap.fr",
    telephone: "0499010203",
    nomPublic: "Organisme AAP Méditerranée",
    label: "Organisme AAP Méditerranée",
  },
  certificationAuthorityLocalAccounts: [
    {
      contactFullName: "Claire Lemaire",
      contactEmail: "claire.lemaire@certificateur.fr",
      contactPhone: "0600000001",
    },
    {
      contactFullName: "David Roussel",
      contactEmail: "david.roussel@certificateur.fr",
      contactPhone: "0600000002",
    },
  ],
  individualHourCount: 42,
  collectiveHourCount: 18,
  additionalHourCount: 9,
  basicSkills: [
    {
      label: "Analyse de données",
      id: "06a3a2b8-c94f-4828-9ad6-a1bd4efd5d54",
    },
  ],
  mandatoryTrainings: [
    {
      label: "Prévention des risques professionnels",
      id: "88e62b48-3224-45cb-b6f3-2439278f8cb7",
    },
  ],
  certification: {
    certificationAuthorities: [
      {
        id: "5a8d7f1d-2b48-4cbd-b7f3-4e77dd6db6b2",
        label: "Certificateur Métiers Services",
      },
    ],
    label: "Titre professionnel Responsable logistique",
    codeRncp: "9083904",
    level: 6,
    degree: {
      level: 6,
    },
    certificationAuthorityStructure: {
      label: "Ministère du Travail",
    },
  },
  goals: [
    {
      id: "5b5bc4ad-032b-4cc0-a721-01740ad3884a",
      label: "Trouver plus facilement un emploi",
      isActive: true,
    },
  ],
  experiences: [
    {
      id: "4184d861-2e5d-420c-a4fc-b8320bb5d602",
      title: "Chef d'équipe logistique",
      startedAt: 1609459200000,
      duration: "moreThanThreeYears",
      description:
        "Pilotage d'une équipe de 8 personnes sur plateforme multi-sites.",
    },
  ],
  certificateSkills: "Compétences transverses en management et digitalisation.",
  candidateInfo: {
    street: "10 quai du Port",
    city: "Marseille",
    zip: "13002",
    addressComplement: null,
  },
  candidate: {
    highestDegree: {
      level: "6",
    },
    niveauDeFormationLePlusEleve: {
      level: "6",
    },
    highestDegreeLabel: "Master logistique et transport",
    firstname: "Camille",
    firstname2: "Sabine",
    firstname3: null,
    lastname: "Durand",
    email: "camille.durand@example.com",
    givenName: "Bertrand",
    birthdate: "1987-03-12",
    birthCity: "Lyon",
    birthDepartment: {
      label: "Rhône",
      code: "69",
      region: {
        code: "84",
        label: "Auvergne-Rhône-Alpes",
      },
    },
    country: {
      id: "FR",
      label: "France",
    },
    nationality: "Française",
    gender: "woman",
    phone: "0607080910",
    city: "Marseille",
    street: "10 quai du Port",
    zip: "13002",
  },
  candidacyDropOut: null,
};

const certificateurFeasibilitySummary = {
  id: "91b6a93d-0f2b-4e0f-85f1-31f3a4e61251",
  decision: "COMPLETE",
  decisionComment: "Analyse du dossier terminée, décision à valider.",
  decisionSentAt: null,
  certificationAuthority: {
    id: "5a8d7f1d-2b48-4cbd-b7f3-4e77dd6db6b2",
    label: "Certificateur Métiers Services",
    contactFullName: "Hélène Martin",
    contactEmail: "helene.martin@certificateur.fr",
    contactPhone: "0176543210",
  },
  history: [
    {
      id: "6deb7bb7-74d5-43b9-8fa6-0c1d262979fb",
      decision: "COMPLETE",
      decisionComment: "Dossier complet, en attente de décision.",
      decisionSentAt: 1716897600000,
    },
  ],
  dematerializedFeasibilityFile,
  candidacy,
};

type Scenario = {
  label: string;
  role: "certificateur" | "aapCollaborateur";
  url: string;
  handlers: ReturnType<typeof fvae.query>[];
  waitForQueries: (page: Page) => Promise<void>;
};

function createScenarios(): Scenario[] {
  const { certificateurCommonHandlers, certificateurCommonWait } =
    getCertificateurCommonHandlers({
      candidacyId: CANDIDACY_ID,
      candidateFirstname: "Camille",
      candidateLastname: "Durand",
    });

  const { aapCommonHandlers, aapCommonWait } = getAAPCommonHandlers();

  return [
    {
      label: "certificateur summary page",
      role: "certificateur",
      url: `/admin2/candidacies/${CANDIDACY_ID}/feasibility/`,
      handlers: [
        ...certificateurCommonHandlers,
        fvae.query(
          "getCandidacyWithFeasibilityQuery",
          graphQLResolver({
            getCandidacyById: {
              id: CANDIDACY_ID,
              feasibilityFormat: "DEMATERIALIZED",
            },
          }),
        ),
        fvae.query(
          "feasibilityGetActiveFeasibilityByCandidacyId",
          graphQLResolver({
            feasibility_getActiveFeasibilityByCandidacyId:
              certificateurFeasibilitySummary,
          }),
        ),
      ],
      waitForQueries: async (page: Page) => {
        await Promise.all([
          certificateurCommonWait(page),
          waitGraphQL(page, "getCandidacyWithFeasibilityQuery"),
          waitGraphQL(page, "feasibilityGetActiveFeasibilityByCandidacyId"),
        ]);
      },
    },
    {
      label: "aap send-file summary page",
      role: "aapCollaborateur",
      url: `/admin2/candidacies/${CANDIDACY_ID}/feasibility-aap/send-file-certification-authority`,
      handlers: [
        ...aapCommonHandlers,
        fvae.query(
          "getCandidacyByIdForAAPFeasibilityPage",
          graphQLResolver({
            getCandidacyById: aapCandidacy,
          }),
        ),
        fvae.query(
          "getActiveFeasibilitySendFileCertificationAuthorityByCandidacyId",
          graphQLResolver({
            feasibility_getActiveFeasibilityByCandidacyId:
              certificateurFeasibilitySummary,
          }),
        ),
      ],
      waitForQueries: async (page: Page) => {
        await Promise.all([
          aapCommonWait(page),
          waitGraphQL(
            page,
            "getActiveFeasibilitySendFileCertificationAuthorityByCandidacyId",
          ),
        ]);
      },
    },
  ];
}

const scenarios = createScenarios();

scenarios.forEach(({ label, role, url, handlers, waitForQueries }) => {
  test.describe(label, () => {
    test.use({
      mswHandlers: [handlers, { scope: "test" }],
    });

    test.beforeEach(async ({ page }) => {
      await login({ role, page });
      await page.goto(url);
      await waitForQueries(page);
    });

    test("displays the eligibility badge with the validity information", async ({
      page,
    }) => {
      const dffSummary = page.getByTestId("dff-summary");
      await expect(dffSummary).toBeVisible();
      await expect(
        dffSummary.getByText("Première demande de recevabilité"),
      ).toBeVisible();
      await expect(dffSummary.getByLabel("Date de fin de validité")).toHaveText(
        "31/12/2024",
      );
    });

    test("shows candidate identification and contact details", async ({
      page,
    }) => {
      const dffSummary = page.getByTestId("dff-summary");
      await expect(dffSummary.getByLabel("Civilité")).toHaveText("Mme ");
      await expect(dffSummary.getByLabel("Nom de naissance")).toHaveText(
        "Durand",
      );
      await expect(dffSummary.getByLabel("Prénoms")).toHaveText(
        "Camille, Sabine",
      );
      await expect(dffSummary.getByLabel("Date de naissance")).toHaveText(
        "12/03/1987",
      );
      await expect(dffSummary.getByLabel("Ville de naissance")).toHaveText(
        "Lyon (69)",
      );
      await expect(dffSummary.getByLabel("Nationalité")).toHaveText(
        "Française",
      );
      await expect(dffSummary.getByLabel("Adresse postale")).toHaveText(
        "10 quai du Port 13002 Marseille",
      );
      await expect(dffSummary.getByLabel("Adresse électronique")).toHaveText(
        "camille.durand@example.com",
      );
      await expect(dffSummary.getByLabel("Téléphone")).toHaveText("0607080910");
      await expect(
        dffSummary.getByLabel("Niveau de formation le plus élevé"),
      ).toHaveText("6");
      await expect(
        dffSummary.getByLabel(
          "Niveau de la certification obtenue la plus élevée",
        ),
      ).toHaveText("6");
      await expect(
        dffSummary.getByLabel(
          "Intitulé de la certification la plus élevée obtenue",
        ),
      ).toHaveText("Master logistique et transport");
    });

    test("renders certification information and languages", async ({
      page,
    }) => {
      const dffSummary = page.getByTestId("dff-summary");
      await expect(
        dffSummary.getByText("Titre professionnel Responsable logistique"),
      ).toBeVisible();
      await expect(dffSummary.getByText("RNCP 2983029843")).toBeVisible();

      await expect(dffSummary.getByLabel("Certificateur :")).toHaveText(
        "Ministère du Travail",
      );

      await expect(dffSummary.getByLabel("Option ou parcours :")).toHaveText(
        "Option pilotage d'activité",
      );

      await expect(dffSummary.getByLabel("Langue vivante 1 :")).toHaveText(
        "Anglais",
      );

      await expect(dffSummary.getByLabel("Langue vivante 2 :")).toHaveText(
        "Espagnol",
      );

      await expect(
        dffSummary.getByText("La certification dans sa totalité"),
      ).toBeVisible();
    });

    test("shows experience details", async ({ page }) => {
      const dffSummary = page.getByTestId("dff-summary");

      const experience1 = dffSummary.getByTestId("experience-accordion-0");
      await experience1.click();
      await expect(
        experience1.getByText("Expérience 1 - Chef d'équipe logistique"),
      ).toBeVisible();
      await expect(
        experience1.getByText("Démarrée le 01 janvier 2021"),
      ).toBeVisible();
      await expect(
        experience1.getByText("Expérience plus de 3 ans"),
      ).toBeVisible();
      await expect(
        experience1.getByText(
          "Pilotage d'une équipe de 8 personnes sur plateforme multi-sites.",
        ),
      ).toBeVisible();

      const experience2 = dffSummary.getByTestId("experience-accordion-1");
      await experience2.click();
      await expect(
        experience2.getByText(
          "Expérience 2 - Responsable adjoint d'exploitation",
        ),
      ).toBeVisible();
      await expect(
        experience2.getByText("Démarrée le 31 décembre 2022"),
      ).toBeVisible();
      await expect(
        experience2.getByText("Expérience entre 1 et 3 ans"),
      ).toBeVisible();
      await expect(
        experience2.getByText(
          "Coordination des flux internationaux et digitalisation des processus.",
        ),
      ).toBeVisible();
    });

    test("displays competence blocks with their states", async ({ page }) => {
      const dffSummary = page.getByTestId("dff-summary");

      const bloc1 = dffSummary.locator("section.fr-accordion").filter({
        hasText: "48379857 - Organiser et piloter les activités logistiques",
      });
      await bloc1.click();
      await expect(
        bloc1.getByText("Définir les indicateurs de performance"),
      ).toBeVisible();
      await expect(bloc1.getByText("Oui")).toBeVisible();
      await expect(
        bloc1.getByText("Manager les équipes logistiques"),
      ).toBeVisible();
      await expect(bloc1.getByText("Partiellement")).toBeVisible();
      await expect(
        bloc1.getByText(
          "Expérience significative en gestion d'équipe sur site logistique.",
        ),
      ).toBeVisible();

      const bloc2 = dffSummary.locator("section.fr-accordion").filter({
        hasText: "2849037 - Digitaliser les processus logistiques",
      });
      await bloc2.click();
      await expect(
        bloc2.getByText("Mettre en place des outils de suivi en temps réel"),
      ).toBeVisible();
      await expect(bloc2.getByText("Non")).toBeVisible();
      await expect(
        bloc2.getByText("Superviser l'intégration des données"),
      ).toBeVisible();
      await expect(bloc2.getByText("À compléter")).toBeVisible();
      await expect(
        bloc2.getByText(
          "Compétences à confirmer sur la digitalisation des flux.",
        ),
      ).toBeVisible();
    });

    test("groups prerequisites by status", async ({ page }) => {
      const dffSummary = page.getByTestId("dff-summary");

      const acquisAccordion = dffSummary
        .locator("section.fr-accordion")
        .filter({ hasText: "Oui" });
      await expect(acquisAccordion.locator("li")).toContainText(
        "Justifier de 2 ans d'expérience en logistique",
      );

      const enCoursAccordion = dffSummary
        .locator("section.fr-accordion")
        .filter({ hasText: "Non" });
      await expect(enCoursAccordion.locator("li")).toContainText(
        "Avoir suivi une formation sécurité",
      );

      const preconisesAccordion = dffSummary
        .locator("section.fr-accordion")
        .filter({ hasText: "Préconisés" });
      await expect(preconisesAccordion.locator("li")).toContainText(
        "Détenir un permis cariste à jour",
      );
    });

    test("shows planned parcours, goals and decision data", async ({
      page,
    }) => {
      const dffSummary = page.getByTestId("dff-summary");
      await expect(
        dffSummary.getByLabel("Accompagnement individuel :"),
      ).toHaveText("42h");
      await expect(
        dffSummary.getByLabel("Accompagnement collectif :"),
      ).toHaveText("18h");
      await expect(dffSummary.getByLabel("Formation :")).toHaveText("9h");

      await expect(
        dffSummary.getByText("Prévention des risques professionnels"),
      ).toBeVisible();
      await expect(
        dffSummary.getByText("Management d'équipe avancé"),
      ).toBeVisible();
      await expect(dffSummary.getByText("Analyse de données")).toBeVisible();
      await expect(
        dffSummary.getByText("Trouver plus facilement un emploi"),
      ).toBeVisible();
      await expect(
        dffSummary.getByText("Structurer une équipe logistique multi-sites"),
      ).toBeVisible();

      await expect(dffSummary.getByText("Favorable")).toBeVisible();
      await expect(
        dffSummary.getByText("Candidat très motivé et dossier solide."),
      ).toBeVisible();
      await expect(
        dffSummary.getByText("Je confirme mon engagement dans ce parcours."),
      ).toBeVisible();
    });

    test("lists attachments", async ({ page }) => {
      const dffSummary = page.getByTestId("dff-summary");
      await expect(dffSummary.getByText("cv-candidat.pdf")).toBeVisible();
      await expect(dffSummary.getByText("plan-action.pdf")).toBeVisible();
      await expect(
        dffSummary.getByText("attestation-honneur.pdf"),
      ).toBeVisible();
    });

    if (label === "certificateur summary page") {
      test("shows the contact blocks", async ({ page }) => {
        const contactInfosSection = page.getByTestId("contact-infos-section");

        const organismTile = contactInfosSection
          .getByTestId("organism-contact-info-tile")
          .first();
        await expect(organismTile).toBeVisible();
        await expect(organismTile).toContainText("Organisme AAP Méditerranée");
        await expect(organismTile).toContainText("10 quai du Port");
        await expect(organismTile).toContainText("13002");
        await expect(organismTile).toContainText("Marseille");
        await expect(organismTile).toContainText("0499010203");
        await expect(organismTile).toContainText("suivi@organism-aap.fr");

        const certificationAuthorityTile = contactInfosSection
          .getByTestId("certification-authority-contact-info-tile")
          .first();
        await expect(certificationAuthorityTile).toBeVisible();
        await expect(certificationAuthorityTile).toContainText(
          "Certificateur Métiers Services",
        );

        const localAccount0 = contactInfosSection
          .getByTestId("certification-authority-local-account-0")
          .first();
        await expect(localAccount0).toBeVisible();
        await expect(localAccount0).toContainText("Claire Lemaire");
        await expect(
          localAccount0.getByText("claire.lemaire@certificateur.fr"),
        ).toBeVisible();
        await expect(localAccount0.getByText("0600000001")).toBeVisible();

        const localAccount1 = contactInfosSection
          .getByTestId("certification-authority-local-account-1")
          .first();
        await expect(localAccount1).toBeVisible();
        await expect(localAccount1).toContainText("David Roussel");
        await expect(
          localAccount1.getByText("david.roussel@certificateur.fr"),
        ).toBeVisible();
        await expect(localAccount1.getByText("0600000002")).toBeVisible();
      });
    } else {
      test("hides the contact blocks", async ({ page }) => {
        await expect(
          page.getByTestId("contact-infos-section"),
        ).not.toBeVisible();
      });
    }
  });
});
