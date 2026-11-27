import Link from "next/link";

import { EnhancedSectionCard } from "@/components/card/enhanced-section-card/EnhancedSectionCard";
import {
  FancyPreview,
  isPreviewableMimeType,
} from "@/components/fancy-preview/FancyPreview";
import { SmallNotice } from "@/components/small-notice/SmallNotice";

export const CertificationAdditionalInfoSummaryCard = ({
  isAdmin,
  isEditable,
  updateButtonHref,
  certificationAdditionalInfo,
}: {
  isAdmin?: boolean;
  isEditable?: boolean;
  updateButtonHref?: string;
  certificationAdditionalInfo?: {
    linkToReferential: string;
    linkToCorrespondenceTable?: string | null;
    linkToJuryGuide?: string | null;
    certificationExpertContactDetails?: string | null;
    certificationExpertContactPhone?: string | null;
    certificationExpertContactEmail?: string | null;
    usefulResources?: string | null;
    commentsForAAP?: string | null;
    dossierDeValidationTemplate?: {
      name: string;
      previewUrl?: string | null;
      mimeType: string;
    } | null;
    dossierDeValidationLink?: string | null;
    additionalDocuments: {
      name: string;
      previewUrl?: string | null;
    }[];
  } | null;
}) => (
  <EnhancedSectionCard
    data-testid="additional-info-summary-card"
    isEditable={isAdmin ? false : isEditable}
    title="Documentation"
    titleIconClass="fr-icon-info-fill"
    status={certificationAdditionalInfo ? "COMPLETED" : "TO_COMPLETE"}
    buttonOnClickHref={updateButtonHref}
  >
    {certificationAdditionalInfo ? (
      <div
        className="flex flex-col gap-4"
        data-testid="additional-info-content"
      >
        <section className="flex flex-col gap-4">
          <section className="flex flex-col gap-4">
            <h3 className="mb-0">Documents essentiels :</h3>
            {certificationAdditionalInfo.dossierDeValidationTemplate
              ?.previewUrl && (
              <DossierDeValidationTemplate
                name={
                  certificationAdditionalInfo.dossierDeValidationTemplate.name
                }
                previewUrl={
                  certificationAdditionalInfo.dossierDeValidationTemplate
                    .previewUrl
                }
                mimeType={
                  certificationAdditionalInfo.dossierDeValidationTemplate
                    .mimeType
                }
              />
            )}
            {certificationAdditionalInfo.dossierDeValidationLink && (
              <Link
                href={certificationAdditionalInfo.dossierDeValidationLink}
                className="fr-link mr-auto"
                target="_blank"
              >
                Trame du dossier de validation
              </Link>
            )}
          </section>
          {certificationAdditionalInfo.linkToReferential && (
            <Link
              href={certificationAdditionalInfo.linkToReferential}
              className="fr-link mr-auto"
              target="_blank"
            >
              Référentiels d’activités
            </Link>
          )}
          {certificationAdditionalInfo.linkToJuryGuide && (
            <Link
              href={certificationAdditionalInfo.linkToJuryGuide}
              className="fr-link mr-auto"
              target="_blank"
            >
              Référentiel d’évaluation
            </Link>
          )}
          {certificationAdditionalInfo.linkToCorrespondenceTable && (
            <Link
              href={certificationAdditionalInfo.linkToCorrespondenceTable}
              className="fr-link mr-auto"
              target="_blank"
            >
              Tableau des correspondances et dispense de blocs
            </Link>
          )}
        </section>
        <section className="flex flex-col gap-4">
          <h3 className="mb-0">Documents complémentaires :</h3>
          {certificationAdditionalInfo.additionalDocuments.map(
            (document) =>
              document.previewUrl && (
                <FancyPreview
                  key={document.name}
                  src={document.previewUrl}
                  title={document.name}
                  name={document.name}
                  defaultDisplay={false}
                />
              ),
          )}
        </section>
        <section className="flex flex-col gap-4">
          <h3 className="mb-0">Informations complémentaires :</h3>
          <div>
            {certificationAdditionalInfo.certificationExpertContactDetails && (
              <p className="mb-2 font-bold">
                {certificationAdditionalInfo.certificationExpertContactDetails}
              </p>
            )}
            <div className="flex flex-row gap-4">
              {certificationAdditionalInfo.certificationExpertContactPhone && (
                <p className="mb-0">
                  {certificationAdditionalInfo.certificationExpertContactPhone}
                </p>
              )}
              {certificationAdditionalInfo.certificationExpertContactEmail && (
                <p className="mb-2">
                  {certificationAdditionalInfo.certificationExpertContactEmail}
                </p>
              )}
            </div>
            {certificationAdditionalInfo.usefulResources && (
              <p className="mb-0">
                {certificationAdditionalInfo.usefulResources}
              </p>
            )}
            {certificationAdditionalInfo.commentsForAAP && (
              <p className="mb-0">
                {certificationAdditionalInfo.commentsForAAP}
              </p>
            )}
          </div>
        </section>
      </div>
    ) : !isAdmin ? (
      <SmallNotice className="mt-1" data-testid="no-additional-info-message">
        Transmettez aux AAP et aux candidats des ressources qui faciliteront le
        déroulé de l’accompagnement et du parcours VAE.
      </SmallNotice>
    ) : null}
  </EnhancedSectionCard>
);

const DossierDeValidationTemplate = ({
  name,
  previewUrl,
  mimeType,
}: {
  name: string;
  previewUrl: string;
  mimeType: string;
}) =>
  isPreviewableMimeType(mimeType) ? (
    <FancyPreview
      src={previewUrl}
      title="Trame du dossier de validation"
      name={name}
      defaultDisplay={false}
    />
  ) : (
    <a
      data-testid="dossier-de-validation-template-download-link"
      className="fr-link fr-link--download mr-auto"
      href={previewUrl}
      download={name}
    >
      Trame du dossier de validation
      <span className="fr-link__detail">{name}</span>
    </a>
  );
