import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useCallback } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { FormButtons } from "@/components/form/form-footer/FormButtons";

import { DossierDeValidationType } from "../types";

import { DossierDeValidationCard } from "./DossierDeValidationCard";
import { HistoryDossierDeValidationView } from "./HistoryDossierDeValidationView";

const dossierDeValidationSchema = z.object({
  dossierDeValidationChecked: z.literal(true, {
    error: "Veuillez cocher la case",
  }),
  dossierDeValidationFile: z.object({
    0: z.instanceof(File, { message: "Merci de remplir ce champ" }),
  }),

  dossierDeValidationOtherFiles: z
    .object({
      0: z.undefined().or(z.instanceof(File)),
    })
    .array(),
});

export type DossierDeValidationFormData = z.infer<
  typeof dossierDeValidationSchema
>;

interface Props {
  dossierDeValidation?: DossierDeValidationType;
  historyDossierDeValidation: DossierDeValidationType[];
  onFormSubmit: (data: DossierDeValidationFormData) => Promise<void>;
}

export const DossierDeValidationTab = (props: Props) => {
  const { dossierDeValidation, historyDossierDeValidation, onFormSubmit } =
    props;

  const {
    register,
    reset,
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<DossierDeValidationFormData>({
    resolver: standardSchemaResolver(dossierDeValidationSchema),
    shouldUnregister: true,
    defaultValues: { dossierDeValidationOtherFiles: [{ 0: undefined }] },
  });

  const {
    fields: dossierDeValidationOtherFilesFields,
    insert: insertDossierDeValidationOtherFiles,
    remove: removeDossierDeValidationOtherFiles,
  } = useFieldArray({
    name: "dossierDeValidationOtherFiles",
    control,
  });

  const maxAdditionalFiles = 8;
  const isMaxAdditionalFiles =
    dossierDeValidationOtherFilesFields.length >= maxAdditionalFiles;

  const handleReset = useCallback(() => {
    reset({ dossierDeValidationOtherFiles: [{ 0: undefined }] });
  }, [reset]);

  const handleFormSubmit = handleSubmit(onFormSubmit);
  return (
    <form
      className="flex flex-col flex-1 overflow-auto"
      onSubmit={handleFormSubmit}
      onReset={(e) => {
        e.preventDefault();
        handleReset();
      }}
    >
      <div className="flex flex-col gap-10">
        <p className="m-0">
          Le dossier de validation doit être rédigé par le candidat. Des pièces
          supplémentaires peuvent être ajoutées selon les attendus du
          certificateur (ex : attestation de premiers secours).
        </p>

        <HistoryDossierDeValidationView
          historyDossierDeValidation={
            dossierDeValidation &&
            (dossierDeValidation.decision == "PENDING" ||
              dossierDeValidation.decision == "COMPLETE")
              ? [...historyDossierDeValidation, dossierDeValidation]
              : historyDossierDeValidation
          }
        />

        {dossierDeValidation?.decision == "INCOMPLETE" && (
          <>
            <Alert
              severity="error"
              title="Dossier de validation signalé par le certificateur"
              description={
                <p>
                  Ce dossier de validation a été signalé comme comportant des
                  erreurs par le certificateur. Les détails du signalement sont
                  disponibles ci-dessous.
                  <br />
                  Merci de retourner rapidement un dossier corrigé.
                </p>
              }
            />

            <DossierDeValidationCard
              dossierDeValidation={dossierDeValidation}
            />

            <hr className="p-0 h-[1px]" />
          </>
        )}

        <div className="flex flex-col gap-4">
          <FancyUpload
            title="Joindre le dossier de validation"
            hint="Format supporté : PDF uniquement avec un poids maximum de 10Mo"
            nativeInputProps={{
              ...register("dossierDeValidationFile"),
              accept: ".pdf",
            }}
            state={errors.dossierDeValidationFile ? "error" : "default"}
            stateRelatedMessage={errors.dossierDeValidationFile?.[0]?.message}
          />
          {dossierDeValidationOtherFilesFields.map((d, i) => (
            <FancyUpload
              key={d.id}
              title="Joindre des pièces supplémentaires (optionnel)"
              hint="Format supporté : PDF uniquement avec un poids maximum de 10Mo"
              nativeInputProps={{
                ...register(`dossierDeValidationOtherFiles.${i}`, {
                  onChange: (e) => {
                    if (e.target.value) {
                      //if the file input has a value and it was the last empty one we add another empty file input
                      if (
                        i == dossierDeValidationOtherFilesFields.length - 1 &&
                        !isMaxAdditionalFiles
                      ) {
                        insertDossierDeValidationOtherFiles(
                          dossierDeValidationOtherFilesFields.length,
                          [{ 0: undefined }],
                        );
                      }
                    } else {
                      removeDossierDeValidationOtherFiles(i);
                    }
                  },
                }),
                accept: ".pdf",
              }}
              state={
                errors.dossierDeValidationOtherFiles?.[i] ? "error" : "default"
              }
              stateRelatedMessage={
                errors.dossierDeValidationOtherFiles?.[i]?.message
              }
            />
          ))}
        </div>
        <Checkbox
          options={[
            {
              label:
                "J’ai bien vérifié que le dossier de validation était complet, signé et lisible.",
              nativeInputProps: { ...register("dossierDeValidationChecked") },
            },
          ]}
          state={errors.dossierDeValidationChecked ? "error" : "default"}
          stateRelatedMessage={errors.dossierDeValidationChecked?.message}
          className="mr-0"
        />
      </div>

      <FormButtons
        formState={{ isDirty, isSubmitting }}
        submitButtonLabel="Envoyer"
      />
    </form>
  );
};
