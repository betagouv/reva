"use client";
import Button from "@codegouvfr/react-dsfr/Button";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import Input from "@codegouvfr/react-dsfr/Input";
import Stepper from "@codegouvfr/react-dsfr/Stepper";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import z from "zod";

import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { errorToast } from "@/components/toast/toast";
import { sanitizedText } from "@/utils/input-sanitization";

import { JuryResult } from "@/graphql/generated/graphql";

import { DepotDvResourcesSection } from "./DepotDvResourcesSection";

const maxFileSizeMb = 10;
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
const acceptedFileTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
];
const acceptedFileExtensions = ".jpg,.jpeg,.png,.pdf";
const fileUploadHintText =
  "Le format de fichier n’est pas supporté. Essayez avec un .jpg, .png ou .pdf.";

const fileValidationErrors = {
  required: "Vous devez sélectionner un fichier à transmettre.",
  tooLarge: `Le fichier que vous tentez d’envoyer est trop volumineux. Veuillez soumettre un fichier d’une taille inférieur à ${maxFileSizeMb}Mo.`,
  wrongType:
    "Le format de fichier n'est pas supporté. Essayez avec un .jpg, .png ou .pdf.",
};

const STEP_TITLES = {
  "dossier-de-validation": "Dépot du dossier",
  "special-needs": "Demande d’aménagement spécifique du jury",
  confirmation: "Vérification, validation et envoi",
};

function createFileValidation(options: { isRequired: true }): z.ZodType<File>;
function createFileValidation(options: {
  isRequired: false;
}): z.ZodType<File | undefined>;
function createFileValidation(
  options: { isRequired: boolean } = { isRequired: true },
): z.ZodType<File> | z.ZodType<File | undefined> {
  const validation = z
    .instanceof(File, {
      message: fileValidationErrors.required,
    })
    .refine((file) => file.size <= maxFileSizeBytes, {
      message: fileValidationErrors.tooLarge,
    })
    .refine((file) => acceptedFileTypes.includes(file.type), {
      message: fileValidationErrors.wrongType,
    });

  return options.isRequired ? validation : validation.optional();
}

const dossierDeValidationSchema = z.object({
  dossierDeValidationCheck1: z.literal(true, {
    errorMap: () => ({
      message: "Veuillez cocher toutes les cases.",
    }),
  }),
  dossierDeValidationCheck2: z.literal(true, {
    errorMap: () => ({
      message: "Veuillez cocher toutes les cases.",
    }),
  }),
  amenagementSpecifiqueCheck: z.boolean().optional(),
  dossierDeValidationFile: z.object({
    0: createFileValidation({ isRequired: true }),
  }),

  dossierDeValidationOtherFiles: z
    .object({
      0: createFileValidation({ isRequired: false }),
    })
    .array(),
  amenagementSpecifiqueDescription: z.string().optional(),
  amenagementSpecifiqueFile: z.object({
    0: createFileValidation({ isRequired: false }),
  }),
});

const dossierDeValidationSchemaFiles = z.object({
  dossierDeValidationFile: z.object({
    0: createFileValidation({ isRequired: true }),
  }),
  dossierDeValidationOtherFiles: z
    .object({
      0: createFileValidation({ isRequired: false }),
    })
    .array(),
});

const dossierDeValidationSchemaAmenagement = z.object({
  amenagementSpecifiqueDescription: sanitizedText({
    minLength: 10,
    maxLength: 10000,
  }),
  amenagementSpecifiqueFile: z.object({
    0: createFileValidation({ isRequired: true }),
  }),
});

export type DossierDeValidationFormData = z.infer<
  typeof dossierDeValidationSchema
>;

