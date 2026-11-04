"use client";

import Input from "@codegouvfr/react-dsfr/Input";
import RadioButtons from "@codegouvfr/react-dsfr/RadioButtons";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { sanitizedTextAllowSpecialCharacters } from "@/utils/input-sanitization";

import { useDecision } from "./_components/decision.hook";

const schema = z
  .object({
    aapDecision: z.enum(["FAVORABLE", "UNFAVORABLE"], {
      error: "Veuillez sélectionner un avis",
    }),
    aapDecisionComment: sanitizedTextAllowSpecialCharacters(),
  })
  .superRefine(({ aapDecision }, ctx) => {
    if (!aapDecision) {
      ctx.addIssue({
        code: "custom",
        message: "Veuillez sélectionner un avis",
        path: ["decision"],
      });
    }
  });

type DecisionForm = z.infer<typeof schema>;

export default function DecisionPage() {
  const { candidacyId } = useParams<{ candidacyId: string }>();
  const router = useRouter();
  const feasibilitySummaryUrl = `/candidacies/${candidacyId}/feasibility-aap`;
  const { createOrUpdateDecisionMutation, aapDecision, aapDecisionComment } =
    useDecision();
  const defaultValues = useMemo(
    () => ({
      aapDecision: aapDecision as DecisionForm["aapDecision"],
      aapDecisionComment: aapDecisionComment ?? "",
    }),
    [aapDecision, aapDecisionComment],
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<DecisionForm>({
    defaultValues,
    resolver: standardSchemaResolver(schema),
  });

  const handleFormSubmit = async ({
    aapDecision,
    aapDecisionComment,
  }: DecisionForm) => {
    try {
      await createOrUpdateDecisionMutation({
        aapDecision,
        aapDecisionComment,
      });
      successToast("Avis enregistré");
      router.push(feasibilitySummaryUrl);
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  const resetForm = useCallback(
    () => reset(defaultValues),
    [reset, defaultValues],
  );

  useEffect(resetForm, [resetForm]);

  return (
    <div className="flex flex-col">
      <h1>Avis sur la faisabilité</h1>
      <FormOptionalFieldsDisclaimer />
      <p className="text-xl mb-12">
        Donnez votre avis sur la faisabilité de la candidature et ajoutez des
        commentaires utiles à la réalisation du parcours VAE.
      </p>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        onReset={(e) => {
          e.preventDefault();
          resetForm();
        }}
      >
        <div>
          <h6>Quel est votre avis sur la faisabilité de cette candidature ?</h6>
          <RadioButtons
            className="mb-6"
            name="decision"
            state={errors.aapDecision ? "error" : "default"}
            stateRelatedMessage={errors.aapDecision?.message}
            options={[
              {
                label: "Favorable",
                nativeInputProps: {
                  value: "FAVORABLE",
                  ...register("aapDecision"),
                },
              },
              {
                label: "Non favorable",
                nativeInputProps: {
                  value: "UNFAVORABLE",
                  ...register("aapDecision"),
                },
              },
            ]}
            data-testid="aap-decision-radio-buttons"
          />
        </div>
        <div className="my-2">
          <p className="font-bold">
            Commentaires/préconisations (éléments d'argumentation, réorientation
            éventuelle…)
          </p>
          <Input
            textArea
            label=""
            hideLabel
            nativeTextAreaProps={register("aapDecisionComment")}
            state={errors.aapDecisionComment ? "error" : "default"}
            stateRelatedMessage={errors.aapDecisionComment?.message}
            data-testid="aap-decision-comment-input"
          />
        </div>
        <FormButtons
          backUrl={`/candidacies/${candidacyId}/feasibility-aap`}
          formState={{
            isDirty,
            isSubmitting,
          }}
        />
      </form>
    </div>
  );
}
