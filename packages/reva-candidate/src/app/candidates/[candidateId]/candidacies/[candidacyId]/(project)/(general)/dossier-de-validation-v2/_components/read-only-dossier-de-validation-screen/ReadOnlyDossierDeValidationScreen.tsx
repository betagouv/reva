import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { format } from "date-fns";

import { FancyPreview } from "@/components/fancy-preview/FancyPreview";

import { ReadOnlyDvResourcesSection } from "./ReadOnlyDvResourcesSection";

interface FilePreview {
  name: string;
  previewUrl?: string | null;
}

export const ReadOnlyDossierDeValidationScreen = ({
  dossierDeValidationSentAt,
  dossierDeValidationFile,
  dossierDeValidationOtherFiles,
  amenagementSpecifique,
}: {
  dossierDeValidationSentAt?: Date;
  dossierDeValidationFile?: FilePreview;
  dossierDeValidationOtherFiles: FilePreview[];
  amenagementSpecifique?: {
    justificationFile?: FilePreview | null;
    justificationDescription?: string;
  } | null;
}) => {
  return (
    <div className="flex gap-6">
      <main className="flex-1">
        <Alert
          data-testid="dossier-de-validation-sent-alert"
          small
          title=""
          description={`Dossier de validation envoyé au certificateur le ${dossierDeValidationSentAt ? format(dossierDeValidationSentAt, "dd/MM/yyyy") : ""}`}
          severity="success"
        />

        <p className="font-normal py-2 px-4 border-b mt-6 mb-0">
          Contenu du dossier :
        </p>
        {dossierDeValidationFile && (
          <FancyPreview
            defaultDisplay={false}
            title={dossierDeValidationFile.name}
            name={dossierDeValidationFile?.name}
            src={dossierDeValidationFile.previewUrl || ""}
          />
        )}
        {dossierDeValidationOtherFiles.map((of) => (
          <FancyPreview
            key={of.previewUrl}
            defaultDisplay={false}
            title={of.name}
            name={of?.name}
            src={of.previewUrl || ""}
          />
        ))}
        {amenagementSpecifique?.justificationDescription && (
          <>
            <div className="font-normal px-4 border-b mt-6 mb-0">
              <p className="mb-2">
                Demande d’aménagement pour le passage devant le jury :
              </p>
            </div>
            <div className="font-normal px-4 border-b mt-4 mb-2 flex flex-row gap-2">
              <p className="mb-4 basis-1/5">Description :</p>
              <p className="mb-2 font-bold">
                {amenagementSpecifique.justificationDescription}
              </p>
            </div>
          </>
        )}
        {amenagementSpecifique?.justificationFile && (
          <FancyPreview
            defaultDisplay={false}
            title="Justificatif"
            name={amenagementSpecifique.justificationFile.name}
            src={amenagementSpecifique.justificationFile.previewUrl || ""}
          />
        )}
      </main>

      <div className="basis-3/12">
        <ReadOnlyDvResourcesSection />
      </div>
    </div>
  );
};
