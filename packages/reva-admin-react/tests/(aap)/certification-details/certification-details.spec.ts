import {
  expect,
  graphql,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../shared/helpers/auth/login";
import { getAAPCommonHandlers } from "../../shared/helpers/common-handlers/aap/getAapCommon.handlers";
import { graphQLResolver } from "../../shared/helpers/network/msw";

const fvae = graphql.link("https://reva-api/api/graphql");
const { aapCommonHandlers } = getAAPCommonHandlers();

const CERTIFICATION_ID = "certification-id";
const CERTIFICATION_PATH = `/admin2/certification-details/${CERTIFICATION_ID}/`;

type ReducedRequirementsState = true | false | null;

function createCertificationDetailsHandlers({
  certificationLabel,
  reducedRequirementsState,
}: {
  certificationLabel: string;
  reducedRequirementsState: ReducedRequirementsState;
}) {
  return [
    fvae.query(
      "getCertificationForCertificationDetailsPage",
      graphQLResolver({
        getCertification: {
          id: CERTIFICATION_ID,
          label: certificationLabel,
          codeRncp: "RNCP12345",
          status: "A_VALIDER_PAR_CERTIFICATEUR",
          rncpExpiresAt: 1751328000000,
          rncpPublishedAt: 1719705600000,
          rncpEffectiveAt: 1719705600000,
          rncpDeliveryDeadline: 1751328000000,
          availableAt: 1719705600000,
          typeDiplome: "BTS",
          juryTypeMiseEnSituationProfessionnelle: "PRESENTIEL",
          juryTypeSoutenanceOrale: "LES_DEUX",
          juryFrequency: "MONTHLY",
          juryFrequencyOther: null,
          juryPlace: "Paris",
          juryEstimatedCost: 200,
          certificationAuthorityStructure:
            reducedRequirementsState === null
              ? null
              : {
                  hasReducedRequirements: reducedRequirementsState,
                },
          parcoursByCertificationAuthorities:
            reducedRequirementsState === true
              ? [
                  {
                    certificationAuthority: {
                      id: "certification-authority-id",
                      label: "Certification Authority",
                      websiteUrl: "https://www.certification-authority.com",
                    },
                    parcours: [
                      {
                        id: "parcours-id",
                        label: "Parcours 1",
                      },
                    ],
                  },
                  {
                    certificationAuthority: {
                      id: "certification-authority-without-parcours-id",
                      label: "Certification Authority Without Parcours",
                      websiteUrl: "https://www.without-parcours.com",
                    },
                    parcours: [],
                  },
                ]
              : [],
          additionalInfo: null,
          degree: {
            id: "degree-id",
            level: 5,
          },
          domains: [],
          competenceBlocs: [],
          prerequisites: [{ id: "prereq-1", label: "A prerequisite" }],
        },
      }),
    ),
  ];
}

const reducedRequirementsScenarios = [
  {
    name: "reduced requirements enabled",
    certificationLabel: "Certification SUP",
    reducedRequirementsState: true,
    shouldShowJurySection: false,
    shouldShowPrerequisitesCard: false,
    shouldShowDocumentationCard: false,
    shouldShowParcoursCard: true,
  },
  {
    name: "reduced requirements disabled",
    certificationLabel: "Certification standard",
    reducedRequirementsState: false,
    shouldShowJurySection: true,
    shouldShowPrerequisitesCard: true,
    shouldShowDocumentationCard: true,
    shouldShowParcoursCard: false,
  },
  {
    name: "certificationAuthorityStructure=null",
    certificationLabel: "Certification sans structure",
    reducedRequirementsState: null,
    shouldShowJurySection: true,
    shouldShowPrerequisitesCard: true,
    shouldShowDocumentationCard: true,
    shouldShowParcoursCard: false,
  },
] as const;

test.describe("certification details page", () => {
  reducedRequirementsScenarios.forEach(
    ({
      name,
      certificationLabel,
      reducedRequirementsState,
      shouldShowJurySection,
      shouldShowPrerequisitesCard,
      shouldShowDocumentationCard,
      shouldShowParcoursCard,
    }) => {
      test(`shows the expected sections when ${name}`, async ({
        page,
        msw,
      }) => {
        msw.use(
          ...createCertificationDetailsHandlers({
            certificationLabel,
            reducedRequirementsState,
          }),
          ...aapCommonHandlers,
        );

        await login({ role: "aap", page });
        await page.goto(CERTIFICATION_PATH);

        await expect(
          page.getByRole("heading", {
            name: `RNCP RNCP12345 - ${certificationLabel}`,
            level: 1,
          }),
        ).toBeVisible();
        await expect(
          page.getByTestId("certification-description-card"),
        ).toBeVisible();
        await expect(page.getByRole("heading", { name: "Jury" })).toHaveCount(
          shouldShowJurySection ? 1 : 0,
        );
        await expect(
          page.getByTestId("prerequisites-summary-card"),
        ).toHaveCount(shouldShowPrerequisitesCard ? 1 : 0);
        await expect(
          page.getByTestId("additional-info-summary-card"),
        ).toHaveCount(shouldShowDocumentationCard ? 1 : 0);
        await expect(page.getByTestId("parcours-card")).toHaveCount(
          shouldShowParcoursCard ? 1 : 0,
        );
      });
    },
  );
  test("show correct parcours card and info when reduced requirements are enabled", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...createCertificationDetailsHandlers({
        certificationLabel: "Certification SUP",
        reducedRequirementsState: true,
      }),
      ...aapCommonHandlers,
    );
    await login({ role: "aap", page });
    await page.goto(CERTIFICATION_PATH);
    const parcoursCard = page.getByTestId("parcours-card");
    await expect(parcoursCard).toBeVisible();
    await expect(
      parcoursCard.getByText("Certification Authority"),
    ).toBeVisible();
    await expect(
      parcoursCard.getByRole("link", { name: "Certification Authority" }),
    ).toHaveAttribute("href", "https://www.certification-authority.com");
    await expect(parcoursCard.getByText("Parcours 1")).toBeVisible();
    await expect(
      parcoursCard.getByText("Certification Authority Without Parcours"),
    ).toHaveCount(0);
  });
});
