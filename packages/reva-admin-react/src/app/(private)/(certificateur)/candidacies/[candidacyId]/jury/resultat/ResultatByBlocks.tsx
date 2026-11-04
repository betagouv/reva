"use client";

import { Button } from "@codegouvfr/react-dsfr/Button";
import CallOut from "@codegouvfr/react-dsfr/CallOut";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { Input } from "@codegouvfr/react-dsfr/Input";
import RadioButtons from "@codegouvfr/react-dsfr/RadioButtons";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { isAfter, startOfDay } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth";
import { CertificationCard } from "@/components/card/certification-card/CertificationCard";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast } from "@/components/toast/toast";
import { sanitizedOptionalTextAllowSpecialCharacters } from "@/utils/input-sanitization";

import { JuryResult } from "@/graphql/generated/graphql";

import {
  ConfirmJuryResultModal,
  confirmResultModal,
} from "./_components/ConfirmJuryResultModal";
import {
  FeasibilityCompetenceBlocksModal,
  feasibilityCompetenceBlocksModal,
} from "./_components/FeasibilityCompetenceBlocksModal";
import { HistoryResultatView } from "./_components/HistoryResultatView";
import { ResultatCardWithBlocks } from "./_components/ResultatCardWithBlocks";
import {
  resultInconsistencyErrorModal,
  ResultInconsistencyErrorModal,
  ResultInconsistencyType,
} from "./_components/ResultInconsistencyErrorModal";
import {
  RevokeJuryDecisionModal,
  revokeJuryDecisionModal,
} from "./_components/RevokeJuryDecisionModal";
import { useJuryResultPageLogic } from "./juryResultPageLogic";
const juryResultOptions: {
  [key in JuryResult]: { label: string; hintText?: string };
} = {
  FULL_SUCCESS_OF_FULL_CERTIFICATION: {
    label: "Tous les blocs visés ont été validés pour ce jury",
    hintText:
      "Le candidat a validé l'ensemble des blocs pour lesquels il est recevable. Son parcours de VAE est terminé pour cette candidature.",
  },
  PARTIAL_SUCCESS_OF_FULL_CERTIFICATION: {
    label: "Certains blocs visés ont été validés pour ce jury",
    hintText:
      "Le candidat a validé une partie des blocs pour lesquels il est recevable. Il pourra redéposer un dossier de validation pour les blocs restants.",
  },
  FULL_SUCCESS_OF_PARTIAL_CERTIFICATION: {
    label: "Tous les blocs visés ont été validés pour ce jury",
    hintText:
      "Le candidat a validé l'ensemble des blocs pour lesquels il est recevable. Son parcours de VAE est terminé pour cette candidature.",
  },
  PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION: {
    label: "Certains blocs visés ont été validés pour ce jury",
    hintText:
      "Le candidat a validé une partie des blocs pour lesquels il est recevable. Il pourra redéposer un dossier de validation pour les blocs restants.",
  },
  PARTIAL_SUCCESS_PENDING_CONFIRMATION: {
    label:
      "Réussite partielle (sous reserve de confirmation par un certificateur)",
    hintText:
      "Réussite partielle (sous reserve de confirmation par un certificateur)",
  },
  FAILURE: {
    label: "Aucun bloc visé n’a été validé pour ce jury",
    hintText:
      "Le candidat n'a validé aucun des blocs  pour lesquels il est recevable. ",
  },
  CANDIDATE_EXCUSED: {
    label: "Candidat excusé sur justificatif pour ce jury",
  },
  CANDIDATE_ABSENT: {
    label: "Candidat non présent pour ce jury",
  },
};

// Options communes à tous les types de certification
const COMMON_OPTIONS = [
  "FAILURE",
  "CANDIDATE_EXCUSED",
  "CANDIDATE_ABSENT",
] as const;

// Options spécifiques à la certification partielle
const PARTIAL_CERTIFICATION_OPTIONS = [
  "FULL_SUCCESS_OF_PARTIAL_CERTIFICATION",
  "PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION",
  ...COMMON_OPTIONS,
] as const;

// Options spécifiques à la certification totale
const FULL_CERTIFICATION_OPTIONS = [
  "FULL_SUCCESS_OF_FULL_CERTIFICATION",
  "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION",
  ...COMMON_OPTIONS,
] as const;

const ALL_OPTIONS = [
  "FULL_SUCCESS_OF_PARTIAL_CERTIFICATION",
  "PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION",
  "FULL_SUCCESS_OF_FULL_CERTIFICATION",
  "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION",
  ...COMMON_OPTIONS,
] as const;

