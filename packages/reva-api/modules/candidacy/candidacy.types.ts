import { CandidacyStatusStep } from "@prisma/client";

import { TypeAccompagnement } from "../candidate/candidate.types";
import {
  CandidacySortByFilter,
  JuryResultFilter,
} from "../graphql/generated/graphql";

export interface Candidacy {
  id: string;
  isCertificationPartial?: boolean | null;
  departmentId?: string | null;
  createdAt: Date;
  financeModule: FinanceModule;
  endAccompagnementCandidateDropOutReasonId?: string | null;
  feasibilityFileDematAutonomeResourceHiddenAt?: Date | null;
  feasibilityFileDematAutonomeFirstOpeningAt?: Date | null;
}

type FinanceModule = "unireva" | "unifvae" | "hors_plateforme";

export interface ExperienceInput {
  title: string;
  startedAt: Date;
  duration: Duration;
  description: string;
}

type Duration =
  | "unknown"
  | "lessThanOneYear"
  | "betweenOneAndThreeYears"
  | "moreThanThreeYears"
  | "moreThanFiveYears"
  | "moreThanTenYears";

export enum CandidacyBusinessEvent {
  SUBMITTED_CANDIDACY = "Submitted Candidacy",
  TOOK_OVER_CANDIDACY = "Took over candidacy",
  UPDATED_CERTIFICATION = "Updated Certification",
  ADDED_EXPERIENCE = "Added experience",
  UPDATED_EXPERIENCE = "Updated experience",
  UPDATED_GOALS = "Updated goals",
  UPDATED_CONTACT = "Updated contact",
  DELETED_CANDIDACY = "Deleted candidacy",
  ARCHIVED_CANDIDACY = "Archived candidacy",
  UNARCHIVED_CANDIDACY = "Unarchived candidacy",
  UPDATED_APPOINTMENT_INFO = "Updated appointment info",
  SELECTED_ORGANISM = "Selected organism",
  SUBMITTED_TRAINING_FORM = "Submitted training form",
  CONFIRMED_TRAINING_FORM = "Confirmed training form",
  DROPPED_OUT_CANDIDACY = "Dropped out candidacy",
  DROPPED_OUT_CANDIDACY_BY_CANDIDATE = "Dropped out candidacy by candidate",
  CANCELED_DROPPED_OUT_CANDIDACY = "Canceled dropped out candidacy",
  VALIDATED_DROPPED_OUT_CANDIDACY = "Validated dropped out candidacy",
  UPDATED_EXAM_INFO = "Updated exam information",
  CREATED_FUNDING_REQUEST_UNIFVAE = "Created a funding request (unifvae)",
}

export const candidacyStatusFilters = [
  "ACTIVE_HORS_ABANDON",
  "ABANDON",
  "REORIENTEE",
  "ARCHIVE_HORS_ABANDON_HORS_REORIENTATION",
  "PARCOURS_CONFIRME_HORS_ABANDON",
  "PRISE_EN_CHARGE_HORS_ABANDON",
  "PARCOURS_ENVOYE_HORS_ABANDON",
  "DOSSIER_FAISABILITE_ENVOYE_HORS_ABANDON",
  "DOSSIER_FAISABILITE_RECEVABLE_HORS_ABANDON",
  "DOSSIER_FAISABILITE_INCOMPLET_HORS_ABANDON",
  "DOSSIER_FAISABILITE_NON_RECEVABLE_HORS_ABANDON",
  "DOSSIER_DE_VALIDATION_ENVOYE_HORS_ABANDON",
  "DOSSIER_DE_VALIDATION_SIGNALE_HORS_ABANDON",
  "JURY_HORS_ABANDON",
  "JURY_PROGRAMME_HORS_ABANDON",
  "JURY_PASSE_HORS_ABANDON",
  "VALIDATION_HORS_ABANDON",
  "PROJET_HORS_ABANDON",
  "VAE_COLLECTIVE",
  "DEMANDE_FINANCEMENT_ENVOYEE",
  "DEMANDE_PAIEMENT_ENVOYEE",
  "DEMANDE_PAIEMENT_A_ENVOYER",
  "END_ACCOMPAGNEMENT",
] as const;

export type CandidacyStatusFilter = (typeof candidacyStatusFilters)[number];

export interface SearchOrganismFilter {
  distanceStatus?: string;
  pmr?: boolean;
  zip?: string;
  isMcfCompatible?: boolean;
  isAvailable?: boolean;
}

