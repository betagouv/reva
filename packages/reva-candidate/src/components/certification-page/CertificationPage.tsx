import { Tabs } from "@codegouvfr/react-dsfr/Tabs";
import { Tag } from "@codegouvfr/react-dsfr/Tag";
import { Tile } from "@codegouvfr/react-dsfr/Tile";

import { PICTOGRAMS } from "@/components/pictograms/Pictograms";

import { CertificationJuryTypeOfModality } from "@/graphql/generated/graphql";

import { BlocsDeCompetenceTab } from "./tabs/BlocsDeCompetenceTab";
import DocumentationTab from "./tabs/DocumentationTab";
import { JuryTab } from "./tabs/JuryTab";
import { MetierTab } from "./tabs/MetierTab";
import { ParcoursTab } from "./tabs/ParcoursTab";
import { PreRequisitesTab } from "./tabs/PrerequisitesTab";
import { UsefulResources } from "./useful-resources/UserfulResources";

export const CertificationPage = async ({
  certification,
}: {
  certification: {
    id: string;
    label: string;
    codeRncp: string;
    typeDiplome?: string | null;
    level: number;
    rncpExpiresAt: number;
    rncpObjectifsContexte?: string | null;
    prerequisites: { id: string; label: string }[];
    juryTypeMiseEnSituationProfessionnelle?: CertificationJuryTypeOfModality | null;
    juryTypeSoutenanceOrale?: CertificationJuryTypeOfModality | null;
    juryEstimatedCost?: number | null;
    juryPlace?: string | null;
    additionalInfo?: {
      dossierDeValidationLink?: string | null;
      dossierDeValidationTemplate?: {
        url: string;
        name: string;
        mimeType: string;
      } | null;
      linkToReferential?: string | null;
      linkToJuryGuide?: string | null;
      linkToCorrespondenceTable?: string | null;
      additionalDocuments?:
        | {
            url: string;
            name: string;
            mimeType: string;
          }[]
        | null;
      certificationExpertContactDetails?: string | null;
      certificationExpertContactPhone?: string | null;
      certificationExpertContactEmail?: string | null;
      usefulResources?: string | null;
      commentsForAAP?: string | null;
    } | null;
    competenceBlocs: {
      id: string;
      code?: string | null;
      label: string;
      competences: {
        id: string;
        label: string;
      }[];
    }[];
    parcours?: {
      info?: {
        totalRows: number;
      } | null;
    } | null;
    parcoursByCertificationAuthorities?:
      | {
          certificationAuthority: {
            label: string;
            websiteUrl?: string | null;
          };
          parcours: {
            id: string;
            label: string;
          }[];
        }[]
      | null;
    certificationAuthorityStructure?: {
      label: string;
      hasReducedRequirements: boolean;
    } | null;
  };
}) => {
  const hasReducedRequirements =
    certification.certificationAuthorityStructure?.hasReducedRequirements ??
    false;

  const tabs = [
    {
      label: "Métier",
      isDefault: true,
      content: (
        <MetierTab
          codeRncp={certification.codeRncp}
          rncpObjectifsContexte={certification.rncpObjectifsContexte}
        />
      ),
    },
    {
      label: "Blocs de compétences",
      content: (
        <BlocsDeCompetenceTab competenceBlocs={certification.competenceBlocs} />
      ),
    },
    ...(hasReducedRequirements
      ? [
          {
            label: "Établissements",
            content: (
              <ParcoursTab
                certificationHasParcours={
                  (certification.parcours?.info?.totalRows ?? 0) > 0
                }
                parcoursByCertificationAuthorities={
                  certification.parcoursByCertificationAuthorities
                }
              />
            ),
          },
        ]
      : [
          {
            label: "Prérequis",
            content: (
              <PreRequisitesTab prerequisites={certification.prerequisites} />
            ),
          },
          {
            label: "Jury",
            content: (
              <JuryTab
                juryTypeMiseEnSituationProfessionnelle={
                  certification.juryTypeMiseEnSituationProfessionnelle
                }
                juryTypeSoutenanceOrale={certification.juryTypeSoutenanceOrale}
                juryEstimatedCost={certification.juryEstimatedCost}
                juryPlace={certification.juryPlace}
              />
            ),
          },
          {
            label: "Documentation",
            content: (
              <DocumentationTab additionalInfo={certification.additionalInfo} />
            ),
          },
        ]),
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="mt-4 mb-0">{certification?.label}</h1>
        <p className="mb-0 text-xl">
          {certification?.certificationAuthorityStructure?.label}
        </p>
        <Tag className="mt-4">{`RNCP ${certification?.codeRncp}`}</Tag>
        <div className="flex flex-col md:flex-row gap-6 mt-8">
          <Tile
            title={`Niveau ${certification.level}`}
            desc={
              certification.typeDiplome ? (
                <span className="block w-[180px] truncate">
                  {certification.typeDiplome}
                </span>
              ) : undefined
            }
            classes={{ content: "p-0" }}
            className="min-w-[282px] h-auto"
            small
            orientation="horizontal"
            imageSvg
            imageUrl="/candidat/images/pictograms/information.svg"
            imageAlt="icône information"
          />
          <Tile
            title="Date d'expiration"
            desc={new Date(certification.rncpExpiresAt).toLocaleDateString(
              "fr-FR",
            )}
            classes={{ content: "p-0" }}
            className="min-w-[282px] h-auto"
            small
            orientation="horizontal"
            pictogram={PICTOGRAMS.calendar}
          />
        </div>
      </div>
      <Tabs className="mt-12" tabs={tabs} />
      <hr className="mt-12 mb-8 pb-1" />
      <UsefulResources />
    </>
  );
};
