import Accordion from "@codegouvfr/react-dsfr/Accordion";
import { format, toDate } from "date-fns";

import { FancyPreview } from "@/components/fancy-preview/FancyPreview";

interface PreviousDossierAccordionProps {
  dossierDeValidation: {
    dossierDeValidationSentAt?: number | null;
    dossierDeValidationFile?: {
      name: string;
      previewUrl?: string | null;
    } | null;
    dossierDeValidationOtherFiles: {
      name: string;
      previewUrl?: string | null;
    }[];
  };
  juryDateOfResult?: number | null;
}

export const PreviousDossierAccordion = ({
  dossierDeValidation,
  juryDateOfResult,
}: PreviousDossierAccordionProps) => {
  return (
    <div className="fr-accordions-group mb-6">
      <Accordion label="Voir le dernier dossier soutenu devant le jury">
        <div className="flex flex-col">
          <p className="fr-text--lead text-gray-900 font-semibold mt-1 mb-3">
            Dossier déposé{" "}
            {dossierDeValidation.dossierDeValidationSentAt
              ? `le ${format(
                  toDate(dossierDeValidation.dossierDeValidationSentAt),
                  "dd/MM/yyyy",
                )}`
              : ""}
          </p>
          <div className="flex justify-between items-baseline py-2 px-4 border-t border-b mb-6">
            <span className="font-normal">Soutenu devant le jury le :</span>
            <span className="font-medium">
              {juryDateOfResult
                ? format(toDate(juryDateOfResult), "dd/MM/yyyy")
                : "Date non disponible"}
            </span>
          </div>
          <p className="font-normal py-2 px-4 border-b mb-0">
            Contenu du dossier :
          </p>
          {dossierDeValidation.dossierDeValidationFile && (
            <FancyPreview
              defaultDisplay={false}
              title={dossierDeValidation.dossierDeValidationFile.name}
              name={dossierDeValidation.dossierDeValidationFile.name}
              src={dossierDeValidation.dossierDeValidationFile.previewUrl || ""}
            />
          )}
          {dossierDeValidation.dossierDeValidationOtherFiles?.map((file) => (
            <FancyPreview
              key={file.name}
              defaultDisplay={false}
              title={file.name}
              name={file.name}
              src={file.previewUrl || ""}
            />
          ))}
        </div>
      </Accordion>
    </div>
  );
};