type CandidacyArchivingReason =
  | "INACTIVITE_CANDIDAT"
  | "REORIENTATION_HORS_FRANCE_VAE"
  | "PROBLEME_FINANCEMENT"
  | "AUTRE"
  | "MULTI_CANDIDATURES"
  | "PASSAGE_AUTONOME_A_ACCOMPAGNE"
  | "ARCHIVER_PAR_LE_CANDIDAT"
  | "REPRISE_EMPLOI"
  | "ENTREE_EN_FORMATION"
  | "DECOURAGEMENT"
  | "RAISONS_PERSONNELLES"
  | "CHANGEMENT_DE_PROJET"
  | "MANQUE_DE_TEMPS"
  | "NON_INTERESSE"
  | "REMUNERATION_NON_OBTENUE"
  | "AVIS_DEFAVORABLE_AAP"
  | "PROBLEME_FINANCEMENT_PARCOURS"
  | "PROBLEME_FINANCEMENT_CERTIFICATEUR"
  | "DELAIS_TROP_LONG"
  | "NON_OBTENTION_PRE_REQUIS"
  | "CANDIDATURE_CREEE_PAR_ERREUR";

export interface ArchiveCandidacyParams {
  candidacyId: string;
  archivingReason: CandidacyArchivingReason;
  archivingReasonAdditionalInformation?: string | null;
}

export interface CreateCandidacyInput {
  certificationId?: string;
  typeAccompagnement?: TypeAccompagnement;
  cohorteVaeCollectiveId?: string;
}

export enum JuryStatusFilter {
  TO_SCHEDULE = "TO_SCHEDULE",
  SCHEDULED = "SCHEDULED",
  PASSED = "PASSED",
}

export interface GetCandidaciesForCertificationAuthorityInput {
  offset?: number;
  limit?: number;
  searchFilter?: string;
  statusFilter?: CandidacyStatusFilter;
  sortByFilter?: CandidacySortByFilter;
  feasibilityStatuses?: CandidacyStatusStep[];
  validationStatuses?: CandidacyStatusStep[];
  juryStatuses?: JuryStatusFilter[];
  juryResults?: JuryResultFilter[];
  includeDropouts?: boolean;
  cohorteVaeCollectiveId?: string;
  certificationAuthorityId?: string;
  certificationAuthorityLocalAccountId?: string;
}

export enum FeasibilityStatusFilter {
  ENVOYE_AU_CANDIDAT = "ENVOYE_AU_CANDIDAT",
  PARTIELLEMENT_VALIDE_PAR_LE_CANDIDAT = "PARTIELLEMENT_VALIDE_PAR_LE_CANDIDAT",
  VALIDE_PAR_LE_CANDIDAT = "VALIDE_PAR_LE_CANDIDAT",
  ENVOYE_AU_CERTIFICATEUR = "ENVOYE_AU_CERTIFICATEUR",
  INCOMPLET = "INCOMPLET",
  RECEVABLE = "RECEVABLE",
}

export enum DossierDeValidationStatusFilter {
  TRANSMETTRE = "TRANSMETTRE",
  ENVOYE = "ENVOYE",
  SIGNALE = "SIGNALE",
}

export enum FundingStatusFilter {
  FVAE_FINANCEMENT = "FVAE_FINANCEMENT",
  FVAE_DEMANDE_PAIEMENT_A_ENVOYER = "FVAE_DEMANDE_PAIEMENT_A_ENVOYER",
  FVAE_DEMANDE_PAIEMENT_ENVOYEE = "FVAE_DEMANDE_PAIEMENT_ENVOYEE",
}

export enum ArchiveStatusFilter {
  NON_RECEVABLE = "NON_RECEVABLE",
  ARCHIVE = "ARCHIVE",
}

export enum AccompagnementStatusFilter {
  EN_COURS = "EN_COURS",
  TERMINE = "TERMINE",
}

export enum TypeAccompagnementStatusFilter {
  AUTONOME = "AUTONOME",
  ACCOMPAGNE = "ACCOMPAGNE",
  VAE_COLLECTIVE = "VAE_COLLECTIVE",
}

export interface GetCandidaciesForAAPInput {
  offset?: number;
  limit?: number;
  searchFilter?: string;
  sortByFilter?: CandidacySortByFilter;
  activeCandidacies?: boolean;
  candidacyStatuses?: CandidacyStatusStep[];
  typeAccompagnementStatuses?: TypeAccompagnementStatusFilter[];
  trainingStatuses?: CandidacyStatusStep[];
  feasibilityStatuses?: FeasibilityStatusFilter[];
  dossierDeValidationStatuses?: DossierDeValidationStatusFilter[];
  juryStatuses?: JuryStatusFilter[];
  juryResults?: JuryResultFilter[];
  fundingStatuses?: FundingStatusFilter[];
  archiveStatuses?: ArchiveStatusFilter[];
  accompagnementStatuses?: AccompagnementStatusFilter[];
  cohorteVaeCollectiveIds?: string[];
  maisonMereAAPId?: string;
}
