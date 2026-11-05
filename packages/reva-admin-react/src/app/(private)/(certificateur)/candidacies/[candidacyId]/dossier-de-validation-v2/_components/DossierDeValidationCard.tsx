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
    <div className="flex flex-col gap-2">
      <hr className="pb-1.5 mt-2" />
      <InfoLine
        label="Dossier déposé le :"
        value={format(sentAt, "dd/MM/yyyy")}
      />

      {decision == "INCOMPLETE" && decisionSentAt && (
        <InfoLine
          label="Dossier signalé le :"
          value={format(sentAt, "dd/MM/yyyy")}
        />
      )}

      {decision == "COMPLETE" && decisionSentAt && (
        <InfoLine
          label="Dossier vérifié le :"
          value={format(sentAt, "dd/MM/yyyy")}
        />
      )}

      {decision == "INCOMPLETE" && decisionSentAt && (
        <InfoLine
          label="Motif du signalement :"
          value={decisionComment || "Non renseignée"}
        />
      )}
      <div className="mt-6">
        <InfoLine label="Contenu du dossier :" value="" />
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

const InfoLine = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <div className="flex flex-col md:flex-row justify-between">
      <p className="m-0 ml-4">{label}</p>
      <span className="ml-auto mr-4">
        <strong>{value}</strong>
      </span>
    </div>
    <hr className="pb-1.5 mt-2" />
  </div>
);
