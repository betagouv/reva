import request from "graphql-request";
import Image from "next/image";

import { MainLayout } from "@/app/_components/layout/main-layout/MainLayout";
import { GRAPHQL_API_URL } from "@/config/config";

import { graphql } from "@/graphql/generated";

import { CertificationPageContent } from "./_components/certification-page-content/CertificationPageContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ certificationId: string }>;
}) {
  const { certificationId } = await params;
  const certification = await getCertificationById(certificationId);
  return {
    title: `France VAE | ${certification.label}`,
    description: `Code RNCP ${certification.codeRncp} - ${certification.label}`,
  };
}

export default async function CertificationPage({
  params,
}: {
  params: Promise<{
    certificationId: string;
  }>;
}) {
  const certificationId = (await params).certificationId;
  if (!certificationId) {
    return null;
  }

  const certification = await getCertificationById(certificationId);

  if (!certification) {
    return null;
  }

  return (
    <MainLayout className="relative">
      <div className="absolute -top-8 -z-10 w-full">
        <div className="hidden lg:block">
          <Image
            src="/candidate-space/unions-background/union-background1.svg"
            width={3000}
            height={1074}
            style={{ width: "100%", height: "auto" }}
            alt="rayon rose en fond d'écran"
          />
        </div>
      </div>
      <CertificationPageContent certification={certification} />
    </MainLayout>
  );
}

const getCertificationQuery = graphql(`
  query getCertificationForCertificationPage($certificationId: ID!) {
    getCertification(certificationId: $certificationId) {
      id
      codeRncp
      label
      isAapAvailable
      level
      typeDiplome
      rncpExpiresAt
      rncpObjectifsContexte
      certificationAuthorityStructure {
        label
        hasReducedRequirements
      }
      prerequisites {
        id
        label
      }
      juryTypeMiseEnSituationProfessionnelle
      juryTypeSoutenanceOrale
      juryEstimatedCost
      juryPlace
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
    }
  }
`);

const getCertificationById = async (certificationId: string) => {
  return (
    await request(GRAPHQL_API_URL, getCertificationQuery, {
      certificationId,
    })
  ).getCertification;
};
