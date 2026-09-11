import Accordion from "@codegouvfr/react-dsfr/Accordion";
import Button from "@codegouvfr/react-dsfr/Button";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";

import { useAuth } from "@/components/auth/auth";

import {
  CandidacyStatusStep,
  FeasibilityStatusFilter,
  DossierDeValidationStatusFilter,
  JuryStatusFilter,
  JuryResultFilter,
  FundingStatusFilter,
  ArchiveStatusFilter,
  AccompagnementStatusFilter,
  TypeAccompagnementStatusFilter,
} from "@/graphql/generated/graphql";

import { AnnuaireFilters } from "./annuaire.hook";

interface FiltersSectionProps {
  filters: AnnuaireFilters;
  cohortes: Array<{ id: string; nom: string }>;
  onToggleActiveCandidacies: (active: boolean) => void;
  onToggleCandidacyStatus: (status: CandidacyStatusStep) => void;
  onToggleTypeAccompagnementStatus: (
    status: TypeAccompagnementStatusFilter,
  ) => void;
  onToggleTrainingStatus: (status: CandidacyStatusStep) => void;
  onToggleFeasibilityStatus: (status: FeasibilityStatusFilter) => void;
  onToggleDossierDeValidationStatus: (
    status: DossierDeValidationStatusFilter,
  ) => void;
  onToggleJuryStatus: (status: JuryStatusFilter) => void;
  onToggleJuryResults: (results: JuryResultFilter[]) => void;
  onToggleFundingStatus: (status: FundingStatusFilter) => void;
  onToggleArchiveStatus: (status: ArchiveStatusFilter) => void;
  onToggleAccompagnementStatus: (status: AccompagnementStatusFilter) => void;
  onToggleCohorteVAECollective: (cohorteVaeCollectiveId: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const FiltersSection = ({
  filters,
  cohortes,
  onToggleActiveCandidacies,
  onToggleCandidacyStatus,
  onToggleTypeAccompagnementStatus,
  onToggleTrainingStatus,
  onToggleFeasibilityStatus,
  onToggleDossierDeValidationStatus,
  onToggleJuryStatus,
  onToggleJuryResults,
  onToggleFundingStatus,
  onToggleArchiveStatus,
  onToggleAccompagnementStatus,
  onToggleCohorteVAECollective,
  onClearFilters,
  hasActiveFilters,
}: FiltersSectionProps) => {
  const { isAdmin } = useAuth();

  return (
    <div className="flex w-[282px] shrink-0 flex-col gap-4">
      <Accordion
        label="Candidatures"
        className="bg-white"
        defaultExpanded={
          filters.activeCandidacies || filters.candidacyStatuses.length > 0
        }
      >
        <Checkbox
          small
          className="mb-0"
          options={[
            ...(isAdmin
              ? [
                  {
                    label: "Actives",
                    nativeInputProps: {
                      checked: filters.activeCandidacies,
                      onChange: () =>
                        onToggleActiveCandidacies(!filters.activeCandidacies),
                    },
                  },
                  {
                    label: "Brouillon / Projet",
                    nativeInputProps: {
                      checked: filters.candidacyStatuses.includes("PROJET"),
                      onChange: () => onToggleCandidacyStatus("PROJET"),
                    },
                  },
                ]
              : []),
            {
              label: "Nouvelles",
              nativeInputProps: {
                checked: filters.candidacyStatuses.includes("VALIDATION"),
                onChange: () => onToggleCandidacyStatus("VALIDATION"),
              },
            },
            {
              label: "Consultées",
              nativeInputProps: {
                checked: filters.candidacyStatuses.includes("PRISE_EN_CHARGE"),
                onChange: () => onToggleCandidacyStatus("PRISE_EN_CHARGE"),
              },
            },
          ]}
        />
      </Accordion>

      {isAdmin && (
        <Accordion
          label="Modalité de parcours"
          className="bg-white"
          defaultExpanded={filters.typeAccompagnementStatuses.length > 0}
        >
          <Checkbox
            small
            className="mb-0"
            options={[
              {
                label: "Accompagnement individuel",
                nativeInputProps: {
                  checked:
                    filters.typeAccompagnementStatuses.includes("ACCOMPAGNE"),
                  onChange: () =>
                    onToggleTypeAccompagnementStatus("ACCOMPAGNE"),
                },
              },
              {
                label: "Accompagnement collectif",
                nativeInputProps: {
                  checked:
                    filters.typeAccompagnementStatuses.includes(
                      "VAE_COLLECTIVE",
                    ),
                  onChange: () =>
                    onToggleTypeAccompagnementStatus("VAE_COLLECTIVE"),
                },
              },
              {
                label: "Sans accompagnement",
                nativeInputProps: {
                  checked:
                    filters.typeAccompagnementStatuses.includes("AUTONOME"),
                  onChange: () => onToggleTypeAccompagnementStatus("AUTONOME"),
                },
              },
            ]}
          />
        </Accordion>
      )}

      <Accordion
        label="Parcours et financement"
        className="bg-white"
        defaultExpanded={filters.trainingStatuses.length > 0}
      >
        <Checkbox
          small
          className="mb-0"
          options={[
            {
              label: "Envoyé au candidat",
              nativeInputProps: {
                checked: filters.trainingStatuses.includes("PARCOURS_ENVOYE"),
                onChange: () => onToggleTrainingStatus("PARCOURS_ENVOYE"),
              },
            },
            {
              label: "Validé par le candidat",
              nativeInputProps: {
                checked: filters.trainingStatuses.includes("PARCOURS_CONFIRME"),
                onChange: () => onToggleTrainingStatus("PARCOURS_CONFIRME"),
              },
            },
          ]}
        />
      </Accordion>

      <Accordion
        label="Dossier de faisabilité"
        className="bg-white"
        defaultExpanded={filters.feasibilityStatuses.length > 0}
      >
        <Checkbox
          small
          className="mb-0"
          options={[
            {
              label: "Envoyé au candidat",
              nativeInputProps: {
                checked:
                  filters.feasibilityStatuses.includes("ENVOYE_AU_CANDIDAT"),
                onChange: () => onToggleFeasibilityStatus("ENVOYE_AU_CANDIDAT"),
              },
            },
            {
              label: "Validé sans attestation",
              nativeInputProps: {
                checked: filters.feasibilityStatuses.includes(
                  "PARTIELLEMENT_VALIDE_PAR_LE_CANDIDAT",
                ),
                onChange: () =>
                  onToggleFeasibilityStatus(
                    "PARTIELLEMENT_VALIDE_PAR_LE_CANDIDAT",
                  ),
              },
            },
            {
              label: "Validé par le candidat",
              nativeInputProps: {
                checked: filters.feasibilityStatuses.includes(
                  "VALIDE_PAR_LE_CANDIDAT",
                ),
                onChange: () =>
                  onToggleFeasibilityStatus("VALIDE_PAR_LE_CANDIDAT"),
              },
            },
            {
              label: "Envoyé au certificateur",
              nativeInputProps: {
                checked: filters.feasibilityStatuses.includes(
                  "ENVOYE_AU_CERTIFICATEUR",
                ),
                onChange: () =>
                  onToggleFeasibilityStatus("ENVOYE_AU_CERTIFICATEUR"),
              },
            },
            {
              label: "Incomplet",
              nativeInputProps: {
                checked: filters.feasibilityStatuses.includes("INCOMPLET"),
                onChange: () => onToggleFeasibilityStatus("INCOMPLET"),
              },
            },
            {
              label: "Recevable",
              nativeInputProps: {
                checked: filters.feasibilityStatuses.includes("RECEVABLE"),
                onChange: () => onToggleFeasibilityStatus("RECEVABLE"),
              },
            },
          ]}
        />
      </Accordion>

      <Accordion
        label="Dossier de validation"
        className="bg-white"
        defaultExpanded={filters.dossierDeValidationStatuses.length > 0}
      >
        <Checkbox
          small
          className="mb-0"
          options={[
            {
              label: "À transmettre",
              nativeInputProps: {
                checked:
                  filters.dossierDeValidationStatuses.includes("TRANSMETTRE"),
                onChange: () =>
                  onToggleDossierDeValidationStatus("TRANSMETTRE"),
              },
            },
            {
              label: "Envoyé",
              nativeInputProps: {
                checked: filters.dossierDeValidationStatuses.includes("ENVOYE"),
                onChange: () => onToggleDossierDeValidationStatus("ENVOYE"),
              },
            },
            {
              label: "Signalé",
              nativeInputProps: {
                checked:
                  filters.dossierDeValidationStatuses.includes("SIGNALE"),
                onChange: () => onToggleDossierDeValidationStatus("SIGNALE"),
              },
            },
          ]}
        />
      </Accordion>

      <Accordion
        label="Passage devant le jury"
        className="bg-white"
        defaultExpanded={filters.juryStatuses.length > 0}
      >
        <Checkbox
          small
          className="mb-0"
          options={[
            {
              label: "En attente d'une date",
              nativeInputProps: {
                checked: filters.juryStatuses.includes("TO_SCHEDULE"),
                onChange: () => onToggleJuryStatus("TO_SCHEDULE"),
              },
            },
            {
              label: "Programmé",
              nativeInputProps: {
                checked: filters.juryStatuses.includes("SCHEDULED"),
                onChange: () => onToggleJuryStatus("SCHEDULED"),
              },
            },
            {
              label: "Passé",
              nativeInputProps: {
                checked: filters.juryStatuses.includes("PASSED"),
                onChange: () => onToggleJuryStatus("PASSED"),
              },
            },
          ]}
        />
      </Accordion>

      <Accordion
        label="Résultat de jury"
        className="bg-white"
        defaultExpanded={filters.juryResults.length > 0}
      >
        <Checkbox
          small
          className="mb-0"
          options={[
            {
              label: "En attente de résultat",
              nativeInputProps: {
                checked: filters.juryResults.includes("AWAITING_RESULT"),
                onChange: () => onToggleJuryResults(["AWAITING_RESULT"]),
              },
            },
            {
              label: "Réussite totale",
              nativeInputProps: {
                checked:
                  filters.juryResults.includes(
                    "FULL_SUCCESS_OF_FULL_CERTIFICATION",
                  ) ||
                  filters.juryResults.includes(
                    "FULL_SUCCESS_OF_PARTIAL_CERTIFICATION",
                  ),
                onChange: () => {
                  onToggleJuryResults([
                    "FULL_SUCCESS_OF_FULL_CERTIFICATION",
                    "FULL_SUCCESS_OF_PARTIAL_CERTIFICATION",
                  ]);
                },
              },
            },
            {
              label: "Réussite partielle",
              nativeInputProps: {
                checked:
                  filters.juryResults.includes(
                    "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION",
                  ) ||
                  filters.juryResults.includes(
                    "PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION",
                  ) ||
                  filters.juryResults.includes(
                    "PARTIAL_SUCCESS_PENDING_CONFIRMATION",
                  ),
                onChange: () => {
                  onToggleJuryResults([
                    "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION",
                    "PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION",
                    "PARTIAL_SUCCESS_PENDING_CONFIRMATION",
                  ]);
                },
              },
            },
            {
              label: "Non validation",
              nativeInputProps: {
                checked: filters.juryResults.includes("FAILURE"),
                onChange: () => onToggleJuryResults(["FAILURE"]),
              },
            },
            {
              label: "Non présentation au jury",
              nativeInputProps: {
                checked:
                  filters.juryResults.includes("CANDIDATE_EXCUSED") ||
                  filters.juryResults.includes("CANDIDATE_ABSENT"),
                onChange: () => {
                  onToggleJuryResults([
                    "CANDIDATE_EXCUSED",
                    "CANDIDATE_ABSENT",
                  ]);
                },
              },
            },
          ]}
        />
      </Accordion>

      <Accordion
        label="Financement France VAE"
        className="bg-white"
        defaultExpanded={filters.fundingStatuses.length > 0}
      >
        <Checkbox
          small
          className="mb-0"
          options={[
            {
              label: "Candidatures financées par France VAE",
              nativeInputProps: {
                checked: filters.fundingStatuses.includes("FVAE_FINANCEMENT"),
                onChange: () => onToggleFundingStatus("FVAE_FINANCEMENT"),
              },
            },
            {
              label: "Demande de paiement à envoyer",
              nativeInputProps: {
                checked: filters.fundingStatuses.includes(
                  "FVAE_DEMANDE_PAIEMENT_A_ENVOYER",
                ),
                onChange: () =>
                  onToggleFundingStatus("FVAE_DEMANDE_PAIEMENT_A_ENVOYER"),
              },
            },
            {
              label: "Demande de paiement envoyée",
              nativeInputProps: {
                checked: filters.fundingStatuses.includes(
                  "FVAE_DEMANDE_PAIEMENT_ENVOYEE",
                ),
                onChange: () =>
                  onToggleFundingStatus("FVAE_DEMANDE_PAIEMENT_ENVOYEE"),
              },
            },
          ]}
        />
      </Accordion>

      {cohortes.length > 0 && (
        <Accordion
          label="VAE Collective"
          className="bg-white"
          defaultExpanded={filters.cohorteVaeCollectiveIds.length > 0}
        >
          <Checkbox
            small
            className="mb-0"
            options={cohortes.map((cohorte) => ({
              label: cohorte.nom,
              nativeInputProps: {
                checked: filters.cohorteVaeCollectiveIds.includes(cohorte.id),
                onChange: () => onToggleCohorteVAECollective(cohorte.id),
              },
            }))}
          />
        </Accordion>
      )}

      <Accordion
        label="Candidatures arrêtées"
        className="bg-white"
        defaultExpanded={filters.archiveStatuses.length > 0}
      >
        <Checkbox
          small
          className="mb-0"
          options={[
            {
              label: "Non recevables",
              nativeInputProps: {
                checked: filters.archiveStatuses.includes("NON_RECEVABLE"),
                onChange: () => onToggleArchiveStatus("NON_RECEVABLE"),
              },
            },
            {
              label: "Abandonnées",
              nativeInputProps: {
                checked: filters.archiveStatuses.includes("ARCHIVE"),
                onChange: () => onToggleArchiveStatus("ARCHIVE"),
              },
            },
          ]}
        />
      </Accordion>

      <Accordion
        label="Accompagnement"
        className="bg-white"
        defaultExpanded={filters.accompagnementStatuses.length > 0}
      >
        <Checkbox
          small
          className="mb-0"
          options={[
            {
              label: "En cours",
              nativeInputProps: {
                checked: filters.accompagnementStatuses.includes("EN_COURS"),
                onChange: () => onToggleAccompagnementStatus("EN_COURS"),
              },
            },
            {
              label: "Terminé",
              nativeInputProps: {
                checked: filters.accompagnementStatuses.includes("TERMINE"),
                onChange: () => onToggleAccompagnementStatus("TERMINE"),
              },
            },
          ]}
        />
      </Accordion>

      <Button
        priority="tertiary"
        onClick={onClearFilters}
        className="self-center"
        disabled={!hasActiveFilters}
      >
        Réinitialiser les filtres
      </Button>
    </div>
  );
};
