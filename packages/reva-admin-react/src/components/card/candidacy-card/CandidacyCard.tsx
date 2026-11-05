import { format, isAfter, toDate } from "date-fns";
import { useRouter } from "next/navigation";

import { WhiteCard } from "@/components/card/white-card/WhiteCard";
import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";

import {
  CandidacyStatus,
  CandidacyStatusStep,
  EndAccompagnementStatus,
  FeasibilityDecision,
  JuryResult,
  OrganismModaliteAccompagnement,
  TypeAccompagnement,
} from "@/graphql/generated/types";

import { CandidacyTagsAap } from "../../candidacy-tags-aap/CandidacyTagsAap";

type Feasibility = {
  dematerializedFeasibilityFile?: {
    sentToCandidateAt?: number | null;
    isReadyToBeSentToCertificationAuthority: boolean;
    isReadyToBeSentToCandidate: boolean;
    candidateConfirmationAt?: number | null;
    swornStatementFileId?: string | null;
  } | null;
  decision: FeasibilityDecision;
  decisionSentAt?: number | null;
  feasibilityFileSentAt?: number | null;
} | null;

type DossierDeValidation = {
  dossierDeValidationSentAt?: number | null;
} | null;

type Jury = {
  dateOfSession: number;
  result?: JuryResult | null;
} | null;

type Dropout = {
  createdAt: number;
} | null;

