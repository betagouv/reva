"use client";

import Alert from "@codegouvfr/react-dsfr/Alert";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { GrayCard } from "@/components/card/gray-card/GrayCard";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { GenderEnum } from "@/constants/genders.constant";
import {
  sanitizedOptionalEmail,
  sanitizedOptionalPhone,
  sanitizedOptionalText,
} from "@/utils/input-sanitization";

import { Candidacy } from "@/graphql/generated/graphql";

import { ChoixCandidatBlock } from "./_components/ChoixCandidatBlock";
import { InformationCandidatBlock } from "./_components/InformationCandidatBlock";
import { ParcoursPersonnaliseBlock } from "./_components/ParcoursPersonnaliseBlock";
import { ResponsableFinancementBlock } from "./_components/ResponsableFinancementBlock";
import { useCandidacyFunding } from "./_components/useCandidacyFunding.hook";

const errorNumber = "Veuillez saisir une valeur numérique.";

const candidacyFundingSchema = z.object({
  candidateSecondname: sanitizedOptionalText(),
  candidateThirdname: sanitizedOptionalText(),
  candidateGender: z.nativeEnum(GenderEnum).default(GenderEnum.undisclosed),
  individualHourCount: z.number({
    error: errorNumber,
  }),
  individualCost: z.number({
    error: errorNumber,
  }),
  collectiveHourCount: z.number({
    error: errorNumber,
  }),
  collectiveCost: z.number({
    error: errorNumber,
  }),
  basicSkillsHourCount: z.number({
    error: errorNumber,
  }),
  basicSkillsCost: z.number({
    error: errorNumber,
  }),
  mandatoryTrainingsHourCount: z.number({
    error: errorNumber,
  }),
  mandatoryTrainingsCost: z.number({
    error: errorNumber,
  }),
  certificateSkillsHourCount: z.number({
    error: errorNumber,
  }),
  certificateSkillsCost: z.number({
    error: errorNumber,
  }),
  otherTrainingHourCount: z.number({
    error: errorNumber,
  }),
  otherTrainingCost: z.number({
    error: errorNumber,
  }),
  fundingContactFirstname: sanitizedOptionalText(),
  fundingContactLastname: sanitizedOptionalText(),
  fundingContactEmail: sanitizedOptionalEmail(),
  fundingContactPhone: sanitizedOptionalPhone(),
  confirmation: z.literal<boolean>(true),
});

type CandidacyFundingFormData = z.infer<typeof candidacyFundingSchema>;

const CustomSeparator = () => <hr className="flex mb-2 mt-8" />;

