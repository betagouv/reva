import { format } from "date-fns";

import { FancyPreview } from "@/components/fancy-preview/FancyPreview";

import { DossierDeValidationType } from "../types";

interface Props {
  dossierDeValidation: DossierDeValidationType;
}

export const DossierDeValidationCard = (props: Props) => {
  const {
    dossierDeValidation: {
      sentAt,
      file,
      otherFiles,
      decision,
      decisionSentAt,
      decisionComment,
    },
  } = props;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2">
        <p className="m-0">
          Dossier déposé le :
          <br />
          <strong>{format(sentAt, "dd/MM/yyyy")}</strong>
        </p>

        {decision == "INCOMPLETE" && decisionSentAt && (
          <p className="m-0">
            Dossier signalé le :
            <br />
            <strong>{format(sentAt, "dd/MM/yyyy")}</strong>
          </p>
        )}

        {decision == "COMPLETE" && decisionSentAt && (
          <p className="m-0">
            Dossier vérifié le :
            <br />
            <strong>{format(sentAt, "dd/MM/yyyy")}</strong>
          </p>
        )}
      </div>

      {decision == "INCOMPLETE" && decisionSentAt && (
        <p className="m-0">
          Motif du signalement :
          <br />
          <strong>{decisionComment || "Non renseignée"}</strong>
        </p>
      )}
      <div>
        <p className="m-0">Contenu du dossier :</p>
        {file.previewUrl && (
          <FancyPreview
            key={file.url}
            defaultDisplay={false}
            name={file.name}
            src={file.previewUrl}
            title={file.name}
          />
        )}
        {otherFiles
          .filter((file) => !!file.previewUrl)
          .map((file) => (
            <FancyPreview
              key={file.url}
              defaultDisplay={false}
              name={file.name}
              src={file.previewUrl!}
              title={file.name}
            />
          ))}
      </div>
    </div>
  );
};
