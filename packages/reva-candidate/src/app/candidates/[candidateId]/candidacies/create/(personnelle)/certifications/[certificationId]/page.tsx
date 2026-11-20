import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";

import { CertificationPage } from "@/components/certification-page/CertificationPage";
import { getSsrGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { Panel } from "@/components/layout/Panel";

import { graphql } from "@/graphql/generated";

import { CertificationFooterComponent } from "./_components/Footer.component";

const GET_CERTIFICATION = graphql(`
  query getCertificationById($certificationId: ID!) {
    getCertification(certificationId: $certificationId) {
      id
      prerequisites {
        id
        label
      }
      juryPlace
      juryEstimatedCost
      juryTypeSoutenanceOrale
      juryTypeMiseEnSituationProfessionnelle
      rncpObjectifsContexte
      level
      typeDiplome
      rncpExpiresAt
      id
      label
      codeRncp
      additionalInfo {
        dossierDeValidationLink
        dossierDeValidationTemplate {
          url
          name
          mimeType
        }
        linkToReferential
        linkToJuryGuide
        linkToCorrespondenceTable
        additionalDocuments {
          url
          name
          mimeType
        }
        certificationExpertContactDetails
        certificationExpertContactPhone
        certificationExpertContactEmail
        usefulResources
        commentsForAAP
      }
      competenceBlocs {
        id
        code
        label
        competences {
          id
          label
        }
      }
      parcours {
        info {
          totalRows
        }
      }
      parcoursByCertificationAuthorities {
        certificationAuthority {
          label
          websiteUrl
        }
        parcours {
          id
          label
        }
      }
      certificationAuthorityStructure {
        label
        hasReducedRequirements
      }
    }
  }
`);

export default async function CertificationDetailsPage({
  params,
}: {
  params: Promise<{ certificationId: string }>;
}) {
  const { graphqlClient } = getSsrGraphQlClient();
  const { certificationId } = await params;

  const data = await graphqlClient.request(GET_CERTIFICATION, {
    certificationId,
  });
  const certification = data?.getCertification;

  if (!certification) {
    return null;
  }

  const certificationLabel = `RNCP ${certification.codeRncp} : ${certification.label}`;

  return (
    <Panel>
      <Breadcrumb
        currentPageLabel={certificationLabel}
        className="mb-4"
        segments={[
          {
            label: "Mes candidatures",
            linkProps: {
              href: "../../../",
            },
          },
          {
            label: "Créer une candidature",
            linkProps: {
              href: "../../",
            },
          },
          {
            label: "Choix du diplôme",
            linkProps: {
              href: "../",
            },
          },
        ]}
      />
      <CertificationPage certification={certification} />
      <CertificationFooterComponent />
    </Panel>
  );
}
