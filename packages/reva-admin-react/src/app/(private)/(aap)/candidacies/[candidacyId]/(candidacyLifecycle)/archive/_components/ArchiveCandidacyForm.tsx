import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import Select from "@codegouvfr/react-dsfr/Select";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { sanitizedOptionalTextAllowSpecialCharacters } from "@/utils/input-sanitization";

import { useCandidacyStatus } from "../../../_components/candidacy.hook";

import {
  ARCHIVING_REASON_LABELS,
  CandidacyForArchive,
  useArchive,
} from "./useArchive";

const modal = createModal({
  id: "confirm-candidacy-archiving",
  isOpenedByDefault: false,
});

const archiveSchema = z.object({
  archivingReason: z.enum(
    [
      "INACTIVITE_CANDIDAT",
      "MULTI_CANDIDATURES",
      "PASSAGE_AUTONOME_A_ACCOMPAGNE",
      "PROBLEME_FINANCEMENT",
      "AUTRE",
      "REPRISE_EMPLOI",
      "ENTREE_EN_FORMATION",
      "DECOURAGEMENT",
      "RAISONS_PERSONNELLES",
      "CHANGEMENT_DE_PROJET",
      "MANQUE_DE_TEMPS",
      "NON_INTERESSE",
      "REMUNERATION_NON_OBTENUE",
      "AVIS_DEFAVORABLE_AAP",
      "PROBLEME_FINANCEMENT_PARCOURS",
      "PROBLEME_FINANCEMENT_CERTIFICATEUR",
      "DELAIS_TROP_LONG",
      "REORIENTATION_HORS_FRANCE_VAE",
      "NON_OBTENTION_PRE_REQUIS",
      "CANDIDATURE_CREEE_PAR_ERREUR",
      "ARCHIVER_PAR_LE_CANDIDAT",
    ],
    {
      message: "Merci de remplir ce champ",
    },
  ),
  archivingReasonAdditionalInformation:
    sanitizedOptionalTextAllowSpecialCharacters(),
});

type ArchiveFormData = z.infer<typeof archiveSchema>;

export const ArchiveCandidacyForm = ({
  candidacy,
}: {
  candidacy: NonNullable<CandidacyForArchive>;
}) => {
  const { isFeatureActive } = useFeatureflipping();
  const isCandidateDropOutV2Enabled = isFeatureActive("CANDIDATE_DROP_OUT_V2");

  const { canBeArchived } = useCandidacyStatus(candidacy);

  const router = useRouter();
  const { archiveCandidacy, availableArchivingReasons } = useArchive();
  const [formDataToConfirm, setFormDataToConfirm] =
    useState<ArchiveFormData | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ArchiveFormData>({
    resolver: standardSchemaResolver(archiveSchema),
    shouldUnregister: true, //update the form when the archiving reason changes from "AUTRE" to another reason and reset the additional information field.
  });

  const archivingReason = useWatch({ control, name: "archivingReason" });

  if (!canBeArchived) {
    return (
      <Alert
        data-testid="candidacy-cannot-be-archived-alert"
        title=""
        severity="warning"
        className="my-4"
        description="La candidature ne peut pas être archivée. Son statut ne le permet pas ou vous n'avez pas les permissions nécessaires."
      />
    );
  }

  const confirmArchiving = async () => {
    try {
      if (!formDataToConfirm) {
        console.error("no form data to confirm");
        return;
      }
      await archiveCandidacy.mutateAsync(formDataToConfirm);
      successToast("Modifications enregistrées");
      router.push(`/candidacies/${candidacy.id}/summary`);
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  const handleFormSubmit = handleSubmit(
    async (data) => {
      if (
        data.archivingReason === "AUTRE" &&
        !data.archivingReasonAdditionalInformation
      ) {
        setError("archivingReasonAdditionalInformation", {
          message: "Merci de remplir ce champ",
        });
      } else {
        setFormDataToConfirm(data);
        modal.open();
      }
    },
    (e) => console.error(e),
  );

  return (
    <div className="flex flex-col gap-y-2">
      <modal.Component
        iconId="fr-icon-warning-fill"
        title={<span className="ml-2">Archiver la candidature ?</span>}
        className="modal-confirm-candidacy-archiving"
        size="large"
        buttons={[
          {
            priority: "secondary",
            children: "Annuler",
          },
          {
            priority: "primary",
            onClick: confirmArchiving,
            children: "Confirmer",
          },
        ]}
      >
        <div className="flex flex-col gap-4">
          <p>
            Vous êtes sur le point d’archiver la candidature de{" "}
            <strong>
              {candidacy.candidate?.firstname} {candidacy.candidate?.lastname}
            </strong>{" "}
            sur la certification{" "}
            <strong>
              RNCP {candidacy.certification?.codeRncp}:{" "}
              {candidacy.certification?.label}.
            </strong>
          </p>
          <p>
            En confirmant cet archivage, vous comprenez que{" "}
            <strong>
              le candidat devra créer une nouvelle candidature afin de pouvoir
              recommencer un parcours de VAE.
            </strong>
          </p>
          <p>Confirmez vous l’archivage de la candidature ?</p>
        </div>
      </modal.Component>

      <FormOptionalFieldsDisclaimer />
      <p>
        L’archivage permet au candidat de refaire une candidature dans le cadre
        de France VAE (modification du diplôme, changement d’AAP, modification
        de ses coordonnées, …)
      </p>
      <form onSubmit={handleFormSubmit}>
        {isCandidateDropOutV2Enabled ? (
          <Select
            label="Motif de l'archivage :"
            nativeSelectProps={{
              ...register("archivingReason"),
              defaultValue: "",
            }}
            state={errors.archivingReason ? "error" : "default"}
            stateRelatedMessage={errors.archivingReason?.message}
          >
            <option value="" disabled>
              Sélectionner une option
            </option>
            {Object.entries(ARCHIVING_REASON_LABELS)
              .filter(([value]) => value !== "PROBLEME_FINANCEMENT")
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </Select>
        ) : (
          <RadioButtons
            data-testid="archiving-reason-radio-buttons"
            options={availableArchivingReasons.map((r) => ({
              label: r.label,
              nativeInputProps: {
                "data-testid": `archiving-reason-radio-button-${r.value}`,
                value: r.value,
                ...register("archivingReason"),
              },
            }))}
            state={errors.archivingReason ? "error" : "default"}
            stateRelatedMessage={errors.archivingReason?.message}
          />
        )}
        {archivingReason === "AUTRE" && (
          <Input
            label="S’il s’agit d’une autre raison, merci de l’indiquer ici :"
            nativeInputProps={{
              ...register("archivingReasonAdditionalInformation"),
            }}
            state={
              errors.archivingReasonAdditionalInformation ? "error" : "default"
            }
            stateRelatedMessage={
              errors.archivingReasonAdditionalInformation?.message
            }
          />
        )}
        <FormButtons
          backUrl={`/candidacies/${candidacy.id}/summary`}
          hideResetButton
          formState={{
            isDirty: isDirty,
            isSubmitting: isSubmitting,
          }}
        />
      </form>
    </div>
  );
};
