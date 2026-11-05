import { expect, type Page } from "next/experimental/testmode/playwright/msw";

import { createCertificationEntity } from "@tests/helpers/entities/create-certification.entity";

import { createCertificationAuthorityEntity } from "./entities/create-certification-authority.entity";

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

export const certificationTabsVisibilityScenarios = [
  {
    name: "hasReducedRequirements=true",
    certificationLabel: "Certification du SUP",
    structureLabel: "Structure SUP",
    reducedRequirementsState: true,
    expectedTabVisibility: reducedCertificationTabVisibility,
  },
  {
    name: "hasReducedRequirements=false",
    certificationLabel: "Certification standard",
    structureLabel: "Structure classique",
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
];

export function createCertificationForReducedRequirementsScenario({
  certificationLabel,
  structureLabel,
  reducedRequirementsState,
  idPrefix,
}: {
  certificationLabel: string;
  structureLabel: string | null;
  reducedRequirementsState: ReducedRequirementsState;
  idPrefix: string;
}) {
  return createCertificationEntity({
    id: `${idPrefix}-${certificationLabel}`,
    label: certificationLabel,
    codeRncp: "RNCP9999",
    parcoursByCertificationAuthorities: reducedRequirementsState
      ? [
          {
            certificationAuthority: createCertificationAuthorityEntity({
              label: "Certification Authority",
              websiteUrl: "https://www.certification-authority.com",
            }),
            parcours: [
              {
                id: "parcours-1",
                label: "Parcours 1",
                nomEtablissement: "Etablissement 1",
                uai: "uai-1",
              },
            ],
          },
          {
            certificationAuthority: createCertificationAuthorityEntity({
              id: "cert-authority-without-parcours",
              label: "Certification Authority Without Parcours",
              websiteUrl: "https://www.without-parcours.com",
            }),
            parcours: [],
          },
        ]
      : [],
    certificationAuthorityStructure:
      structureLabel === null
        ? null
        : {
            id: "structure-1",
            label: structureLabel,
            hasReducedRequirements: reducedRequirementsState ?? false,
            certificationAuthorities: [],
            certifications: [],
            cgu: { isLatestVersion: true },
            cguAcceptanceRequired: false,
          },
  });
}

export async function assertCertificationTabVisibility(
  page: Page,
  expectedTabVisibility: CertificationTabVisibility,
) {
  for (const tabLabel of certificationTabLabels) {
    await expect(page.getByRole("tab", { name: tabLabel })).toHaveCount(
      expectedTabVisibility[tabLabel] ? 1 : 0,
    );
  }
}
