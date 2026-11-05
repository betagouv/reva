import Accordion from "@codegouvfr/react-dsfr/Accordion";
import Badge from "@codegouvfr/react-dsfr/Badge";

import {
  CertificationCompetence,
  CertificationCompetenceDetails,
  DffCertificationCompetenceDetailsState,
} from "@/graphql/generated/types";

const getStateFromCompetence = ({
  competence,
  competenceDetails,
}: {
  competence: CertificationCompetence;
  competenceDetails: CertificationCompetenceDetails[];
}): DffCertificationCompetenceDetailsState | "TO_COMPLETE" => {
  return (
    competenceDetails.find(
      (detail) => detail.certificationCompetence.id === competence.id,
    )?.state || "TO_COMPLETE"
  );
};

const BadgeState = ({
  state,
}: {
  state: DffCertificationCompetenceDetailsState;
}) => {
  if (state === "YES") {
    return (
      <Badge noIcon severity="success" small>
        Oui
      </Badge>
    );
  }
  if (state === "NO") {
    return (
      <Badge severity="error" noIcon small>
        Non
      </Badge>
    );
  }
  if (state === "PARTIALLY") {
    return (
      <Badge severity="new" noIcon small>
        Partiellement
      </Badge>
    );
  }

  return null;
};

const CertificationCompetenceRow = ({ label }: { label: string }) => (
  <div
    className={`w-full px-4 py-3 font-medium border-b-[1px] border-neutral-200 mb-[-1px]`}
  >
    {label}
  </div>
);

export const CertificationCompetenceAccordion = ({
  competenceBloc,
  competenceBlocText,
  competenceDetails,
  defaultExpanded = false,
  hideAccordionContent = false,
}: {
  competenceBloc: {
    id: string;
    label: string;
    code?: string | null;
    competences: {
      id: string;
      label: string;
    }[];
  };
  competenceBlocText?: string | null;
  competenceDetails: CertificationCompetenceDetails[];
  defaultExpanded?: boolean;
  hideAccordionContent?: boolean;
}) => {
  const label = competenceBloc.code
    ? `${competenceBloc.code} - ${competenceBloc.label}`
    : competenceBloc.label;

  if (hideAccordionContent) {
    return <CertificationCompetenceRow label={label} />;
  }

  return (
    <Accordion
      className="w-full"
      label={label}
      defaultExpanded={defaultExpanded}
    >
      {competenceBloc.competences.map((competence) => (
        <div key={competence.id}>
          <BadgeState
            state={
              getStateFromCompetence({
                competence,
                competenceDetails,
              }) as DffCertificationCompetenceDetailsState
            }
          />
          <p>
            <span className="font-bold">{competence.label}</span>
          </p>
        </div>
      ))}
      {!!competenceBlocText && <p>{competenceBlocText}</p>}
    </Accordion>
  );
};
