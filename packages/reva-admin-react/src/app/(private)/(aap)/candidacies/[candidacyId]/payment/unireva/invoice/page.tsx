"use client";

import { Input } from "@codegouvfr/react-dsfr/Input";
import { Stepper } from "@codegouvfr/react-dsfr/Stepper";
import { Tag } from "@codegouvfr/react-dsfr/Tag";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { CandidacyBackButton } from "@/components/candidacy-back-button/CandidacyBackButton";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { isCandidacyPaymentRequestAlreadySent } from "@/utils/isCandidacyPaymentRequestAlreadySent";

import { Section } from "../../_components/form/Section";
import { TableRow } from "../../_components/form/TableRow";
import { costsAndHoursTotal } from "../paymentRequestUniRevaPaymentUtils";

import { CostWithEstimateInput } from "./_components/CostWithEstimateInput";
import { HourWithEstimateInput } from "./_components/HourWithEstimateInput";
import { usePaymentRequestUniRevaInvoicePage } from "./paymentRequestUniRevaInvoice.hook";
import {
  PaymentRequestUniRevaInvoiceFormData,
  paymentRequestUniRevaInvoiceSchema,
} from "./paymentRequestUniRevaInvoiceFormSchema";

const PaymentRequestUniRevaInvoicePage = () => {
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const router = useRouter();

  const { candidacy, getCandidacyStatus, createOrUpdatePaymentRequestUniReva } =
    usePaymentRequestUniRevaInvoicePage();

  const defaultValues = useMemo(
    () => ({
      invoiceNumber: candidacy?.paymentRequest?.invoiceNumber,
      individualEffectiveHourCount:
        candidacy?.paymentRequest?.individualEffectiveHourCount || 0,
      individualEffectiveCost:
        candidacy?.paymentRequest?.individualEffectiveCost || 0,
      collectiveEffectiveHourCount:
        candidacy?.paymentRequest?.collectiveEffectiveHourCount || 0,
      collectiveEffectiveCost:
        candidacy?.paymentRequest?.collectiveEffectiveCost || 0,
      mandatoryTrainingsEffectiveHourCount:
        candidacy?.paymentRequest?.mandatoryTrainingsEffectiveHourCount || 0,
      mandatoryTrainingsEffectiveCost:
        candidacy?.paymentRequest?.mandatoryTrainingsEffectiveCost || 0,
      basicSkillsEffectiveHourCount:
        candidacy?.paymentRequest?.basicSkillsEffectiveHourCount || 0,
      basicSkillsEffectiveCost:
        candidacy?.paymentRequest?.basicSkillsEffectiveCost || 0,
      certificateSkillsEffectiveHourCount:
        candidacy?.paymentRequest?.certificateSkillsEffectiveHourCount || 0,
      certificateSkillsEffectiveCost:
        candidacy?.paymentRequest?.certificateSkillsEffectiveCost || 0,
      otherTrainingEffectiveHourCount:
        candidacy?.paymentRequest?.otherTrainingEffectiveHourCount || 0,
      otherTrainingEffectiveCost:
        candidacy?.paymentRequest?.otherTrainingEffectiveCost || 0,
      diagnosisEffectiveHourCount:
        candidacy?.paymentRequest?.diagnosisEffectiveHourCount || 0,
      diagnosisEffectiveCost:
        candidacy?.paymentRequest?.diagnosisEffectiveCost || 0,
      postExamEffectiveHourCount:
        candidacy?.paymentRequest?.postExamEffectiveHourCount || 0,
      postExamEffectiveCost:
        candidacy?.paymentRequest?.postExamEffectiveCost || 0,
      examEffectiveHourCount:
        candidacy?.paymentRequest?.examEffectiveHourCount || 0,
      examEffectiveCost: candidacy?.paymentRequest?.examEffectiveCost || 0,
    }),
    [candidacy],
  );

  const paymentRequestAlreadySent = isCandidacyPaymentRequestAlreadySent({
    candidacy,
  });

  const {
    register,
    control,
    reset,
    formState,
    formState: { errors },
    handleSubmit,
    setError,
    setFocus,
  } = useForm<PaymentRequestUniRevaInvoiceFormData>({
    resolver: standardSchemaResolver(paymentRequestUniRevaInvoiceSchema),
    defaultValues,
    disabled: paymentRequestAlreadySent,
  });

  const formValues = useWatch({ control });

  const {
    trainingHourCountTotal,
    trainingCostTotal,
    meetingHourCountTotal,
    meetingCostTotal,
    supportEffectiveCostTotal,
    supportHourCountTotal,
    totalHourCount,
    totalCost,
  } = costsAndHoursTotal(formValues);

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      await createOrUpdatePaymentRequestUniReva.mutateAsync({
        paymentRequest: data,
      });
      successToast("Modifications enregistrées");
      router.push(`/candidacies/${candidacyId}/payment/unireva/upload`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("input.")) {
        const [, name, message] =
          ((
            e as unknown as { response: { errors: { message: string }[] } }
          ).response.errors[0].message.match(/input\.([^:]*): (.*)/) as [
            unknown,
            string,
            string,
          ]) || [];

        const fieldName = name
          .replace("Cost", "EffectiveCost")
          .replace(
            "Hour",
            "EffectiveHour",
          ) as keyof PaymentRequestUniRevaInvoiceFormData;

        setError(fieldName, {
          message,
        });
        setFocus(fieldName);
      } else {
        graphqlErrorToast(e);
      }
    }
  });

  const handleReset = useCallback(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    handleReset();
  }, [handleReset]);

  return (
    <div className="flex flex-col w-full p-1 md:p-2">
      <CandidacyBackButton candidacyId={candidacyId} />
      <h1>Demande de paiement</h1>
      <FormOptionalFieldsDisclaimer />
      <Stepper
        title="Renseignez les heures d’accompagnement"
        currentStep={1}
        stepCount={3}
        nextTitle="Déposez les pièces justificicatives"
      />
      <hr />
      {getCandidacyStatus === "success" && candidacy && (
        <form
          className="flex flex-col"
          onSubmit={handleFormSubmit}
          onReset={(e) => {
            e.preventDefault();
            handleReset();
          }}
        >
          <Section title="1. Informations des prestations">
            <h3 className="text-base mb-2">
              Certification choisie par le candidat
            </h3>
            <p>{candidacy.certification?.label}</p>
          </Section>
          <hr />
          <Section title="2. Numéro de prise en charge France VAE">
            <span>{candidacy.fundingRequest?.numAction}</span>
          </Section>
          <hr />
          <Section title="3. Parcours personnalisé">
            <fieldset className="mt-12">
              <legend className="mb-6 font-medium">Entretien(s)</legend>
              <div className="flex flex-col flew-wrap w-full border-[1px] border-default-grey rounded-lg">
                <TableRow>
                  <p>Entretien(s) de faisabilité</p>

                  <HourWithEstimateInput
                    name="diagnosisEffectiveHourCount"
                    control={control}
                    estimate={candidacy.fundingRequest?.diagnosisHourCount}
                  />
                  <CostWithEstimateInput
                    name="diagnosisEffectiveCost"
                    control={control}
                    estimate={candidacy.fundingRequest?.diagnosisCost}
                  />
                </TableRow>
                <TableRow>
                  <p>Entretien post jury</p>
                  <HourWithEstimateInput
                    name="postExamEffectiveHourCount"
                    control={control}
                    estimate={candidacy.fundingRequest?.postExamHourCount}
                  />
                  <CostWithEstimateInput
                    name="postExamEffectiveCost"
                    control={control}
                    estimate={candidacy.fundingRequest?.postExamCost}
                  />
                </TableRow>
                <TableRow className="font-medium">
                  <p>Sous-total des entretiens</p>
                  <p>{meetingHourCountTotal} h</p>
                  <p>{meetingCostTotal.toFixed(2)} €</p>
                </TableRow>
              </div>
            </fieldset>
            <fieldset className="mt-12">
              <legend className="mb-6 font-medium">Accompagnement</legend>
              <div className="flex flex-col flew-wrap w-full border-[1px] border-default-grey rounded-lg">
                <TableRow>
                  <p>Individuel</p>
                  <HourWithEstimateInput
                    name="individualEffectiveHourCount"
                    control={control}
                    estimate={candidacy.fundingRequest?.individualHourCount}
                  />
                  <CostWithEstimateInput
                    name="individualEffectiveCost"
                    control={control}
                    estimate={candidacy.fundingRequest?.individualCost}
                  />
                </TableRow>
                <TableRow>
                  <p>Collectif</p>
                  <HourWithEstimateInput
                    name="collectiveEffectiveHourCount"
                    control={control}
                    estimate={candidacy.fundingRequest?.collectiveHourCount}
                  />
                  <CostWithEstimateInput
                    name="collectiveEffectiveCost"
                    control={control}
                    estimate={candidacy.fundingRequest?.collectiveCost}
                  />
                </TableRow>
                <TableRow className="font-medium">
                  <p>Sous-total des accompagnements</p>
                  <p>{supportHourCountTotal} h</p>
                  <p>{supportEffectiveCostTotal.toFixed(2)} €</p>
                </TableRow>
              </div>
            </fieldset>
            <fieldset className="mt-12">
              <legend className="mb-6 font-medium">
                Compléments formatifs
              </legend>
              <div className="flex flex-col flew-wrap w-full border-[1px] border-default-grey rounded-lg">
                <TableRow>
                  <div className="flex flex-col">
                    <p className="mb-2">Formations</p>
                    <div className="flex flex-wrap gap-3">
                      {candidacy.mandatoryTrainings.map((mt) => (
                        <Tag key={mt.id} small>
                          {mt.label}
                        </Tag>
                      ))}
                    </div>
                    {!candidacy.mandatoryTrainings.length && (
                      <p className="text-sm text-gray-500 italic">
                        Aucun élément séléctionné
                      </p>
                    )}
                  </div>
                  <HourWithEstimateInput
                    name="mandatoryTrainingsEffectiveHourCount"
                    control={control}
                    estimate={
                      candidacy.fundingRequest?.mandatoryTrainingsHourCount
                    }
                  />
                  <CostWithEstimateInput
                    name="mandatoryTrainingsEffectiveCost"
                    control={control}
                    estimate={candidacy.fundingRequest?.mandatoryTrainingsCost}
                  />
                </TableRow>
                <TableRow>
                  <div className="flex flex-col">
                    <p className="mb-2">Savoirs de base</p>
                    <div className="flex flex-wrap gap-3">
                      {candidacy.basicSkills.map((bs) => (
                        <Tag key={bs.id} small>
                          {bs.label}
                        </Tag>
                      ))}
                    </div>
                    {!candidacy.basicSkills.length && (
                      <p className="text-sm text-gray-500 italic">
                        Aucun élément séléctionné
                      </p>
                    )}
                  </div>
                  <HourWithEstimateInput
                    name="basicSkillsEffectiveHourCount"
                    control={control}
                    estimate={candidacy.fundingRequest?.basicSkillsHourCount}
                  />
                  <CostWithEstimateInput
                    name="basicSkillsEffectiveCost"
                    control={control}
                    estimate={candidacy.fundingRequest?.basicSkillsCost}
                  />
                </TableRow>
                <TableRow>
                  <div className="flex flex-col">
                    <p className="mb-2">Bloc de compétences</p>
                    <pre className="text-xs text-gray-500 italic text-wrap">
                      {candidacy.certificateSkills || "Non précisé"}
                    </pre>
                  </div>
                  <HourWithEstimateInput
                    name="certificateSkillsEffectiveHourCount"
                    control={control}
                    estimate={
                      candidacy.fundingRequest?.certificateSkillsHourCount
                    }
                  />
                  <CostWithEstimateInput
                    name="certificateSkillsEffectiveCost"
                    control={control}
                    estimate={candidacy.fundingRequest?.certificateSkillsCost}
                  />
                </TableRow>
                <TableRow>
                  <div className="flex flex-col">
                    <p className="mb-2">Autres actions de formations</p>
                    <pre className="text-xs text-gray-500 italic text-wrap">
                      {candidacy.otherTraining || "Non précisé"}
                    </pre>
                  </div>
                  <HourWithEstimateInput
                    name="otherTrainingEffectiveHourCount"
                    control={control}
                    estimate={candidacy.fundingRequest?.otherTrainingHourCount}
                  />
                  <CostWithEstimateInput
                    name="otherTrainingEffectiveCost"
                    control={control}
                    estimate={candidacy.fundingRequest?.otherTrainingCost}
                  />
                </TableRow>
                <TableRow className="font-medium">
                  <p>Sous-total des compléments formatifs</p>
                  <p>{trainingHourCountTotal} h</p>
                  <p>{trainingCostTotal.toFixed(2)} €</p>
                </TableRow>
              </div>
            </fieldset>
            <fieldset className="mt-12">
              <legend className="mb-6 font-medium">Prestation jury</legend>
              <div className="flex flex-col flew-wrap w-full border-[1px] border-default-grey rounded-lg">
                <TableRow>
                  <p>Jury</p>
                  <HourWithEstimateInput
                    name="examEffectiveHourCount"
                    control={control}
                    estimate={candidacy.fundingRequest?.examHourCount}
                  />
                  <CostWithEstimateInput
                    name="examEffectiveCost"
                    control={control}
                    estimate={candidacy.fundingRequest?.examCost}
                  />
                </TableRow>
              </div>
            </fieldset>
            <TableRow>
              <p className="font-bold">Total</p>
              <p>{totalHourCount} h</p>
              <p>{totalCost.toFixed(2)} €</p>
            </TableRow>
          </Section>
          <hr />
          <Section title="4. Numéro de facture">
            <Input
              className="max-w-xs"
              label="Numéro de facture"
              nativeInputProps={register("invoiceNumber")}
              state={errors.invoiceNumber ? "error" : "default"}
              stateRelatedMessage={errors.invoiceNumber?.message}
            />
          </Section>
          <hr />

          {!paymentRequestAlreadySent && (
            <FormButtons
              formState={{
                isDirty: true,
                isSubmitting: formState.isSubmitting,
              }}
            />
          )}
        </form>
      )}
    </div>
  );
};

export default PaymentRequestUniRevaInvoicePage;