const FundingPage = () => {
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();
  const router = useRouter();

  const candidacySummaryUrl = `/candidacies/${candidacyId}/summary`;

  const {
    candidacy,
    candidacyHasAlreadyFundingRequest,
    candidacyIsXpReva,
    candidacyIsLoading,
    candidacyFundingRequest,
    isEligibleToViewFundingRequest,
    candidacyHasBeenNotRecevable,
    candidacyHasBeenDroppedOutAndIncomplete,
    candidacyHasBeenRecevable,
  } = useCandidacyFunding(candidacyId);

  const isReadOnly = candidacyIsXpReva || candidacyHasAlreadyFundingRequest;
  const isForfaitOnly =
    (candidacyHasBeenNotRecevable || candidacyHasBeenDroppedOutAndIncomplete) &&
    !candidacyHasBeenRecevable;

  const candidacyFormData = useMemo(
    () => ({
      candidateSecondname: candidacy?.candidate?.firstname2 ?? "",
      candidateThirdname: candidacy?.candidate?.firstname3 ?? "",
      candidateMiddleNames: candidacy?.candidate?.middleNames ?? "",
      candidateGender:
        (candidacy?.candidate?.gender as GenderEnum) ?? GenderEnum.undisclosed,
      individualHourCount: candidacyFundingRequest?.individualHourCount ?? 0,
      individualCost: candidacyFundingRequest?.individualCost ?? 0,
      collectiveHourCount: candidacyFundingRequest?.collectiveHourCount ?? 0,
      collectiveCost: candidacyFundingRequest?.collectiveCost ?? 0,
      basicSkillsHourCount: candidacyFundingRequest?.basicSkillsHourCount ?? 0,
      basicSkillsCost: candidacyFundingRequest?.basicSkillsCost ?? 0,
      mandatoryTrainingsHourCount:
        candidacyFundingRequest?.mandatoryTrainingsHourCount ?? 0,
      mandatoryTrainingsCost:
        candidacyFundingRequest?.mandatoryTrainingsCost ?? 0,
      certificateSkillsHourCount:
        candidacyFundingRequest?.certificateSkillsHourCount ?? 0,
      certificateSkillsCost:
        candidacyFundingRequest?.certificateSkillsCost ?? 0,
      otherTrainingHourCount:
        candidacyFundingRequest?.otherTrainingHourCount ?? 0,
      otherTrainingCost: candidacyFundingRequest?.otherTrainingCost ?? 0,
      fundingContactFirstname:
        candidacy?.fundingRequestUnifvae?.fundingContactFirstname ?? "",
      fundingContactLastname:
        candidacy?.fundingRequestUnifvae?.fundingContactLastname ?? "",
      fundingContactEmail:
        candidacy?.fundingRequestUnifvae?.fundingContactEmail ?? "",
      fundingContactPhone:
        candidacy?.fundingRequestUnifvae?.fundingContactPhone ?? "",
      confirmation: isReadOnly,
    }),
    [candidacy, candidacyFundingRequest, isReadOnly],
  );

  const methods = useForm<CandidacyFundingFormData>({
    resolver: standardSchemaResolver(candidacyFundingSchema),
    defaultValues: candidacyFormData,
  });

  const {
    register,
    reset,
    formState: { isSubmitting, errors },
  } = methods;

  const resetForm = useCallback(
    () => reset(candidacyFormData),
    [reset, candidacyFormData],
  );

  useEffect(resetForm, [resetForm]);

  useEffect(() => {
    if (!candidacyIsLoading && !isEligibleToViewFundingRequest) {
      router.push(candidacySummaryUrl);
    }
  }, [
    candidacyIsLoading,
    isEligibleToViewFundingRequest,
    candidacySummaryUrl,
    router,
  ]);

  if (candidacyIsLoading || !isEligibleToViewFundingRequest) {
    return null;
  }

  return !isReadOnly ? (
    <div className="flex flex-col w-full p-1 md:p-2">
      <h1>Demande de prise en charge</h1>
      <Alert
        severity="info"
        title="Fin de la prise en charge financière via France VAE"
        description={
          <span>
            <p>
              Suite à l'épuisement des fonds alloués par l'État dans le cadre de
              la phase de préfiguration, aucune nouvelle prise en charge
              financière ne peut être effectuée via France VAE.
            </p>
            <p>Communication officielle à venir.</p>
          </span>
        }
      />
    </div>
  ) : (
    <div className="flex flex-col w-full p-1 md:p-2">
      <div>
        <h1>Demande de prise en charge</h1>
        <FormOptionalFieldsDisclaimer classname="mb-0" />
        {candidacy?.fundingRequestUnifvae?.numAction && (
          <p className="m-0">
            <span className="font-bold">Numéro : </span>
            {candidacy.fundingRequestUnifvae.numAction}
          </p>
        )}
      </div>
      <FormProvider {...methods}>
        <form data-testid="funding-form" className="flex flex-col">
          <InformationCandidatBlock
            candidacy={candidacy as Candidacy}
            isReadOnly
          />
          <CustomSeparator />
          <ChoixCandidatBlock candidacy={candidacy as Candidacy} />
          <CustomSeparator />
          <ParcoursPersonnaliseBlock
            candidacy={candidacy as Candidacy}
            isReadOnly
            isForfaitOnly={isForfaitOnly}
          />
          <CustomSeparator />
          <ResponsableFinancementBlock isReadOnly />
          <GrayCard className="mt-4 md:mt-0">
            <h2 className="text-lg md:text-xl">
              Avant de finaliser votre envoi :
            </h2>
            <Checkbox
              className="mb-0"
              options={[
                {
                  label:
                    "Je confirme le montant de la prise en charge. Je ne pourrai pas modifier cette demande après son envoi.",
                  nativeInputProps: {
                    ...register("confirmation"),
                    disabled: true,
                  },
                },
              ]}
              state={errors.confirmation?.message ? "error" : "default"}
              stateRelatedMessage={
                errors.confirmation?.message
                  ? "Veuillez confirmer le montant de la prise en charge."
                  : ""
              }
            />
          </GrayCard>

          <FormButtons
            backUrl={candidacySummaryUrl}
            formState={{
              isDirty: false,
              isSubmitting,
            }}
          />
        </form>
      </FormProvider>
    </div>
  );
};

export default FundingPage;
