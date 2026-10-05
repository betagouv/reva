import { Card } from "@codegouvfr/react-dsfr/Card";
import { Tag } from "@codegouvfr/react-dsfr/Tag";
import { format, isAfter, toDate } from "date-fns";

import {
  CandidacyStatusStep,
  EndAccompagnementStatus,
  FeasibilityDecision,
  JuryResult,
  OrganismModaliteAccompagnement,
  TypeAccompagnement,
} from "@/graphql/generated/graphql";

type Feasibility = {
  dematerializedFeasibilityFile?: {
    sentToCandidateAt?: number | null;
    candidateConfirmationAt?: number | null;
    swornStatementFileId?: string | null;
  } | null;
  decision: FeasibilityDecision;
  decisionSentAt?: number | null;
  feasibilityFileSentAt?: number | null;
} | null;

type CandidacyCardProps = {
  isMiddleNamesEnabled: boolean;
  candidacy: {
    id: string;
    typeAccompagnement: TypeAccompagnement;
    endAccompagnementStatus?: EndAccompagnementStatus | null;
    endAccompagnementDate?: number | null;
    status: CandidacyStatusStep;
    readyForJuryEstimatedAt?: number | null;
    candidate?: {
      firstname: string;
      lastname: string;
      givenName?: string | null;
      firstname2?: string | null;
      firstname3?: string | null;
      middleNames?: string | null;
      department?: { code: string; label: string } | null;
    } | null;
    feasibility?: Feasibility;
    activeDossierDeValidation?: {
      dossierDeValidationSentAt?: number | null;
    } | null;
    jury?: {
      dateOfSession: number;
      result?: JuryResult | null;
    } | null;
    certification?: {
      label: string;
      codeRncp: string;
    } | null;
    organism?: {
      label: string;
      nomPublic?: string | null;
      modaliteAccompagnement: OrganismModaliteAccompagnement;
    } | null;
    candidacyDropOut?: { createdAt: number } | null;
    candidacyStatuses: { status: CandidacyStatusStep; createdAt: number }[];
  };
};

const formatTimestamp = (timestamp: number) =>
  format(toDate(timestamp), "dd/MM/yyyy");

const getStatusLabel = ({
  status,
  feasibility,
  readyForJuryEstimatedAt,
  jury,
}: {
  status: CandidacyStatusStep;
  feasibility?: Feasibility;
  readyForJuryEstimatedAt?: number | null;
  jury?: CandidacyCardProps["candidacy"]["jury"];
}) => {
  const isSentToCandidate =
    !!feasibility?.dematerializedFeasibilityFile?.sentToCandidateAt;
  const hasCandidateConfirmed =
    !!feasibility?.dematerializedFeasibilityFile?.candidateConfirmationAt;
  const hasSwornStatement =
    !!feasibility?.dematerializedFeasibilityFile?.swornStatementFileId;
  const isReadyForJuryEstimatedAtUpcoming =
    !!readyForJuryEstimatedAt &&
    isAfter(toDate(readyForJuryEstimatedAt), new Date());
  const isReadyForJuryEstimatedAtPast =
    !!readyForJuryEstimatedAt &&
    isAfter(new Date(), toDate(readyForJuryEstimatedAt));
  const isJuryUpcoming =
    !!jury && !jury.result && isAfter(toDate(jury.dateOfSession), new Date());
  const resultIsSuccess =
    jury?.result === "FULL_SUCCESS_OF_FULL_CERTIFICATION" ||
    jury?.result === "FULL_SUCCESS_OF_PARTIAL_CERTIFICATION";
  const resultIsPartialSuccess =
    jury?.result === "PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION" ||
    jury?.result === "PARTIAL_SUCCESS_PENDING_CONFIRMATION" ||
    jury?.result === "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION";
  const resultIsNotPresent =
    jury?.result === "CANDIDATE_ABSENT" || jury?.result === "CANDIDATE_EXCUSED";
  const resultIsFailure = jury?.result === "FAILURE";

  switch (true) {
    case status === "PROJET":
      return "En brouillon";
    case status === "VALIDATION":
      return "Nouvelle candidature";
    case status === "PRISE_EN_CHARGE":
      return "Candidature consultée";
    case status === "PARCOURS_ENVOYE":
      return "Parcours envoyé au candidat";
    case status === "PARCOURS_CONFIRME":
      return "Parcours validé par le candidat";
    case isSentToCandidate &&
      !hasCandidateConfirmed &&
      feasibility?.decision === "DRAFT":
      return "Dossier de faisabilité envoyé au candidat";
    case isSentToCandidate &&
      hasCandidateConfirmed &&
      !hasSwornStatement &&
      feasibility?.decision === "DRAFT":
      return "Dossier de faisabilité validé partiellement";
    case isSentToCandidate &&
      hasCandidateConfirmed &&
      hasSwornStatement &&
      feasibility?.decision === "DRAFT":
      return "Dossier de faisabilité validé totalement";
    case status === "DOSSIER_FAISABILITE_ENVOYE":
      return "Dossier de faisabilité envoyé au certificateur";
    case status === "DOSSIER_FAISABILITE_INCOMPLET":
      return "Dossier de faisabilité incomplet";
    case status === "DOSSIER_FAISABILITE_NON_RECEVABLE":
      return "Non recevable";
    case status === "DOSSIER_FAISABILITE_RECEVABLE" && !readyForJuryEstimatedAt:
      return "Recevable / en attente de la date prévisionnelle";
    case status === "DOSSIER_FAISABILITE_RECEVABLE" &&
      isReadyForJuryEstimatedAtUpcoming:
      return "Date prévisionnelle renseignée / en attente du dossier de validation";
    case status === "DOSSIER_FAISABILITE_RECEVABLE" &&
      isReadyForJuryEstimatedAtPast:
      return "Date prévisionnelle dépassée / en attente du dossier de validation";
    case status === "DOSSIER_DE_VALIDATION_ENVOYE" && !jury:
      return "Dossier de validation envoyé / en attente du jury";
    case status === "DOSSIER_DE_VALIDATION_SIGNALE":
      return "Dossier de validation signalé";
    case isJuryUpcoming:
      return "Jury programmé";
    case !!jury && !isJuryUpcoming && !jury.result:
      return "Jury passé / Attente du résultat";
    case resultIsPartialSuccess:
      return "Réussite partielle";
    case resultIsSuccess:
      return "Réussite totale";
    case resultIsNotPresent:
      return "Non présentation au jury";
    case resultIsFailure:
      return "Non validation";
    default:
      return null;
  }
};

