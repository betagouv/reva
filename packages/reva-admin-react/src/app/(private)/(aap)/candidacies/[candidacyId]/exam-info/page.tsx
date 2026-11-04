"use client";

import Input from "@codegouvfr/react-dsfr/Input";
import { Select } from "@codegouvfr/react-dsfr/Select";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format, parse, toDate } from "date-fns";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CandidacyBackButton } from "@/components/candidacy-back-button/CandidacyBackButton";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { sanitizedOptionalText } from "@/utils/input-sanitization";

import { useExamInfoPage } from "./examInfo";

const examInfoSchema = z.object({
  estimatedExamDate: sanitizedOptionalText(),
  actualExamDate: sanitizedOptionalText(),
  examResult: z.enum([
    "SUCCESS",
    "PARTIAL_SUCCESS",
    "PARTIAL_CERTIFICATION_SUCCESS",
    "FAILURE",
    "",
  ]),
});

export type ExamInfoFormData = z.infer<typeof examInfoSchema>;

const ExamInfoPage = () => {
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { candidacy, getCandidacyStatus, updateExamInfo } = useExamInfoPage();

  const defaultValues = useMemo(
    () => ({
      estimatedExamDate: candidacy?.examInfo?.estimatedExamDate
        ? format(
            toDate(candidacy?.examInfo?.estimatedExamDate || 0),
            "yyyy-MM-dd",
          )
        : undefined,
      actualExamDate: candidacy?.examInfo?.actualExamDate
        ? format(toDate(candidacy?.examInfo?.actualExamDate || 0), "yyyy-MM-dd")
        : undefined,
      examResult: candidacy?.examInfo?.examResult || undefined,
    }),
    [candidacy],
  );

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ExamInfoFormData>({
    resolver: standardSchemaResolver(examInfoSchema),
    shouldUnregister: true,
    defaultValues,
  });

  const handleFormSubmit = handleSubmit(
    async ({
      actualExamDate,
      estimatedExamDate,
      examResult,
    }: ExamInfoFormData) => {
      try {
        await updateExamInfo.mutateAsync({
          //pass french locale date as utc
          actualExamDate: parse(
            actualExamDate + "+00",
            "yyyy-MM-ddx",
            new Date(),
          ).getTime(),
          estimatedExamDate: parse(
            estimatedExamDate + "+00",
            "yyyy-MM-ddx",
            new Date(),
          ).getTime(),
          examResult: examResult || null,
        });
        successToast("Modifications enregistrées");
      } catch (e) {
        graphqlErrorToast(e);
      }
    },
    (e) => console.log(e),
  );

  const handleReset = useCallback(
    () => reset(defaultValues),
    [defaultValues, reset],
  );

  useEffect(() => {
    handleReset();
  }, [handleReset]);

  return (
    <div className="flex flex-col gap-6">
      <CandidacyBackButton candidacyId={candidacyId} />
      <h1 className="mb-0">Jury</h1>
      <FormOptionalFieldsDisclaimer />

      {getCandidacyStatus === "success" && (
        <form
          className="flex flex-col flex-1 mb-2 overflow-auto"
          onSubmit={handleFormSubmit}
          onReset={(e) => {
            e.preventDefault();
            handleReset();
          }}
        >
          <fieldset>
            <legend className="text-2xl font-bold mb-6">
              1 - Dates de passage devant le jury
            </legend>
            <div className="flex flex-col md:flex-row gap-6">
              <Input
                className="w-72"
                label="Date prévisionnelle (optionnel)"
                hintText="Date au format 31/12/2022"
                nativeInputProps={{
                  type: "date",
                  ...register("estimatedExamDate"),
                }}
                state={errors.estimatedExamDate ? "error" : "default"}
                stateRelatedMessage={errors.estimatedExamDate?.message}
              />
              <Input
                className="w-72"
                label="Date réelle (optionnel)"
                hintText="Date au format 31/12/2022"
                nativeInputProps={{
                  type: "date",
                  ...register("actualExamDate"),
                }}
                state={errors.actualExamDate ? "error" : "default"}
                stateRelatedMessage={errors.actualExamDate?.message}
              />
            </div>
          </fieldset>
          <hr className="mt-3" />
          <fieldset>
            <legend className="text-2xl font-bold mb-6">2 - Résultat</legend>
            <Select
              className="max-w-[600px]"
              label="Résultat obtenu par le candidat"
              nativeSelectProps={{
                ...register("examResult"),
              }}
            >
              <option value="">Non renseigné</option>
              <option value="SUCCESS">Réussite</option>
              <option value="PARTIAL_SUCCESS">Réussite partielle</option>
              <option value="PARTIAL_CERTIFICATION_SUCCESS">
                Réussite à une demande initiale de certification partielle
              </option>
              <option value="FAILURE">Échec</option>
            </Select>
          </fieldset>
          <FormButtons
            className="mt-12"
            formState={{ isDirty, isSubmitting }}
          />
        </form>
      )}
    </div>
  );
};
export default ExamInfoPage;
