import Link from "next/link";

import { DownloadTile } from "@/components/download-tile/DownloadTile";

type AdditionalInfoProps = {
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
} | null;

const DocumentationTab = ({
  additionalInfo,
}: {
  additionalInfo?: AdditionalInfoProps;
}) => {
  return (
    <>
      <p className="mb-4">
        Vous trouverez ci-dessous l'ensemble des ressources qui vous seront
        utiles tout du long de votre parcours. Elles sont mises à disposition
        par le certificateur.
      </p>
      <div className="flex flex-col gap-4">
        <h2 className="text-xl my-0">Documents essentiels</h2>
        <div className="bg-dsfrBlue-200 p-4 flex flex-col gap-4">
          <p className="my-0">
            L’étape centrale de tout parcours VAE est la rédaction d’un dossier
            de validation. C’est un document rédigé par le candidat. Il permet
            au jury de VAE d’identifier les connaissances et compétences
            acquises, en lien avec celles exigées par les référentiels du
            diplôme visé.
          </p>
          {additionalInfo?.dossierDeValidationTemplate?.url && (
            <div className="max-w-96">
              <DownloadTile
                name="Trame du dossier de validation"
                url={additionalInfo?.dossierDeValidationTemplate?.url}
                mimeType={
                  additionalInfo?.dossierDeValidationTemplate?.mimeType || ""
                }
              />
            </div>
          )}

          <div>
            <b>Besoin d’aide ? Consultez notre article : </b>
            <Link
              className="fr-link"
              href="https://vae.gouv.fr/savoir-plus/articles/rediger-dossier-validation/"
              target="_blank"
            >
              Besoin d’aide ? Consultez notre article : Comment rédiger son
              dossier de validation ?
            </Link>
          </div>
        </div>
        {additionalInfo?.dossierDeValidationLink && (
          <Link
            href={additionalInfo?.dossierDeValidationLink}
            className="fr-link mr-auto"
            target="_blank"
          >
            Trame du dossier de validation
          </Link>
        )}
        {additionalInfo?.linkToReferential && (
          <span>
            <Link
              className="fr-link"
              target="_blank"
              href={additionalInfo?.linkToReferential}
            >
              Référentiels d’activités
            </Link>
          </span>
        )}
        {additionalInfo?.linkToJuryGuide && (
          <span>
            <Link
              className="fr-link"
              target="_blank"
              href={additionalInfo?.linkToJuryGuide}
            >
              Référentiel d'évaluation
            </Link>
          </span>
        )}
        {additionalInfo?.linkToCorrespondenceTable && (
          <span>
            <Link
              className="fr-link"
              target="_blank"
              href={additionalInfo?.linkToCorrespondenceTable}
            >
              Tableau des correspondances et dispenses de blocs
            </Link>
          </span>
        )}
      </div>
      {additionalInfo?.additionalDocuments?.length &&
      additionalInfo?.additionalDocuments?.length > 0 ? (
        <div className="flex flex-col gap-4 mt-6">
          <h2 className="text-xl my-0">Documents additionnels</h2>
          <div className="flex flex-row gap-4 flex-wrap">
            {additionalInfo?.additionalDocuments?.map((doc) => (
              <div
                key={doc.url}
                className="basis-full md:basis-[calc(33.33%-0.7rem)] grow"
              >
                <DownloadTile
                  name={
                    doc.name.length >= 63
                      ? doc.name.slice(0, 60).trim() + "..."
                      : doc.name
                  }
                  url={doc.url}
                  mimeType={doc.mimeType}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 mt-6">
        {additionalInfo?.certificationExpertContactDetails && (
          <>
            <h2 className="text-xl my-0">Informations complémentaires</h2>
            <div>
              <p className="mb-2">
                {additionalInfo?.certificationExpertContactDetails}
              </p>
              <p className="mb-0">
                {additionalInfo?.certificationExpertContactPhone}{" "}
                {additionalInfo?.certificationExpertContactEmail}
              </p>
            </div>
          </>
        )}
        {additionalInfo?.usefulResources && (
          <div>
            <p className="mb-0">
              Ressources complémentaires pour aider au parcours VAE :
            </p>
            <p className="mb-0">{additionalInfo?.usefulResources}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default DocumentationTab;