const getDateToDisplay = ({
  candidacy,
}: {
  candidacy: CandidacyCardProps["candidacy"];
}) => {
  const validationStatus = candidacy.candidacyStatuses.find(
    (status) => status.status === "VALIDATION",
  );
  const parcoursEnvoyeStatus = candidacy.candidacyStatuses.find(
    (status) => status.status === "PARCOURS_ENVOYE",
  );
  const parcoursConfirmeStatus = candidacy.candidacyStatuses.find(
    (status) => status.status === "PARCOURS_CONFIRME",
  );

  if (
    candidacy.endAccompagnementDate &&
    (candidacy.endAccompagnementStatus === "CONFIRMED_BY_CANDIDATE" ||
      candidacy.endAccompagnementStatus === "CONFIRMED_BY_ADMIN")
  ) {
    return `Accompagnement terminé le ${formatTimestamp(candidacy.endAccompagnementDate)}`;
  }

  if (
    candidacy.jury?.dateOfSession &&
    isAfter(new Date(), toDate(candidacy.jury.dateOfSession))
  ) {
    return `Jury passé le ${formatTimestamp(candidacy.jury.dateOfSession)}`;
  }

  if (candidacy.jury?.dateOfSession) {
    return `Jury programmé le ${formatTimestamp(candidacy.jury.dateOfSession)}`;
  }

  if (candidacy.activeDossierDeValidation?.dossierDeValidationSentAt) {
    return `Dossier de validation déposé le ${formatTimestamp(candidacy.activeDossierDeValidation.dossierDeValidationSentAt)}`;
  }

  if (
    candidacy.feasibility?.decision === "ADMISSIBLE" &&
    candidacy.feasibility.decisionSentAt
  ) {
    return `Déclaré recevable le ${formatTimestamp(candidacy.feasibility.decisionSentAt)}`;
  }

  if (
    candidacy.feasibility?.decision === "REJECTED" &&
    candidacy.feasibility.decisionSentAt
  ) {
    return `Déclaré non recevable le ${formatTimestamp(candidacy.feasibility.decisionSentAt)}`;
  }

  if (candidacy.feasibility?.feasibilityFileSentAt) {
    return `Dossier de faisabilité déposé le ${formatTimestamp(candidacy.feasibility.feasibilityFileSentAt)}`;
  }

  if (
    candidacy.feasibility?.dematerializedFeasibilityFile
      ?.candidateConfirmationAt
  ) {
    return `Dossier de faisabilité validé par le candidat le ${formatTimestamp(
      candidacy.feasibility.dematerializedFeasibilityFile
        .candidateConfirmationAt,
    )}`;
  }

  if (candidacy.feasibility?.dematerializedFeasibilityFile?.sentToCandidateAt) {
    return `Dossier de faisabilité envoyé au candidat le ${formatTimestamp(candidacy.feasibility.dematerializedFeasibilityFile.sentToCandidateAt)}`;
  }

  if (parcoursConfirmeStatus) {
    return `Parcours confirmé le ${formatTimestamp(parcoursConfirmeStatus.createdAt)}`;
  }

  if (parcoursEnvoyeStatus) {
    return `Parcours envoyé le ${formatTimestamp(parcoursEnvoyeStatus.createdAt)}`;
  }

  if (validationStatus) {
    return `Candidature envoyée le ${formatTimestamp(validationStatus.createdAt)}`;
  }

  return null;
};

