import Accordion from "@codegouvfr/react-dsfr/Accordion";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, toDate } from "date-fns";
import { useCallback } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { GrayCard } from "@/components/card/gray-card/GrayCard";
import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { errorToast } from "@/components/toast/toast";

import { JuryResult } from "@/graphql/generated/graphql";

import { ResourcesSection } from "../../ResourcesSection";

import { PreviousDossierAccordion } from "./PreviousDossierAccordion";

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
  dossierDeValidationFile: z.object({
    0: createFileValidation({ isRequired: true }),
  }),

  dossierDeValidationOtherFiles: z
    .object({
      0: createFileValidation({ isRequired: false }),
    })
    .array(),
});

export type DossierDeValidationFormData = z.infer<
  typeof dossierDeValidationSchema
>;

export const DossierDeValidationTab = ({
  dossierDeValidation,
  dossierDeValidationProblems,
  certification,
  jury,
  hasFailedJuryResult,
  onSubmit,
}: {
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
  } | null;
  dossierDeValidationProblems: {
    decisionSentAt: Date;
    decisionComment: string;
  }[];
  certification: {
    id: string;
    label: string;
    additionalInfo?: {
      dossierDeValidationTemplate?: {
        previewUrl?: string | null;
      } | null;
      dossierDeValidationLink?: string | null;
    } | null;
  } | null;
  jury?: {
    result?: JuryResult | null;
    informationOfResult?: string | null;
    dateOfResult?: number | null;
    dateOfSession?: number | null;
  } | null;
  hasFailedJuryResult?: boolean;
  onSubmit: (data: DossierDeValidationFormData) => Promise<void>;
}) => {
  const {
    register,
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DossierDeValidationFormData>({
    resolver: zodResolver(dossierDeValidationSchema),
    shouldUnregister: true,
    defaultValues: { dossierDeValidationOtherFiles: [] },
  });

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

  const [currentProblem, ...previousProblems] = dossierDeValidationProblems;

  return (
    <div className="flex flex-col">
      {hasFailedJuryResult && (
        <>
          <Alert
            severity="info"
            className="mb-6"
            title={`Vous n’avez pas validé la totalité de votre VAE à la suite de votre passage devant le jury${jury?.dateOfSession ? ` le ${format(toDate(jury.dateOfSession), "dd/MM/yyyy")}` : ""}`}
            description={
              <div className="flex flex-col gap-4">
                {jury?.informationOfResult && (
                  <p>
                    <strong>Motif énoncé par le certificateur :</strong>{" "}
                    {jury.informationOfResult}
                  </p>
                )}
                <p>
                  Suite à ce résultat, vous pouvez repasser devant le jury. Vous
                  devrez, en amont, retravailler sur le dossier de validation et
                  le renvoyer afin de le faire parvenir au certificateur. Une
                  fois reçu, le certificateur pourra vous transmettre une
                  nouvelle date de passage devant le jury. Vous pouvez dès à
                  présent fournir une date prévisionnelle de dépot de dossier.
                </p>
                <p>
                  Ce passage n'est pas une obligation et reste à votre libre
                  choix. N'hésitez pas à vous rapprocher de votre certificateur
                  pour avoir plus de détails et connaître les délais.
                </p>
              </div>
            }
          />
          {dossierDeValidation?.dossierDeValidationSentAt && (
            <PreviousDossierAccordion
              dossierDeValidation={dossierDeValidation}
              juryDateOfResult={jury?.dateOfResult}
            />
          )}
        </>
      )}

      {dossierDeValidation?.decision === "INCOMPLETE" && currentProblem && (
        <>
          <Alert
            data-testid="dossier-de-validation-signale-alert"
            className="mb-6"
            severity="warning"
            title={`Dossier de validation signalé par le certificateur le ${format(currentProblem.decisionSentAt, "dd/MM/yyyy")}`}
            description={
              <div className="flex flex-col gap-6">
                <p>
                  Ce dossier de validation a été signalé comme comportant des
                  erreurs par le certificateur.
                </p>
                <p>
                  <span className="font-semibold">Motif du signalement : </span>
                  {currentProblem.decisionComment}
                </p>
                <p className="font-semibold">
                  Nous vous invitons à retourner dès que possible un dossier
                  corrigé.
                </p>
              </div>
            }
          />
          {previousProblems.length > 0 && (
            <div className="fr-accordions-group mb-6">
              <Accordion label="Voir les anciens dossiers de validation">
                <ul className="flex flex-col gap-8 pl-0">
                  {previousProblems.map((p, i) => (
                    <GrayCard key={i}>
                      <dl>
                        <dt className="font-bold text-xl">Dossier signalé :</dt>
                        <dd>
                          Dossier signalé le{" "}
                          {format(p.decisionSentAt, "dd/MM/yyyy")}
                        </dd>
                        <br />
                        <dt className="font-bold text-xl">
                          Motif du signalement :
                        </dt>
                        <dd>{p.decisionComment}</dd>
                      </dl>
                    </GrayCard>
                  ))}
                </ul>
              </Accordion>
            </div>
          )}
        </>
      )}

      <div className="flex gap-6">
        <main className="flex-1">
          <h2>Déposer votre dossier de validation complété</h2>
          <p className="text-lg">
            Une fois votre dossier complété, déposez-le ici. Si des pièces
            supplémentaires sont requises (ex : attestation de premiers
            secours), elles seront également à envoyer ici en pièces jointes
            supplémentaires.
          </p>
          <form
            className="flex flex-col flex-1 mb-2"
            onSubmit={handleFormSubmit}
            onReset={(e) => {
              e.preventDefault();
              handleReset();
            }}
          >
            <div className="flex flex-col gap-6 mb-12">
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
                  errors.dossierDeValidationFile?.[0] ? "error" : "default"
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
                  onClickDelete={() => removeDossierDeValidationOtherFiles(i)}
                  state={
                    errors.dossierDeValidationOtherFiles?.[i]
                      ? "error"
                      : "default"
                  }
                  stateRelatedMessage={
                    errors.dossierDeValidationOtherFiles?.[i]?.[0]?.message
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
            </div>
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
              ]}
              small
              state={
                errors.dossierDeValidationCheck1 ||
                errors.dossierDeValidationCheck2
                  ? "error"
                  : "default"
              }
              stateRelatedMessage={
                errors.dossierDeValidationCheck1?.message ||
                errors.dossierDeValidationCheck2?.message
              }
            />
            <div className="flex justify-end gap-2">
              <Button
                priority="tertiary no outline"
                type="reset"
                disabled={isSubmitting}
              >
                Réinitialiser
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="submit-dossier-de-validation-form-button"
              >
                Envoyer les documents
              </Button>
            </div>
          </form>
        </main>

        <ResourcesSection certification={certification} />
      </div>
    </div>
  );
};
