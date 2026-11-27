import {
  expect,
  graphql,
  Page,
  test,
} from "next/experimental/testmode/playwright/msw";

import { CertificationStatus } from "@/graphql/generated/graphql";

import { login } from "../../../../shared/helpers/auth/login";
import { getCertificateurSettingsCommonHandlers } from "../../../../shared/helpers/common-handlers/certificateur/getCertificateurSettingsCommon.handlers";
import { graphQLResolver } from "../../../../shared/helpers/network/msw";
import { waitGraphQL } from "../../../../shared/helpers/network/requests";

const fvae = graphql.link("https://reva-api/api/graphql");

const CERTIFICATION_ID = "bf78b4d6-f6ac-4c8f-9e6b-d6c6ae9e891b";
const FIRST_COMPETENCE_BLOC_ID = "008a6fab-55ad-4412-ab17-56bc4b8e2fd0";
const SUMMARY_PAGE_PATH = `/admin2/responsable-certifications/certifications/${CERTIFICATION_ID}`;
const CERTIFICATION_TITLE = "37310 - BP Boucher";

const baseCompetenceBlocs = [
  {
    id: FIRST_COMPETENCE_BLOC_ID,
    code: "B1",
    label: "Préparation, présentation, décoration et vente en boucherie",
    competences: [
      {
        id: "b8786018-6d24-4538-9622-f4ac62eb1742",
        label: "Réaliser les opérations de préparations des viandes",
      },
      {
        id: "2cbb6688-7b80-416f-940a-e348246484f8",
        label:
          "Mettre en valeur les produits notamment l’intégralité de la carcasse dans une démarche de développement durable",
      },
      {
        id: "2c829da9-ed10-48a3-ae1b-2f7db433c6d8",
        label:
          "Vendre les produits au client en argumentant et en proposant des conseils culinaires",
      },
      {
        id: "5aad9206-27a0-4afa-ac28-06d30bab6504",
        label:
          "Communiquer sur l’étiquetage, la conservation, la traçabilité, les signes officiels de qualité et l’origine des viandes",
      },
    ],
  },
  {
    id: "cc8f1e74-fcd8-4d8b-b03f-97b3012b015d",
    code: "B2",
    label:
      "Application des règles relatives à l'alimentation et à l'hygiène, aux locaux et équipements du laboratoire et de l'unité de vente en boucherie",
    competences: [
      {
        id: "40300ce1-e877-44e1-af0b-ec3db3ba7eb8",
        label:
          "Analyser des situations professionnelles nécessitant la connaissance des animaux de boucherie et leurs produits, l’environnement professionnel du boucher et les techniques professionnelles de la boucherie",
      },
      {
        id: "a8e39ba6-9463-48b2-aa99-f8ce1b83904c",
        label:
          "Appliquer les règles relatives à l’alimentation, à l’hygiène, aux locaux et équipements dans l’environnement professionnel du boucher et de la boucherie",
      },
    ],
  },
];

const basePrerequisites = [
  {
    id: "71ba9727-eb22-47a1-8731-89263348bf63",
    label: "Prerequisite 1",
  },
  {
    id: "2a7f19b0-510f-44cc-b0f6-8648ea0f6cd1",
    label: "Prerequisite 2",
  },
];

const CERTIFICATION_AUTHORITY_ID = "certification-authority-id";

const {
  certificateurSettingsAdminCommonWait,
  certificateurSettingsCommonHandlers,
  certificateurSettingsCommonWait,
} = getCertificateurSettingsCommonHandlers({
  certificationAuthorityId: CERTIFICATION_AUTHORITY_ID,
});

