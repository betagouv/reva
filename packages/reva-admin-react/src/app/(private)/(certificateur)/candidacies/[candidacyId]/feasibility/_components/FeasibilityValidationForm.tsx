import Badge from "@codegouvfr/react-dsfr/Badge";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { CustomErrorBadge } from "@/components/badge/custom-error-badge/CustomErrorBadge";
import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { sanitizedOptionalTextAllowSpecialCharacters } from "@/utils/input-sanitization";

const decisionWarningModal = createModal({
  id: "decision-warning",
  isOpenedByDefault: false,
});

const DecisionBadge = ({
  isDecisionAdmissible,
}: {
  isDecisionAdmissible: boolean;
}) => {
  return isDecisionAdmissible ? (
    <Badge severity="success" noIcon>
      Recevable
    </Badge>
  ) : (
    <CustomErrorBadge label="Non recevable" />
  );
};

const DecisionWarningModal = ({
  onSubmit,
  isDecisionAdmissible,
  candidateName,
  certificationName,
}: {
  onSubmit: () => void;
  isDecisionAdmissible: boolean;
  candidateName: string;
  certificationName: string;
}) => {
  return (
    <decisionWarningModal.Component
      size="large"
      title="Confirmer la recevabilité"
      iconId="fr-icon-warning-fill"
      buttons={[
        {
          children: "Retour",
          type: "button",
        },
        {
          children: "Confirmer",
          type: "button",
          nativeButtonProps: {
            "data-testid": "submit-decision-modal-button",
            onClick: onSubmit,
          },
        },
      ]}
    >
      <p>Vous êtes sur le point de prononcer la recevabilité pour :</p>
      <p className="mb-0">Candidat : {candidateName}</p>
      <p className="mb-4">Diplôme : {certificationName}</p>
      <DecisionBadge isDecisionAdmissible={isDecisionAdmissible} />
      <p className="mt-4 mb-6 font-bold">
        ⚠️ Attention : Cette décision est définitive et irréversible.
      </p>
      <p>
        Si vous avez le moindre doute sur votre évaluation, nous vous
        recommandons vivement de fermer cette fenêtre et de relire attentivement
        le dossier de faisabilité avant de prendre votre décision finale.
      </p>
      <p>
        Êtes-vous certain(e) de vouloir confirmer définitivement la recevabilité
        de ce dossier ?
      </p>
    </decisionWarningModal.Component>
  );
};

const schema = z
  .object({
    decision: z.enum(["ADMISSIBLE", "REJECTED"], {
      error: "Merci de remplir ce champ",
    }),
    comment: sanitizedOptionalTextAllowSpecialCharacters(),
    infoFile: z.object({ 0: z.instanceof(File).optional() }),
  })
  .superRefine(({ decision, comment }, { addIssue }) => {
    if (decision === "REJECTED" && !comment) {
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

export type FeasibilityValidationFormData = z.infer<typeof schema>;

export const FeasibilityValidationForm = ({
  onSubmit,
  className,
  candidateName,
  certificationName,
}: {
  onSubmit: (data: FeasibilityValidationFormData) => void;
  className?: string;
  candidateName: string;
  certificationName: string;
}) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    trigger,
    watch,
  } = useForm<FeasibilityValidationFormData>({
    resolver: standardSchemaResolver(schema),
  });

  const handleFormSubmit = handleSubmit((data) => onSubmit?.(data));

  const { decision } = useWatch({ control });

  const isDecisionAdmissible = watch("decision") === "ADMISSIBLE";

  return (
    <>
      <form
        className={`flex flex-col ${className}`}
        onSubmit={async (e) => {
          e.preventDefault();
          const isFormValid = await trigger();
          if (isFormValid) {
            decisionWarningModal.open();
          }
        }}
      >
        <fieldset>
          <legend>
            <h2>Décision concernant le dossier</h2>
          </legend>
          <RadioButtons
            legend="Sélectionnez si ce dossier est recevable ou non recevable. La décision et les motifs associés à celle-ci seront transmis au candidat et à son Architecte Accompagnateur de Parcours."
            options={[
              {
                label: (
                  <p className="mb-0 text-base">
                    Ce dossier <strong>est recevable</strong>
                  </p>
                ),
                nativeInputProps: {
                  ...register("decision"),
                  value: "ADMISSIBLE",
                },
              },
              {
                label: (
                  <p className="mb-0 text-base">
                    Ce dossier est <strong>non recevable</strong>
                  </p>
                ),
                hintText:
                  "Est considéré comme non recevable un dossier complet affichant des expériences qui ne correspondent pas au référentiel de la certification (ou bloc) visée. Si le dossier n’est pas recevable, le candidat ne pourra plus demander de recevabilité sur cette certification durant l’année civile en cours.",
                nativeInputProps: {
                  ...register("decision"),
                  value: "REJECTED",
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
            label={
              <span className="text-base">
                Pouvez-vous préciser les motifs de cette décision ?{" "}
                {decision === "ADMISSIBLE" ? "(optionnel)" : ""}
              </span>
            }
            nativeTextAreaProps={register("comment")}
            state={errors.comment ? "error" : "default"}
            stateRelatedMessage={errors.comment?.message}
          />
          <FancyUpload
            title="Joindre le courrier de recevabilité (optionnel)"
            description="Ce courrier sera joint au message envoyé au candidat."
            hint="Formats supportés : pdf avec un poids maximum de 2Mo"
            nativeInputProps={register("infoFile")}
            state={errors.infoFile ? "error" : "default"}
            stateRelatedMessage={errors.infoFile?.[0]?.message}
          />
        </fieldset>
        <br />
        <FormButtons
          backUrl="/candidacies/annuaire"
          formState={{ isSubmitting, isDirty }}
        />
      </form>
      <DecisionWarningModal
        onSubmit={handleFormSubmit}
        isDecisionAdmissible={isDecisionAdmissible}
        candidateName={candidateName}
        certificationName={certificationName}
      />
    </>
  );
};