export const DepotDvForm = ({
  needsAmenagement,
  onSubmit,
  certification,
}: {
  needsAmenagement: boolean;
  dossierDeValidation?: {
    id: string;
    decision?: string | null;
    dossierDeValidationSentAt?: number | null;
    dossierDeValidationFile?: {
      name: string;
      previewUrl?: string | null;
    } | null;
    dossierDeValidationOtherFiles: {
      name: string;
      previewUrl?: string | null;
    }[];
    amenagementSpecifique?: {
      justificationFile?: {
        name: string;
        previewUrl?: string | null;
      } | null;
      justificationDescription?: string | null;
    } | null;
  } | null;
  dossierDeValidationProblems: {
    decisionSentAt: Date;
    decisionComment: string;
  }[];
  jury?: {
    result?: JuryResult | null;
    informationOfResult?: string | null;
    dateOfResult?: number | null;
    dateOfSession?: number | null;
  } | null;
  hasFailedJuryResult?: boolean;
  onSubmit: (data: DossierDeValidationFormData) => Promise<void>;
  certification: {
    id: string;
    label: string;
  } | null;
}) => {
  const router = useRouter();
  const {
    register,
    reset,
    control,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DossierDeValidationFormData>({
    resolver: zodResolver(dossierDeValidationSchema),
    shouldUnregister: false,
    defaultValues: {
      dossierDeValidationOtherFiles: [],
      amenagementSpecifiqueFile: {
        0: undefined,
      },
    },
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const steps = useMemo(() => {
    return (
      [
        "dossier-de-validation",
        needsAmenagement ? "special-needs" : null,
        "confirmation",
      ] as const
    ).filter((step) => step !== null);
  }, [needsAmenagement]);
  const currentStep = steps[currentStepIndex];

  const {
    fields: dossierDeValidationOtherFilesFields,
    insert: insertDossierDeValidationOtherFiles,
    remove: removeDossierDeValidationOtherFiles,
  } = useFieldArray({
    name: "dossierDeValidationOtherFiles",
    control,
  });

  const handleReset = useCallback(() => {
    reset({ dossierDeValidationOtherFiles: [] });
  }, [reset]);

  const maxAdditionalFiles = 8;
  const isMaxAdditionalFiles =
    dossierDeValidationOtherFilesFields.length >= maxAdditionalFiles;

  const handleAddAdditionalFile = useCallback(() => {
    if (!isMaxAdditionalFiles) {
      insertDossierDeValidationOtherFiles(
        dossierDeValidationOtherFilesFields.length,
        [{}],
      );
    } else {
      errorToast(
        `Vous ne pouvez pas ajouter plus de ${maxAdditionalFiles} pièces jointes supplémentaires.`,
      );
    }
  }, [
    insertDossierDeValidationOtherFiles,
    dossierDeValidationOtherFilesFields.length,
    isMaxAdditionalFiles,
  ]);

  const handleFormSubmit = handleSubmit(onSubmit);

  const dossierDeValidationSchemaCheckboxes = z.object({
    dossierDeValidationCheck1: z.literal(true, {
      errorMap: () => ({
        message: "Veuillez cocher toutes les cases.",
      }),
    }),
    dossierDeValidationCheck2: z.literal(true, {
      errorMap: () => ({
        message: "Veuillez cocher toutes les cases.",
      }),
    }),
    ...(needsAmenagement
      ? {
          amenagementSpecifiqueCheck: z.literal(true, {
            errorMap: () => ({
              message: "Veuillez cocher toutes les cases.",
            }),
          }),
        }
      : {}),
  });

  return (
    <div className="flex flex-col">
      <div className="flex gap-6">
        <main className="flex-1">
          <Stepper
            stepCount={steps.length}
            currentStep={currentStepIndex + 1}
            title={STEP_TITLES[currentStep as keyof typeof STEP_TITLES]}
            nextTitle={
              STEP_TITLES[
                steps[currentStepIndex + 1] as keyof typeof STEP_TITLES
              ]
            }
          />
          <form
            className="flex flex-col flex-1 mb-2"
            onSubmit={handleFormSubmit}
            onReset={(e) => {
              e.preventDefault();
              handleReset();
            }}
          >
            <div className="flex flex-row gap-6">
              <div className="flex-1 basis-9/12">
                <div className="flex flex-col gap-6 mb-8">
                  {currentStep === "dossier-de-validation" && (
                    <>
                      <FancyUpload
                        className="dossier-de-validation-file-upload"
                        title="Joindre le dossier de validation"
                        description="Si vous souhaitez déposer une attestation de transmission / finalisation du DV : vous pouvez déposer cette pièce ici."
                        hint={fileUploadHintText}
                        nativeInputProps={{
                          ...register("dossierDeValidationFile"),
                          accept: acceptedFileExtensions,
                        }}
                        state={
                          errors.dossierDeValidationFile?.[0]
                            ? "error"
                            : "default"
                        }
                        stateRelatedMessage={
                          errors.dossierDeValidationFile?.[0]?.message
                        }
                      />
                      {dossierDeValidationOtherFilesFields.map((d, i) => (
                        <FancyUpload
                          key={d.id}
                          title="Joindre des pièces supplémentaires (optionnel)"
                          hint={fileUploadHintText}
                          nativeInputProps={{
                            ...register(`dossierDeValidationOtherFiles.${i}`, {
                              onChange: (e) => {
                                if (!e.target.value) {
                                  removeDossierDeValidationOtherFiles(i);
                                }
                              },
                            }),
                            accept: acceptedFileExtensions,
                          }}
                          onClickDelete={() =>
                            removeDossierDeValidationOtherFiles(i)
                          }
                          state={
                            errors.dossierDeValidationOtherFiles?.[i]
                              ? "error"
                              : "default"
                          }
                          stateRelatedMessage={
                            errors.dossierDeValidationOtherFiles?.[i]?.[0]
                              ?.message
                          }
                        />
                      ))}
                      <div>
                        <hr className="pb-3" />
                        <Button
                          priority="tertiary no outline"
                          iconId="fr-icon-add-line"
                          onClick={handleAddAdditionalFile}
                          type="button"
                          disabled={isMaxAdditionalFiles}
                        >
                          Ajouter une pièce jointe supplémentaire
                        </Button>
                      </div>
                    </>
                  )}
                  {currentStep === "special-needs" && (
                    <div className="flex flex-col gap-2">
                      <Input
                        textArea
                        label="Besoin d’un aménagement spécifique pour le passage devant le jury :"
                        hintText="Décrivez les aménagements dont vous souhaitez bénéficier lors du passage devant le jury pour son bon déroulement. Ces informations seront transmises au certificateur avec le dossier de validation. Il examinera votre demande."
                        nativeTextAreaProps={{
                          rows: 10,
                          ...register("amenagementSpecifiqueDescription"),
                        }}
                        state={
                          errors.amenagementSpecifiqueDescription
                            ? "error"
                            : "default"
                        }
                        stateRelatedMessage={
                          errors.amenagementSpecifiqueDescription?.message
                        }
                      />
                      <FancyUpload
                        title="Joindre le justificatif"
                        description="Ce document ne sera pas conservé par France VAE"
                        hint="Formats supportés : jpg, png, pdf avec un poids maximum de 15Mo"
                        nativeInputProps={{
                          ...register("amenagementSpecifiqueFile"),
                          accept: acceptedFileExtensions,
                        }}
                        state={
                          errors.amenagementSpecifiqueFile?.[0]
                            ? "error"
                            : "default"
                        }
                        stateRelatedMessage={
                          errors.amenagementSpecifiqueFile?.[0]?.message
                        }
                      />
                    </div>
                  )}
                  {currentStep === "confirmation" && (
                    <Checkbox
                      className="mr-0"
                      legend="Avant de finaliser votre envoi"
                      data-testid="dossier-de-validation-checkbox-group"
                      options={[
                        {
                          label:
                            "J'ai bien vérifié que le dossier de validation était complet et lisible.",
                          nativeInputProps: {
                            ...register("dossierDeValidationCheck1"),
                          },
                        },
                        {
                          label:
                            "J'ai bien vérifié que toutes les pièces supplémentaires étaient lisibles",
                          nativeInputProps: {
                            ...register("dossierDeValidationCheck2"),
                          },
                        },
                        needsAmenagement
                          ? {
                              label:
                                "J’ai bien vérifié que le justificatif d’aménagement était lisible et valable.",
                              nativeInputProps: {
                                ...register("amenagementSpecifiqueCheck"),
                              },
                            }
                          : undefined,
                      ].filter((option) => option !== undefined)}
                      small
                      state={
                        errors.dossierDeValidationCheck1 ||
                        errors.dossierDeValidationCheck2 ||
                        errors.amenagementSpecifiqueCheck
                          ? "error"
                          : "default"
                      }
                      stateRelatedMessage={
                        errors.dossierDeValidationCheck1?.message ||
                        errors.dossierDeValidationCheck2?.message ||
                        errors.amenagementSpecifiqueCheck?.message
                      }
                    />
                  )}
                </div>
              </div>
              <div className="basis-3/12">
                <DepotDvResourcesSection certification={certification} />
              </div>
            </div>
            {currentStep === "confirmation" && (
              <div className="flex flex-row gap-4 justify-between mt-8">
                <Button
                  priority="secondary"
                  type="button"
                  onClick={() => {
                    if (currentStepIndex > 0) {
                      setCurrentStepIndex(currentStepIndex - 1);
                    } else {
                      router.push("../");
                    }
                  }}
                >
                  Précédent
                </Button>
                <Button
                  priority="primary"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    const result =
                      dossierDeValidationSchemaCheckboxes.safeParse(
                        getValues(),
                      );
                    if (!result.success) {
                      result.error.errors.forEach((error) => {
                        const path = error.path.join(".");
                        setError(path as keyof DossierDeValidationFormData, {
                          message: error.message,
                        });
                      });
                      return;
                    }
                    handleFormSubmit();
                  }}
                >
                  Enregistrer
                </Button>
              </div>
            )}
            {currentStep !== "confirmation" && (
              <div className="flex flex-row gap-4 justify-between">
                <Button
                  priority="secondary"
                  type="button"
                  onClick={() => {
                    if (currentStepIndex > 0) {
                      setCurrentStepIndex(currentStepIndex - 1);
                    } else {
                      router.push("../");
                    }
                  }}
                >
                  Précédent
                </Button>
                <Button
                  priority="primary"
                  type="button"
                  onClick={() => {
                    let schemaToUse = null;
                    if (currentStep === "dossier-de-validation") {
                      schemaToUse = dossierDeValidationSchemaFiles;
                    } else if (currentStep === "special-needs") {
                      schemaToUse = dossierDeValidationSchemaAmenagement;
                    }
                    const result = schemaToUse?.safeParse(getValues());
                    if (!result?.success) {
                      result?.error?.errors.forEach((error) => {
                        const path = error.path.join(".");
                        setError(path as keyof DossierDeValidationFormData, {
                          message: error.message,
                        });
                      });
                      return;
                    }
                    setCurrentStepIndex(currentStepIndex + 1);
                  }}
                >
                  Suivant
                </Button>
              </div>
            )}
          </form>
        </main>
      </div>
    </div>
  );
};