const getCandidateName = ({
  candidacy,
  isMiddleNamesEnabled,
}: CandidacyCardProps) => {
  const candidate = candidacy.candidate;
  if (!candidate) {
    return "";
  }

  const lastname = candidate.givenName
    ? `${candidate.givenName} (${candidate.lastname})`
    : candidate.lastname;

  const extraNames = (
    isMiddleNamesEnabled
      ? [candidate.middleNames]
      : [candidate.firstname2, candidate.firstname3]
  )
    .filter(Boolean)
    .join(", ");

  return extraNames
    ? `${lastname} ${candidate.firstname}, ${extraNames}`
    : `${lastname} ${candidate.firstname}`;
};

export const CandidacyCard = ({
  candidacy,
  isMiddleNamesEnabled,
}: CandidacyCardProps) => {
  const previousStatus = [...candidacy.candidacyStatuses].sort((a, b) =>
    isAfter(toDate(a.createdAt), toDate(b.createdAt)) ? 1 : -1,
  )[1]?.status;

  const statusForLabel =
    candidacy.status === "ARCHIVE" && previousStatus
      ? previousStatus
      : candidacy.status;

  const statusLabel = getStatusLabel({
    status: statusForLabel,
    feasibility: candidacy.feasibility,
    readyForJuryEstimatedAt: candidacy.readyForJuryEstimatedAt,
    jury: candidacy.jury,
  });

  const organismLabel =
    candidacy.organism?.nomPublic || candidacy.organism?.label;
  const department = candidacy.candidate?.department;
  const organismLine = [
    organismLabel,
    department ? `${department.label} (${department.code})` : null,
  ]
    .filter(Boolean)
    .join(" - ");

  const certificationLabel = candidacy.certification
    ? `RNCP ${candidacy.certification.codeRncp} : ${candidacy.certification.label}`
    : null;

  const dateToDisplay = getDateToDisplay({ candidacy });

  return (
    <Card
      data-testid="candidacy-card"
      title={getCandidateName({ candidacy, isMiddleNamesEnabled })}
      titleAs="h2"
      size="small"
      classes={{
        root: "shadow-[0px_2px_6px_0px_rgba(0,0,18,0.16)]",
      }}
      start={
        <div className="flex flex-wrap gap-2">
          {candidacy.typeAccompagnement === "AUTONOME" && (
            <Tag small>Autonome</Tag>
          )}
          {candidacy.typeAccompagnement === "ACCOMPAGNE" &&
            candidacy.organism?.modaliteAccompagnement === "A_DISTANCE" && (
              <Tag small iconId="fr-icon-headphone-fill">
                À distance
              </Tag>
            )}
          {candidacy.typeAccompagnement === "ACCOMPAGNE" &&
            candidacy.organism?.modaliteAccompagnement === "LIEU_ACCUEIL" && (
              <Tag small iconId="fr-icon-home-4-fill">
                Sur site
              </Tag>
            )}
          {statusLabel && <Tag small>{statusLabel}</Tag>}
          {candidacy.candidacyDropOut && (
            <Tag small>Candidature abandonnée</Tag>
          )}
          {candidacy.status === "ARCHIVE" && (
            <Tag small>Candidature archivée</Tag>
          )}
        </div>
      }
      desc={
        <span className="flex flex-col gap-2">
          {organismLine && (
            <span className="text-xs text-dsfr-light-text-mention-grey">
              {organismLine}
            </span>
          )}
          {certificationLabel && <span>{certificationLabel}</span>}
          {dateToDisplay && (
            <span className="text-xs text-dsfr-light-text-mention-grey">
              {dateToDisplay}
            </span>
          )}
        </span>
      }
    />
  );
};