function createCertificationSummaryHandlers({
  hasReducedRequirements,
  withAdditionalInfo,
  withJuryData,
  withPrerequisites,
  status,
  dossierDeValidationTemplateMimeType = "application/pdf",
}: {
  hasReducedRequirements: boolean;
  withAdditionalInfo: boolean;
  withJuryData: boolean;
  withPrerequisites: boolean;
  status: CertificationStatus;
  dossierDeValidationTemplateMimeType?: string;
}) {
  return [
    fvae.query(
      "getCertificationForCertificationRegistryManagerUpdateCertificationPage",
      graphQLResolver({
        getCertification: {
          id: CERTIFICATION_ID,
          label: "BP Boucher",
          codeRncp: "37310",
          status,
          rncpExpiresAt: 1788127200000,
          rncpPublishedAt: null,
          rncpEffectiveAt: null,
          rncpDeliveryDeadline: null,
          availableAt: 1688162400000,
          typeDiplome: null,
          juryTypeMiseEnSituationProfessionnelle: null,
          juryTypeSoutenanceOrale: withJuryData ? "PRESENTIEL" : null,
          juryFrequency: withJuryData ? "MONTHLY" : null,
          juryFrequencyOther: null,
          juryPlace: null,
          juryEstimatedCost: withJuryData ? 10 : null,
          certificationAuthorityStructure: {
            hasReducedRequirements,
          },
          additionalInfo: withAdditionalInfo
            ? {
                linkToReferential: "https://www.google.fr",
                dossierDeValidationTemplate: {
                  name: "Template de dossier de validation",
                  previewUrl: "https://www.google.fr",
                  mimeType: dossierDeValidationTemplateMimeType,
                },
                additionalDocuments: [],
              }
            : null,
          degree: {
            id: "degree-id",
            level: 4,
          },
          domains: [],
          competenceBlocs: baseCompetenceBlocs,
          prerequisites: withPrerequisites ? basePrerequisites : [],
        },
      }),
    ),
  ];
}

async function openSummaryPage({
  page,
  role,
}: {
  page: Page;
  role: "admin" | "certificateurRegistryManager";
}) {
  await login({ role, page });
  await page.goto(SUMMARY_PAGE_PATH);
  await Promise.all([
    role === "admin"
      ? certificateurSettingsAdminCommonWait(page)
      : certificateurSettingsCommonWait(page),
    waitGraphQL(
      page,
      "getCertificationForCertificationRegistryManagerUpdateCertificationPage",
    ),
  ]);
}

