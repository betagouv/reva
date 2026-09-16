import {
  Candidacy,
  CandidacyStatusStep,
  Certification,
  Organism,
} from "@/graphql/generated/graphql";

import type { CandidateEntity } from "./create-candidate.entity";
import type { DossierDeValidationEntity } from "./create-dossier-de-validation.entity";
import type { FeasibilityEntity } from "./create-feasibility.entity";
import type { JuryEntity } from "./create-jury.entity";

type HistoryJuryEntity = JuryEntity & { id: string };

// Allow partials for nested fields
// But make "id" and "appointments" fields required to avoid undefined checks in tests
export type CandidacyEntity = Partial<
  Omit<
    Candidacy,
    | "candidate"
    | "jury"
    | "feasibility"
    | "activeDossierDeValidation"
    | "historyJury"
  >
> & {
  candidate?: CandidateEntity | null;
  jury?: JuryEntity | null;
  feasibility?: FeasibilityEntity | null;
  activeDossierDeValidation?: DossierDeValidationEntity | null;
  id: Candidacy["id"];
  appointments: Candidacy["appointments"];
  historyJury?: HistoryJuryEntity[];
};

export type CreateCandidacyEntityOptions = {
  status?: CandidacyStatusStep;
  readyForJuryEstimatedAt?: Candidacy["readyForJuryEstimatedAt"];
  firstAppointmentOccuredAt?: Candidacy["firstAppointmentOccuredAt"];
  typeAccompagnement?: Candidacy["typeAccompagnement"];
  organism?: Organism | null;
  certification?: Certification | null;
  feasibility?: FeasibilityEntity | null;
  candidate?: CandidateEntity | null;
  activeDossierDeValidation?: DossierDeValidationEntity | null;
  endAccompagnementStatus?: CandidacyEntity["endAccompagnementStatus"];
  endAccompagnementDate?: CandidacyEntity["endAccompagnementDate"];
  appointments?: Candidacy["appointments"];
  jury?: JuryEntity | null;
  historyJury?: HistoryJuryEntity[];
  goalsCount?: number;
  experiencesCount?: number;
  candidacyAlreadySubmitted?: boolean;
  feasibilityFormat?: Candidacy["feasibilityFormat"];
  certificationAuthorities?: Candidacy["certificationAuthorities"];
  certificationAuthority?: Candidacy["certificationAuthority"];
  candidacyDropOut?: Candidacy["candidacyDropOut"];
  basicSkills?: Candidacy["basicSkills"];
  mandatoryTrainings?: Candidacy["mandatoryTrainings"];
  certificateSkills?: Candidacy["certificateSkills"];
  otherTraining?: Candidacy["otherTraining"];
  individualHourCount?: Candidacy["individualHourCount"];
  collectiveHourCount?: Candidacy["collectiveHourCount"];
  additionalHourCount?: Candidacy["additionalHourCount"];
  candidacyStatuses?: Candidacy["candidacyStatuses"];
  warningOnFeasibilitySubmission?: Candidacy["warningOnFeasibilitySubmission"];
  certificationAuthorityLocalAccounts?:
    | Candidacy["certificationAuthorityLocalAccounts"]
    | null;
};

export function createCandidacyStatuses(statuses: CandidacyStatusStep[]) {
  return statuses.map((status, i) => ({
    id: String(i + 1),
    status,
    createdAt: Date.now(),
  }));
}

export const createCandidacyEntity = (
  options: CreateCandidacyEntityOptions,
) => {
  const {
    organism,
    certification,
    status,
    readyForJuryEstimatedAt,
    firstAppointmentOccuredAt,
    jury,
    historyJury,
    activeDossierDeValidation,
    goalsCount,
    experiencesCount,
    candidacyAlreadySubmitted,
    typeAccompagnement,
    feasibility,
    candidate,
    endAccompagnementStatus,
    endAccompagnementDate,
    appointments,
    feasibilityFormat,
    certificationAuthorities,
    certificationAuthority,
    candidacyDropOut,
    basicSkills,
    mandatoryTrainings,
    certificateSkills,
    otherTraining,
    individualHourCount,
    collectiveHourCount,
    additionalHourCount,
    candidacyStatuses,
    warningOnFeasibilitySubmission,
    certificationAuthorityLocalAccounts,
    feasibilityFileDematAutonomeResourceHidden,
  } = options;

  const candidacy: CandidacyEntity = {
    id: "1",
    typeAccompagnement: typeAccompagnement || "AUTONOME",
    status: status || "PROJET",
    readyForJuryEstimatedAt: readyForJuryEstimatedAt || null,
    appointments: {
      rows: [],
      info: {
        currentPage: 1,
        pageLength: 10,
        totalPages: 1,
        totalRows: 0,
      },
    },
    basicSkills: basicSkills ?? [],
    candidacyLogs: [],
    candidacyStatuses: candidacyStatuses ?? [],
    certificateSkills: certificateSkills ?? null,
    otherTraining: otherTraining ?? null,
    individualHourCount: individualHourCount ?? null,
    collectiveHourCount: collectiveHourCount ?? null,
    additionalHourCount: additionalHourCount ?? null,
    certificationAuthorityLocalAccounts:
      certificationAuthorityLocalAccounts ?? [],
    mandatoryTrainings: mandatoryTrainings ?? [],
    feasibilityFormat: feasibilityFormat || "DEMATERIALIZED",
    certificationAuthorities: certificationAuthorities || [],
    certificationAuthority: certificationAuthority ?? null,
    createdAt: new Date().getTime(),
    feasibility,
    jury: jury || null,
    historyJury: historyJury ?? [],
    activeDossierDeValidation,
    goals: [],
    experiences: [],
    organism: null,
    certification,
    sentAt: null,
    candidate,
    endAccompagnementStatus,
    endAccompagnementDate,
    candidacyDropOut,
    warningOnFeasibilitySubmission,
    feasibilityFileDematAutonomeResourceHidden,
  };

  if (candidate) {
    candidacy.candidateInfo = {
      street: candidate.street,
      city: candidate.city,
      zip: candidate.zip,
      addressComplement: candidate.addressComplement,
    };
  }

  if (organism) {
    candidacy.organism = organism;
    candidacy.typeAccompagnement = "ACCOMPAGNE";
  }

  if (typeof goalsCount === "number") {
    candidacy.goals = Array.from({ length: goalsCount }).map((_, i) => ({
      id: `goal-${i + 1}`,
      isActive: true,
      label: `Goal ${i + 1}`,
      needsAdditionalInformation: false,
      order: i + 1,
    }));
  }

  if (typeof experiencesCount === "number") {
    candidacy.experiences = Array.from({ length: experiencesCount }).map(
      (_, i) => ({
        id: `exp-${i + 1}`,
        description: `Experience ${i + 1}`,
        duration: "lessThanOneYear",
        startedAt: new Date().getTime(),
        title: `Experience ${i + 1}`,
      }),
    );
  }

  if (candidacyAlreadySubmitted) {
    candidacy.sentAt = Date.now();
  }

  if (appointments) {
    candidacy.appointments = appointments;
  }

  if (firstAppointmentOccuredAt !== undefined) {
    candidacy.firstAppointmentOccuredAt = firstAppointmentOccuredAt;
  }

  return candidacy;
};
