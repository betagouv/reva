import {
  expect,
  graphql,
  Page,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../../../shared/helpers/auth/login";
import { getCertificateurSettingsCommonHandlers } from "../../../../shared/helpers/common-handlers/certificateur/getCertificateurSettingsCommon.handlers";
import { graphQLResolver } from "../../../../shared/helpers/network/msw";
import { waitGraphQL } from "../../../../shared/helpers/network/requests";

const fvae = graphql.link("https://reva-api/api/graphql");

const CERTIFICATION_ID = "certification-id";
const ADDITIONAL_INFO_PAGE_PATH = `/admin2/responsable-certifications/certifications/${CERTIFICATION_ID}/additional-info`;

const CERTIFICATION_AUTHORITY_ID = "certification-authority-id";

const {
  certificateurSettingsAdminCommonWait,
  certificateurSettingsCommonHandlers,
} = getCertificateurSettingsCommonHandlers({
  certificationAuthorityId: CERTIFICATION_AUTHORITY_ID,
});

function createCertificationAdditionalInfoHandlers({
  hasReducedRequirements,
}: {
  hasReducedRequirements: boolean;
}) {
  return [
    fvae.query(
      "getCertificationForCertificationRegistryManagerUpdateAdditionalInfoPage",
      graphQLResolver({
        getCertification: {
          id: CERTIFICATION_ID,
          label: "Certification test",
          codeRncp: "RNCP12345",
          certificationAuthorityStructure: {
            hasReducedRequirements,
          },
          additionalInfo: {
            linkToReferential: "https://example.test/referential",
            linkToCorrespondenceTable:
              "https://example.com/correspondencetable",
            dossierDeValidationTemplate: null,
            additionalDocuments: [],
            dossierDeValidationLink: null,
            linkToJuryGuide: "https://example.com/juryguide",
            certificationExpertContactDetails: "Mr Certification",
            certificationExpertContactPhone: null,
            certificationExpertContactEmail: null,
            usefulResources: "very useful",
            commentsForAAP: "AAP comment",
          },
        },
      }),
    ),
  ];
}

function createUpdateAdditionalInfoMutationHandler() {
  return fvae.mutation(
    "updateCertificationAdditionalInfo",
    graphQLResolver({
      referential_updateCertificationAdditionalInfo: {
        id: "additional-info-id",
      },
    }),
  );
}

async function openAdditionalInfoPage(page: Page) {
  await login({ role: "admin", page });
  await page.goto(ADDITIONAL_INFO_PAGE_PATH);

  await Promise.all([
    certificateurSettingsAdminCommonWait(page),
    waitGraphQL(
      page,
      "getCertificationForCertificationRegistryManagerUpdateAdditionalInfoPage",
    ),
  ]);
}

test.describe("certificateur certification additional info page", () => {
  test("shows the page title", async ({ page, msw }) => {
    msw.use(
      ...createCertificationAdditionalInfoHandlers({
        hasReducedRequirements: false,
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openAdditionalInfoPage(page);

    await expect(
      page.getByTestId("update-certification-additional-info-page"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Documentation", level: 1 }),
    ).toBeVisible();
  });

  test("allows submitting without documentation when reduced requirements are enabled", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationAdditionalInfoHandlers({
        hasReducedRequirements: true,
      }),
      createUpdateAdditionalInfoMutationHandler(),
      ...certificateurSettingsCommonHandlers,
    );

    await openAdditionalInfoPage(page);

    await expect(
      page.getByLabel(
        "Lien vers les référentiels d’activités et de compétences (optionnel) :",
      ),
    ).toBeVisible();

    await page.getByTestId("referential-link-input").locator("input").clear();
    await page
      .getByLabel("Remarques à destination des AAP et candidats (optionnel) :")
      .fill("Remarque test");

    const updateMutation = waitGraphQL(
      page,
      "updateCertificationAdditionalInfo",
    );
    await page.getByRole("button", { name: "Enregistrer" }).click();
    const mutationResponse = await updateMutation;
    const mutationPayload = mutationResponse.request().postDataJSON();

    await expect(
      page.getByText("Vous devez renseigner au moins un de ces deux champs"),
    ).toHaveCount(0);
    expect(
      mutationPayload.variables.input.additionalInfo.linkToReferential,
    ).toBe("");
  });

  test("focuses the referential link input when the form is submitted empty", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationAdditionalInfoHandlers({
        hasReducedRequirements: false,
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openAdditionalInfoPage(page);

    await page
      .getByTestId("dossier-de-validation-template-upload")
      .locator('input[type="file"]')
      .setInputFiles({
        name: "test-file.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("test-file"),
      });
    await page.getByTestId("referential-link-input").locator("input").clear();

    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(
      page.getByTestId("referential-link-input").locator("input"),
    ).toBeFocused();
  });

  test("keeps documentation required when dossier template and link are both missing", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationAdditionalInfoHandlers({
        hasReducedRequirements: false,
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openAdditionalInfoPage(page);

    await page.getByTestId("referential-link-input").locator("input").clear();
    await page
      .getByTestId("referential-link-input")
      .locator("input")
      .fill("https://www.google.com");
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(
      page
        .getByTestId("dossier-de-validation-template-upload")
        .getByText("Vous devez renseigner au moins un de ces deux champs"),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("dossier-de-validation-link")
        .getByText("Vous devez renseigner au moins un de ces deux champs"),
    ).toBeVisible();
  });

  test("submits the form and redirects to the certification page", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationAdditionalInfoHandlers({
        hasReducedRequirements: false,
      }),
      createUpdateAdditionalInfoMutationHandler(),
      ...certificateurSettingsCommonHandlers,
    );

    await openAdditionalInfoPage(page);

    await page
      .getByTestId("dossier-de-validation-template-upload")
      .locator('input[type="file"]')
      .setInputFiles({
        name: "test-file.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("test-file"),
      });
    await page.getByTestId("referential-link-input").locator("input").clear();
    await page
      .getByTestId("referential-link-input")
      .locator("input")
      .fill("https://www.google.com");

    const updateMutation = waitGraphQL(
      page,
      "updateCertificationAdditionalInfo",
    );
    await Promise.all([
      page.waitForURL(
        "/admin2/responsable-certifications/certifications/certification-id/",
      ),
      page.getByRole("button", { name: "Enregistrer" }).click(),
    ]);
    await updateMutation;
  });

  test("shows a preview when a pdf dossier de validation template is uploaded", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationAdditionalInfoHandlers({
        hasReducedRequirements: false,
      }),
      ...certificateurSettingsCommonHandlers,
    );

    await openAdditionalInfoPage(page);

    const templateUpload = page.getByTestId(
      "dossier-de-validation-template-upload",
    );
    await templateUpload.locator('input[type="file"]').setInputFiles({
      name: "trame.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("test-file"),
    });

    await expect(templateUpload.locator("iframe")).toBeVisible();
  });

  test("accepts an odt dossier de validation template without preview and submits the form", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationAdditionalInfoHandlers({
        hasReducedRequirements: false,
      }),
      createUpdateAdditionalInfoMutationHandler(),
      ...certificateurSettingsCommonHandlers,
    );

    await openAdditionalInfoPage(page);

    const templateUpload = page.getByTestId(
      "dossier-de-validation-template-upload",
    );
    const templateInput = templateUpload.locator('input[type="file"]');
    await expect(templateInput).toHaveAttribute("accept", /\.odt/);
    await expect(templateUpload).toContainText(
      "Formats supportés : jpg, png, pdf, odt",
    );

    await templateInput.setInputFiles({
      name: "trame.odt",
      mimeType: "application/vnd.oasis.opendocument.text",
      buffer: Buffer.from("test-file"),
    });

    await expect(templateUpload.locator("iframe")).toHaveCount(0);

    const updateMutation = waitGraphQL(
      page,
      "updateCertificationAdditionalInfo",
    );
    await Promise.all([
      page.waitForURL(
        "/admin2/responsable-certifications/certifications/certification-id/",
      ),
      page.getByRole("button", { name: "Enregistrer" }).click(),
    ]);
    await updateMutation;
  });
});