test.describe("certificateur certification summary page", () => {
  test("displays the page title", async ({ page, msw }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: false,
        withJuryData: false,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    await expect(
      page
        .getByTestId("certification-registry-manager-update-certification-page")
        .getByRole("heading", { level: 1 }),
    ).toHaveText(CERTIFICATION_TITLE);
  });

  test("displays the competence blocs and competences counts", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: false,
        withJuryData: false,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    const competenceBlocs = page.getByTestId("competence-bloc");
    await expect(competenceBlocs).toHaveCount(2);
    await expect(
      competenceBlocs.nth(0).getByTestId("competences-list").locator("li"),
    ).toHaveCount(4);
    await expect(
      competenceBlocs.nth(1).getByTestId("competences-list").locator("li"),
    ).toHaveCount(2);
  });

  test("navigates to the first competence bloc update page", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: false,
        withJuryData: false,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    await Promise.all([
      page.waitForURL(
        `/admin2/responsable-certifications/certifications/${CERTIFICATION_ID}/bloc-competence/${FIRST_COMPETENCE_BLOC_ID}/`,
      ),
      page
        .getByTestId("competence-bloc")
        .nth(0)
        .getByTestId("update-competence-bloc-button")
        .click(),
    ]);
  });

  test("displays a default message when the certification has no prerequisite", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: false,
        withJuryData: false,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    await expect(
      page
        .getByTestId("prerequisites-summary-card")
        .getByTestId("no-prerequisite-message"),
    ).toBeVisible();
  });

  test("displays a list of prerequisites when the certification has them", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: false,
        withJuryData: false,
        withPrerequisites: true,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    await expect(
      page
        .getByTestId("prerequisites-summary-card")
        .getByTestId("prerequisite-list")
        .locator("li"),
    ).toHaveCount(2);
  });

  test("navigates to the prerequisites page from the summary card", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: false,
        withJuryData: false,
        withPrerequisites: true,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    await Promise.all([
      page.waitForURL(
        `/admin2/responsable-certifications/certifications/${CERTIFICATION_ID}/prerequisites/`,
      ),
      page
        .getByTestId("prerequisites-summary-card")
        .getByTestId("action-button")
        .click(),
    ]);
  });

  test("displays a default message when the certification has no additional info", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: false,
        withJuryData: false,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    await expect(
      page
        .getByTestId("additional-info-summary-card")
        .getByTestId("no-additional-info-message"),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("additional-info-summary-card")
        .getByTestId("additional-info-content"),
    ).not.toBeVisible();
  });

  test("displays the additional info when the certification has them", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: true,
        withJuryData: false,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    await expect(
      page
        .getByTestId("additional-info-summary-card")
        .getByTestId("additional-info-content"),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("additional-info-summary-card")
        .getByTestId("no-additional-info-message"),
    ).not.toBeVisible();
  });

  test("displays a preview of a pdf dossier de validation template", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: true,
        withJuryData: false,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    const additionalInfoContent = page
      .getByTestId("additional-info-summary-card")
      .getByTestId("additional-info-content");
    await expect(
      additionalInfoContent.getByTestId(
        "feasibility-files-preview-Trame du dossier de validation",
      ),
    ).toBeVisible();
    await expect(
      additionalInfoContent.getByTestId(
        "dossier-de-validation-template-download-link",
      ),
    ).toHaveCount(0);
  });

  test("displays a download link instead of a preview for an odt dossier de validation template", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: true,
        withJuryData: false,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
        dossierDeValidationTemplateMimeType:
          "application/vnd.oasis.opendocument.text",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    const additionalInfoContent = page
      .getByTestId("additional-info-summary-card")
      .getByTestId("additional-info-content");
    await expect(
      additionalInfoContent.getByTestId(
        "dossier-de-validation-template-download-link",
      ),
    ).toHaveAttribute("href", "https://www.google.fr");
    await expect(
      additionalInfoContent.getByTestId(
        "feasibility-files-preview-Trame du dossier de validation",
      ),
    ).toHaveCount(0);
  });

  test("navigates to the additional info page from the summary card", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: false,
        withJuryData: false,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    await Promise.all([
      page.waitForURL(
        `/admin2/responsable-certifications/certifications/${CERTIFICATION_ID}/additional-info/`,
      ),
      page
        .getByTestId("additional-info-summary-card")
        .getByTestId("action-button")
        .click(),
    ]);
  });

  test("keeps validation blocked when description is incomplete", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: true,
        withJuryData: false,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    await expect(
      page.getByRole("button", { name: "Valider cette certification" }),
    ).toBeDisabled();
  });

  test("keeps validation enabled when description and additional info are complete", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: true,
        withJuryData: true,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    await expect(
      page.getByRole("button", { name: "Valider cette certification" }),
    ).toBeEnabled();
  });

  test.skip("keeps the validation buttons hidden when the certification is already validated", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: true,
        withJuryData: true,
        withPrerequisites: false,
        status: "VALIDE_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    await expect(page.getByTestId("form-buttons")).not.toBeVisible();
  });

  test("shows the replace certification button and navigates to the replace page when status is VALIDE_PAR_CERTIFICATEUR", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: false,
        withJuryData: false,
        withPrerequisites: false,
        status: "VALIDE_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "certificateurRegistryManager" });

    await Promise.all([
      page.waitForURL(
        `/admin2/responsable-certifications/certifications/${CERTIFICATION_ID}/replace/`,
      ),
      page.getByTestId("replace-certification-button").click(),
    ]);
  });

  test("shows the replace certification button and navigates to the replace page when status is INACTIVE", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: false,
        withJuryData: false,
        withPrerequisites: false,
        status: "INACTIVE",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "certificateurRegistryManager" });

    await Promise.all([
      page.waitForURL(
        `/admin2/responsable-certifications/certifications/${CERTIFICATION_ID}/replace/`,
      ),
      page.getByTestId("replace-certification-button").click(),
    ]);
  });

  test("hides the replace certification button when the certification still has to be validated", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: false,
        withJuryData: false,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "certificateurRegistryManager" });

    await expect(
      page.getByTestId("replace-certification-button"),
    ).not.toBeVisible();
  });

  test("keeps validation blocked when additional info is missing", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: false,
        withAdditionalInfo: false,
        withJuryData: true,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    await expect(
      page.getByRole("button", { name: "Valider cette certification" }),
    ).toBeDisabled();
  });

  test("allows validation without jury and without additional info when reduced requirements are enabled", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationSummaryHandlers({
        hasReducedRequirements: true,
        withAdditionalInfo: false,
        withJuryData: false,
        withPrerequisites: false,
        status: "A_VALIDER_PAR_CERTIFICATEUR",
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openSummaryPage({ page, role: "admin" });

    const additionalInfoCard = page.getByTestId("additional-info-summary-card");
    await expect(
      additionalInfoCard.getByRole("heading", { name: "Documentation" }),
    ).toBeVisible();
    await expect(
      additionalInfoCard.getByTestId("to-complete-badge"),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Valider cette certification" }),
    ).toBeEnabled();
  });
});