type ResultatFormData = {
  result:
    | "FULL_SUCCESS_OF_FULL_CERTIFICATION"
    | "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION"
    | "FULL_SUCCESS_OF_PARTIAL_CERTIFICATION"
    | "PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION"
    | "FAILURE"
    | "CANDIDATE_EXCUSED"
    | "CANDIDATE_ABSENT";
  informationOfResult: string;
  validatedBlocks: string[];
};

const revokeSchema = z.object({
  reason: sanitizedOptionalTextAllowSpecialCharacters(),
});

type RevokeFormData = z.infer<typeof revokeSchema>;

export const ResultatByBlocks = () => {
  const { getCandidacy, updateJuryResult, revokeJuryDecision } =
    useJuryResultPageLogic();
  const { isAdmin } = useAuth();
  const candidacy = getCandidacy.data?.getCandidacyById;

  const previouslyValidatedBlocksIds = useMemo(() => {
    return (
      candidacy?.jury?.previouslyValidatedBlocks?.map((block) => block.id) || []
    );
  }, [candidacy?.jury?.previouslyValidatedBlocks]);

  const blocksTargetedForThisSession = useMemo(() => {
    return (
      candidacy?.feasibility?.dematerializedFeasibilityFile?.blocsDeCompetences.filter(
        (block) =>
          !previouslyValidatedBlocksIds.includes(
            block.certificationCompetenceBloc.id,
          ),
      ) || []
    );
  }, [
    candidacy?.feasibility?.dematerializedFeasibilityFile?.blocsDeCompetences,
    previouslyValidatedBlocksIds,
  ]);

  const schema = useMemo(
    () =>
      z
        .object({
          result: z.enum(ALL_OPTIONS),
          informationOfResult: sanitizedOptionalTextAllowSpecialCharacters(),
          validatedBlocks: z.array(z.string()),
        })
        .superRefine((data, ctx) => {
          if (
            (data.result === "FULL_SUCCESS_OF_FULL_CERTIFICATION" ||
              data.result === "FULL_SUCCESS_OF_PARTIAL_CERTIFICATION" ||
              data.result === "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION" ||
              data.result === "PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION") &&
            data.validatedBlocks.length === 0
          ) {
            ctx.addIssue({
              code: "custom",
              message:
                "NO_BLOCKS_CHECKED_FOR_SUCCESS_RESULT" as ResultInconsistencyType,
              path: ["validatedBlocks"],
            });
          }
          if (
            (data.result === "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION" ||
              data.result === "PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION") &&
            data.validatedBlocks.length === blocksTargetedForThisSession.length
          ) {
            ctx.addIssue({
              code: "custom",
              message:
                "ALL_BLOCKS_CHECKED_FOR_PARTIAL_RESULT" as ResultInconsistencyType,
              path: ["validatedBlocks"],
            });
          }
        }),
    [blocksTargetedForThisSession],
  );

  let availableResultOptions: JuryResult[] = [];
  if (candidacy?.typeAccompagnement === "AUTONOME") {
    availableResultOptions = [...ALL_OPTIONS];
  } else if (
    candidacy?.typeAccompagnement === "ACCOMPAGNE" &&
    candidacy?.isCertificationPartial
  ) {
    availableResultOptions = [...PARTIAL_CERTIFICATION_OPTIONS];
  } else if (
    candidacy?.typeAccompagnement === "ACCOMPAGNE" &&
    !candidacy?.isCertificationPartial
  ) {
    availableResultOptions = [...FULL_CERTIFICATION_OPTIONS];
  }
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
    control,
  } = useForm<ResultatFormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      validatedBlocks: [],
    },
    mode: "onChange",
  });

  const {
    register: revokeRegister,
    handleSubmit: handleRevokeSubmit,
    formState: { isSubmitting: isRevokeSubmitting },
    reset: resetRevokeForm,
  } = useForm<RevokeFormData>({
    resolver: standardSchemaResolver(revokeSchema),
  });

  const handleFormSubmit = handleSubmit(
    () => {
      confirmResultModal.open();
    },
    (errors) => {
      if (errors.validatedBlocks) {
        resultInconsistencyErrorModal.open();
        return;
      }
    },
  );

  const resultSelected = useWatch({ name: "result", control });

  useEffect(() => {
    if (
      (resultSelected === "FULL_SUCCESS_OF_FULL_CERTIFICATION" ||
        resultSelected === "FULL_SUCCESS_OF_PARTIAL_CERTIFICATION") &&
      blocksTargetedForThisSession
    ) {
      setValue(
        "validatedBlocks",
        blocksTargetedForThisSession.map(
          (block) => block.certificationCompetenceBloc.id,
        ),
        { shouldValidate: true },
      );
    } else if (
      (resultSelected === "FAILURE" ||
        resultSelected === "CANDIDATE_EXCUSED" ||
        resultSelected === "CANDIDATE_ABSENT") &&
      blocksTargetedForThisSession
    ) {
      setValue("validatedBlocks", [], { shouldValidate: true });
    }
  }, [resultSelected, setValue, blocksTargetedForThisSession]);

  const formData = getValues();
  const submitData = async () => {
    confirmResultModal.close();
    if (candidacy?.jury?.id) {
      try {
        await updateJuryResult.mutateAsync({
          juryId: candidacy.jury.id,
          input: {
            result: formData.result,
            informationOfResult: formData.informationOfResult,
            juryResultByCompetenceBlocs: blocksTargetedForThisSession?.map(
              (block) => ({
                competenceBlocId: block.certificationCompetenceBloc.id,
                isCompetenceBlocValidated: formData.validatedBlocks.includes(
                  block.certificationCompetenceBloc.id,
                ),
              }),
            ),
          },
        });
      } catch (error) {
        console.error(error);
        graphqlErrorToast(error);
      }
    }
  };

  const handleRevokeDecision = handleRevokeSubmit(async (data) => {
    if (candidacy?.jury?.id) {
      try {
        await revokeJuryDecision.mutateAsync({
          juryId: candidacy.jury.id,
          reason: data.reason,
        });
        revokeJuryDecisionModal.close();
        resetRevokeForm();
      } catch (error) {
        graphqlErrorToast(error);
      }
    }
  });

  if (getCandidacy.isLoading || !candidacy) {
    return null;
  }

  const jury = candidacy?.jury;
  const historyJury = candidacy?.historyJury;

  const result = jury?.result;

  const editable = candidacy?.jury
    ? isAfter(new Date(), startOfDay(candidacy?.jury.dateOfSession)) && !result
    : false;

  return (
    <>
      <h1>Résultat de jury</h1>
      <FormOptionalFieldsDisclaimer />

      <div className="flex flex-col gap-10">
        {!result && (
          <p className="m-0 text-gray-600">
            Ce résultat sera communiqué par e-mail au candidat et à son
            accompagnateur le cas échéant.
          </p>
        )}

        <CertificationCard certification={candidacy?.certification} />
        {historyJury && (
          <HistoryResultatView
            historyJury={historyJury.map((jury) => ({
              id: jury.id,
              dateOfSession: jury.dateOfSession,
              result: jury.result!,
              informationOfResult: jury.informationOfResult,
              juryResultByCompetenceBlocs: jury.juryResultByCompetenceBlocs,
            }))}
            previouslyValidatedBlocks={
              candidacy?.jury?.previouslyValidatedBlocks
            }
          />
        )}

        {!getCandidacy.isLoading && result && (
          <>
            <ResultatCardWithBlocks
              jury={{
                id: jury.id,
                dateOfSession: jury.dateOfSession,
                result: result,
                informationOfResult: jury.informationOfResult,
                juryResultByCompetenceBlocs: jury.juryResultByCompetenceBlocs,
              }}
              previouslyValidatedBlocks={
                candidacy?.jury?.previouslyValidatedBlocks
              }
              additionalInformation={
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    feasibilityCompetenceBlocksModal.open();
                  }}
                  className="fr-link"
                >
                  Voir les détails de la recevabilité du candidat sur cette
                  certification <i className="fr-icon-arrow-right-line" />
                </Link>
              }
            />
            {isAdmin && (
              <div className="flex justify-end">
                <Button
                  priority="secondary"
                  onClick={() => revokeJuryDecisionModal.open()}
                >
                  Annuler la décision
                </Button>
              </div>
            )}

            {jury.result != "FULL_SUCCESS_OF_FULL_CERTIFICATION" &&
              jury.result != "FULL_SUCCESS_OF_PARTIAL_CERTIFICATION" && (
                <CallOut title="Le candidat peut renvoyer un dossier de validation">
                  Suite à ce résultat, le candidat peut repasser devant le jury.
                  Il devra, en amont, retravailler sur son dossier de validation
                  et vous le renvoyer. Une fois reçu, vous pourrez lui
                  transmettre une nouvelle date de passage devant le jury.
                </CallOut>
              )}
          </>
        )}

        {!getCandidacy.isLoading && !result && (
          <form onSubmit={handleFormSubmit}>
            <RadioButtons
              legend="Quel est le résultat du jury pour ce candidat ?"
              data-testid="result-radio-buttons"
              small
              hintText={
                <div className="mb-4">
                  {isAdmin && (
                    <p className=" text-xs">
                      Sous réserve de contre remplissage par le certificateur.
                    </p>
                  )}
                  <p className=" text-xs">
                    Sélectionnez le résultat obtenu par le candidat suite à son
                    passage devant le jury.{" "}
                    <Link
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        feasibilityCompetenceBlocksModal.open();
                      }}
                      className="fr-link text-xs"
                    >
                      Voir les détails de la recevabilité du candidat sur cette
                      certification{" "}
                      <i className="fr-icon-arrow-right-line fr-icon--xs" />
                    </Link>
                  </p>
                </div>
              }
              className="m-0 p-0 mb-4"
              classes={{
                inputGroup: "border w-full max-w-full mb-4 px-4",
              }}
              options={availableResultOptions.map((key) => {
                const label = juryResultOptions[key as JuryResult].label;
                const hintText = juryResultOptions[key as JuryResult].hintText;

                return {
                  label,
                  hintText,
                  nativeInputProps: {
                    value: key,
                    ...register("result"),
                    disabled: !editable,
                  },
                };
              })}
              state={errors.result ? "error" : "default"}
              stateRelatedMessage={
                errors.result ? "Veuillez sélectionner une option" : undefined
              }
            />

            <Checkbox
              legend="Quels blocs de compétence ont été validés pour ce jury ?"
              small
              hintText={
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    feasibilityCompetenceBlocksModal.open();
                  }}
                  className="fr-link text-xs"
                >
                  Voir les détails de la recevabilité du candidat sur cette
                  certification{" "}
                  <i className="fr-icon-arrow-right-line fr-icon--xs" />
                </Link>
              }
              className="m-0 mb-4"
              classes={{
                inputGroup: "-my-2",
              }}
              state={errors.validatedBlocks ? "error" : "default"}
              options={
                candidacy?.feasibility?.dematerializedFeasibilityFile?.blocsDeCompetences.map(
                  (bloc) => ({
                    label: `${bloc.certificationCompetenceBloc.code} - ${bloc.certificationCompetenceBloc.label}`,
                    hintText: "Recevabilité obtenue sur ce bloc",
                    nativeInputProps: {
                      value: bloc.certificationCompetenceBloc.id,
                      ...(previouslyValidatedBlocksIds.includes(
                        bloc.certificationCompetenceBloc.id,
                      )
                        ? {
                            checked: true,
                          }
                        : {
                            ...register("validatedBlocks"),
                          }),
                      disabled:
                        !editable ||
                        resultSelected === "FAILURE" ||
                        resultSelected === "CANDIDATE_EXCUSED" ||
                        resultSelected === "CANDIDATE_ABSENT" ||
                        previouslyValidatedBlocksIds.includes(
                          bloc.certificationCompetenceBloc.id,
                        ),
                    },
                  }),
                ) || []
              }
            />

            <Input
              label="Commentaires (optionnel) :"
              nativeTextAreaProps={register("informationOfResult")}
              textArea
              hintText={
                <p className="m-0 text-xs">
                  Indiquer ici toutes les réserves, consignes ou attendus
                  éventuels.
                </p>
              }
              disabled={!editable}
              state={errors.informationOfResult ? "error" : "default"}
              stateRelatedMessage={errors.informationOfResult?.message}
            />

            <div className="flex flex-row items-end">
              <Button
                className="ml-auto mt-8 text-right"
                disabled={isSubmitting || !editable || !formData.result}
              >
                Envoyer
              </Button>
            </div>
          </form>
        )}

        <ConfirmJuryResultModal
          result={formData.result as JuryResult}
          candidate={{
            firstName: candidacy?.candidate?.firstname,
            lastName: candidacy?.candidate?.lastname,
          }}
          certification={{
            label: candidacy?.certification?.label || "",
          }}
          onConfirm={submitData}
        />

        <RevokeJuryDecisionModal
          onConfirm={handleRevokeDecision}
          isSubmitting={isRevokeSubmitting}
          reasonTextAreaProps={revokeRegister("reason")}
        />
        {candidacy?.feasibility?.dematerializedFeasibilityFile
          ?.blocsDeCompetences &&
          candidacy?.certification?.competenceBlocs && (
            <>
              <FeasibilityCompetenceBlocksModal
                receivableBlocks={candidacy?.feasibility?.dematerializedFeasibilityFile?.blocsDeCompetences.map(
                  (block) => block.certificationCompetenceBloc,
                )}
                certificationBlocks={candidacy?.certification?.competenceBlocs}
              />
              <ResultInconsistencyErrorModal
                inconsistencyType={
                  errors.validatedBlocks?.message as ResultInconsistencyType
                }
                selectedBlocks={blocksTargetedForThisSession
                  .map((block) => block.certificationCompetenceBloc)
                  .filter((block) =>
                    formData.validatedBlocks.includes(block.id),
                  )}
              />
            </>
          )}
      </div>
    </>
  );
};