export const CandidacyCard = ({
  candidacyId,
  candidateFirstname,
  candidateFirstname2,
  candidateFirstname3,
  candidateMiddleNames,
  candidateLastname,
  candidateGivenName,
  certificationLabel,
  departmentLabel,
  departmentCode,
  organismLabel,
  organismModalitateAccompagnement,
  vaeCollective,
  vaeCollectiveCommanditaireLabel,
  vaeCollectiveProjetLabel,
  vaeCollectiveCohortLabel,
  typeAccompagnement,
  status,
  statusHistory,
  firstAppointmentOccuredAt,
  feasibility,
  dossierDeValidation,
  readyForJuryEstimatedAt,
  jury,
  dropout,
  endAccompagnementStatus,
  endAccompagnementDate,
}: {
  candidacyId: string;
  candidateFirstname: string;
  candidateFirstname2?: string;
  candidateFirstname3?: string;
  candidateMiddleNames?: string;
  candidateLastname: string;
  candidateGivenName?: string;
  certificationLabel?: string;
  departmentLabel?: string;
  departmentCode?: string;
  organismLabel?: string;
  organismModalitateAccompagnement?: OrganismModaliteAccompagnement;
  candidacySentAt?: Date;
  vaeCollective?: boolean;
  vaeCollectiveCommanditaireLabel?: string;
  vaeCollectiveProjetLabel?: string;
  vaeCollectiveCohortLabel?: string;
  typeAccompagnement: TypeAccompagnement;
  status: CandidacyStatusStep;
  statusHistory: Omit<CandidacyStatus, "id">[];
  firstAppointmentOccuredAt?: Date;
  feasibility?: Feasibility;
  dossierDeValidation?: DossierDeValidation;
  readyForJuryEstimatedAt?: Date;
  jury?: Jury;
  dropout?: Dropout;
  endAccompagnementStatus?: EndAccompagnementStatus | null;
  endAccompagnementDate?: number | null;
}) => {
  const router = useRouter();

  const currentStatus = status;
  const previousStatus = statusHistory.sort((a, b) =>
    isAfter(a.createdAt, b.createdAt) ? 1 : -1,
  )[1]?.status;

  const validationStatus = statusHistory.find((s) => s.status === "VALIDATION");
  const parcoursEnvoyeStatus = statusHistory.find(
    (s) => s.status === "PARCOURS_ENVOYE",
  );
  const parcoursConfirmeStatus = statusHistory.find(
    (s) => s.status === "PARCOURS_CONFIRME",
  );

  const candidacySentAt = validationStatus
    ? toDate(validationStatus.createdAt)
    : undefined;

  const parcoursEnvoyeAt = parcoursEnvoyeStatus
    ? toDate(parcoursEnvoyeStatus.createdAt)
    : undefined;

  const parcoursConfirmeAt = parcoursConfirmeStatus
    ? toDate(parcoursConfirmeStatus.createdAt)
    : undefined;

  const { isFeatureActive } = useFeatureflipping();

  const isMiddleNamesEnabled = isFeatureActive("MIDDLE_NAMES");

  let dateToDisplay = undefined;

  if (
    endAccompagnementDate &&
    (endAccompagnementStatus === "CONFIRMED_BY_CANDIDATE" ||
      endAccompagnementStatus === "CONFIRMED_BY_ADMIN")
  ) {
    dateToDisplay = (
      <>
        <span
          className="fr-icon-close-circle-fill fr-icon--sm mr-2"
          aria-hidden="true"
        />
        {`Accompagnement terminé le ${format(endAccompagnementDate, "dd/MM/yyyy")}`}
      </>
    );
  } else if (jury?.dateOfSession && isAfter(new Date(), jury?.dateOfSession)) {
    dateToDisplay = `Jury passé le ${format(jury?.dateOfSession, "dd/MM/yyyy")}`;
  } else if (jury?.dateOfSession) {
    dateToDisplay = `Jury programmé le ${format(jury?.dateOfSession, "dd/MM/yyyy")}`;
  } else if (dossierDeValidation?.dossierDeValidationSentAt) {
    dateToDisplay = `Dossier de validation déposé le ${format(dossierDeValidation?.dossierDeValidationSentAt, "dd/MM/yyyy")}`;
  } else if (
    feasibility?.decision === "ADMISSIBLE" &&
    feasibility?.decisionSentAt
  ) {
    dateToDisplay = `Déclaré recevable le ${format(feasibility?.decisionSentAt, "dd/MM/yyyy")}`;
  } else if (
    feasibility?.decision === "REJECTED" &&
    feasibility?.decisionSentAt
  ) {
    dateToDisplay = (
      <>
        <span
          className="fr-icon-close-circle-fill fr-icon--sm mr-2"
          aria-hidden="true"
        />
        {`Déclaré non recevable le ${format(feasibility?.decisionSentAt, "dd/MM/yyyy")}`}
      </>
    );
  } else if (feasibility?.feasibilityFileSentAt) {
    dateToDisplay = `Dossier de faisabilité déposé le ${format(feasibility?.feasibilityFileSentAt, "dd/MM/yyyy")}`;
  } else if (
    feasibility?.dematerializedFeasibilityFile?.candidateConfirmationAt
  ) {
    dateToDisplay = `Dossier de faisabilité validé par le candidat le ${format(feasibility?.dematerializedFeasibilityFile?.candidateConfirmationAt, "dd/MM/yyyy")}`;
  } else if (feasibility?.dematerializedFeasibilityFile?.sentToCandidateAt) {
    dateToDisplay = `Dossier de faisabilité envoyé au candidat le ${format(feasibility?.dematerializedFeasibilityFile?.sentToCandidateAt, "dd/MM/yyyy")}`;
  } else if (parcoursConfirmeAt) {
    dateToDisplay = `Parcours confirmé le ${format(parcoursConfirmeAt, "dd/MM/yyyy")}`;
  } else if (parcoursEnvoyeAt) {
    dateToDisplay = `Parcours envoyé le ${format(parcoursEnvoyeAt, "dd/MM/yyyy")}`;
  } else if (candidacySentAt) {
    dateToDisplay = `Candidature envoyée le ${format(candidacySentAt, "dd/MM/yyyy")}`;
  }

  return (
    <WhiteCard
      key={candidacyId}
      className="gap-3 fr-card--shadow hover:bg-dsfr-light-neutral-grey-1000 cursor-pointer"
      onClick={() => {
        router.push(`/candidacies/${candidacyId}/summary`);
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2">
          <CandidacyTagsAap
            currentStatus={currentStatus}
            previousStatus={previousStatus}
            typeAccompagnement={typeAccompagnement}
            firstAppointmentOccuredAt={firstAppointmentOccuredAt}
            readyForJuryEstimatedAt={readyForJuryEstimatedAt}
            organismModalitateAccompagnement={organismModalitateAccompagnement}
            vaeCollective={vaeCollective}
            jury={jury}
            feasibility={feasibility}
            dropout={dropout}
          />
        </div>

        {organismLabel && departmentLabel && departmentCode && (
          <div className="text-xs text-dsfrGray-mentionGrey">{`${organismLabel} - ${departmentLabel} (${departmentCode})`}</div>
        )}

        {organismLabel && !departmentLabel && !departmentCode && (
          <div className="text-xs text-dsfrGray-mentionGrey">{`${organismLabel}`}</div>
        )}

        {!organismLabel && departmentLabel && departmentCode && (
          <div className="text-xs text-dsfrGray-mentionGrey">{`${departmentLabel} (${departmentCode})`}</div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="font-bold text-xl text-dsfr-blue-france-sun-113">
          {candidateGivenName
            ? `${candidateGivenName} (${candidateLastname})`
            : candidateLastname}{" "}
          {candidateFirstname}
          {isMiddleNamesEnabled ? (
            <>{candidateMiddleNames && <span>, {candidateMiddleNames}</span>}</>
          ) : (
            <>
              {candidateFirstname2 && <span>, {candidateFirstname2}</span>}
              {candidateFirstname3 && <span>, {candidateFirstname3}</span>}
            </>
          )}
        </div>

        <p className="m-0 text-sm">
          {certificationLabel && (
            <span>
              {certificationLabel}
              <br />
            </span>
          )}

          {vaeCollectiveCommanditaireLabel && vaeCollectiveProjetLabel && (
            <span>
              {`${vaeCollectiveCommanditaireLabel} - ${vaeCollectiveProjetLabel}`}
              <br />
            </span>
          )}

          {vaeCollectiveCohortLabel && <span>{vaeCollectiveCohortLabel}</span>}
        </p>
      </div>

      <div className="flex flex-row gap-2 justify-between">
        <div className="text-xs text-dsfrGray-mentionGrey">{dateToDisplay}</div>

        <span
          className="fr-icon--sm fr-icon-arrow-right-line text-dsfr-blue-france-sun-113"
          aria-hidden="true"
        />
      </div>
    </WhiteCard>
  );
};
