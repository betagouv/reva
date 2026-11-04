import { Input } from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { sanitizedOptionalTextAllowSpecialCharacters } from "@/utils/input-sanitization";

const completeConfirmationModal = createModal({
  id: "feasibility-complete-confirmation",
  isOpenedByDefault: false,
});

const schema = z
  .object({
    decision: z.enum(["COMPLETE", "INCOMPLETE"], {
      error: "Merci de remplir ce champ",
    }),
    comment: sanitizedOptionalTextAllowSpecialCharacters(),
  })
  .superRefine(({ decision, comment }, { addIssue }) => {
    if (decision === "INCOMPLETE" && !comment) {
      addIssue({
        path: ["comment"],
        code: "too_small",
        minimum: 1,
        origin: "string",
        inclusive: true,
        message: "Merci de remplir ce champ",
      });
    }
  });

export type FeasibilityCompletionFormData = z.infer<typeof schema>;

const CompleteConfirmationModal = ({
  candidateDisplayName,
  certificationDisplayName,
  onConfirm,
}: {
  candidateDisplayName: string;
  certificationDisplayName: string;
  onConfirm: () => void;
}) => (
  <completeConfirmationModal.Component
    size="large"
    title="Confirmer que le dossier est complet"
    iconId="fr-icon-warning-fill"
    buttons={[
      {
        children: "Annuler",
        type: "button",
      },
      {
        children: "Confirmer",
        type: "button",
        nativeButtonProps: {
          "data-testid": "confirm-complete-feasibility-modal-button",
          onClick: onConfirm,
        },
      },
    ]}
  >
    <p>Vous êtes sur le point de déclarer que ce dossier est complet :</p>
    <p className="mb-0">Candidat : {candidateDisplayName}</p>
    <p className="mb-4">Certification : {certificationDisplayName}</p>
    <p className="font-bold">
      Attention : Cette décision est définitive et irréversible.
    </p>
    <p>
      Si vous avez le moindre doute sur votre décision, nous vous recommandons
      vivement de fermer cette fenêtre et d&apos;examiner attentivement le
      dossier avant de prendre votre décision.
    </p>
    <p>
      Êtes-vous certain de vouloir confirmer définitivement que ce dossier est
      complet ?
    </p>
  </completeConfirmationModal.Component>
);

export const FeasibilityCompletionForm = ({
  onSubmit,
  className,
  candidateDisplayName = "",
  certificationDisplayName = "",
}: {
  onSubmit?(data: FeasibilityCompletionFormData): void;
  className?: string;
  candidateDisplayName?: string;
  certificationDisplayName?: string;
}) => {
  const backUrl = "/candidacies/annuaire";

  const pendingSubmitDataRef = useRef<FeasibilityCompletionFormData | null>(
    null,
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FeasibilityCompletionFormData>({
    resolver: standardSchemaResolver(schema),
  });

  const handleFormSubmit = handleSubmit((data) => {
    if (data.decision === "COMPLETE") {
      pendingSubmitDataRef.current = data;
      completeConfirmationModal.open();
    } else {
      onSubmit?.(data);
    }
  });

  const handleConfirmComplete = () => {
    const data = pendingSubmitDataRef.current;
    if (data) {
      completeConfirmationModal.close();
      onSubmit?.(data);
      pendingSubmitDataRef.current = null;
    }
  };

  const { decision } = useWatch({ control });

  return (
    <>
      <form
        className={`flex flex-col ${className}`}
        onSubmit={(e) => {
          e.preventDefault();
          handleFormSubmit(e);
        }}
      >
        <fieldset>
          <legend>
            <h2>État du dossier de faisabilité</h2>
          </legend>
          <p>
            Après étude du dossier, sélectionnez son état et partagez des
            observations utiles au candidat ou à l’AAP.
          </p>
          <RadioButtons
            legend="Quel est l’état de ce dossier de faisabilité ? "
            options={[
              {
                label: <p className="mb-0 text-base">Ce dossier est complet</p>,
                hintText:
                  "Il est correctement rempli et toutes les pièces nécessaires ont été transmises. En cas de dossier complet, et sous condition de recevabilité, le candidat pourra poursuivre son parcours VAE.",
                nativeInputProps: {
                  ...register("decision"),
                  value: "COMPLETE",
                },
              },
              {
                label: (
                  <p className="mb-0 text-base">Ce dossier est incomplet</p>
                ),
                hintText:
                  "Est considéré comme incomplet tout dossier auquel manque des éléments nécessaires à son traitement (pièces jointes inexploitables ou erronées, informations manquantes, mauvais dossier...). L’AAP aura accès à la modification du dossier du candidat pour apporter les informations complémentaires demandées.",
                nativeInputProps: {
                  ...register("decision"),
                  value: "INCOMPLETE",
                },
              },
            ]}
            state={errors.decision ? "error" : "default"}
            stateRelatedMessage={errors.decision?.message}
          />
          <Input
            classes={{ nativeInputOrTextArea: "!min-h-[100px]" }}
            className="w-full"
            textArea
            disabled={decision === "COMPLETE"}
            label={
              <span className="text-base">
                Pouvez-vous indiquer les éléments à revoir dans le dossier ?
              </span>
            }
            nativeTextAreaProps={register("comment")}
            state={errors.comment ? "error" : "default"}
            stateRelatedMessage={errors.comment?.message}
          />
        </fieldset>
        <br />
        <FormButtons backUrl={backUrl} formState={{ isSubmitting, isDirty }} />
      </form>
      <CompleteConfirmationModal
        candidateDisplayName={candidateDisplayName}
        certificationDisplayName={certificationDisplayName}
        onConfirm={handleConfirmComplete}
      />
    </>
  );
};
