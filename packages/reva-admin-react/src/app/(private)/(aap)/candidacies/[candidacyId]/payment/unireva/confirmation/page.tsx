"use client";

import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { Stepper } from "@codegouvfr/react-dsfr/Stepper";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CandidacyBackButton } from "@/components/candidacy-back-button/CandidacyBackButton";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { isCandidacyPaymentRequestAlreadySent } from "@/utils/isCandidacyPaymentRequestAlreadySent";

import { Info } from "../../_components/form/Info";
import { costsAndHoursTotal } from "../paymentRequestUniRevaPaymentUtils";

import { usePaymentRequestUniRevaConfirmationPage } from "./paymentRequestUniRevaConfirmation.hook";

const paymentRequestUniRevaConfirmationSchema = z.object({
  payementRequestConfirmation: z.literal(true, {
    error: "Veuillez cocher la case",
  }),
});

export type PaymentRequestUniRevaConfirmationFormData = z.infer<
  typeof paymentRequestUniRevaConfirmationSchema
>;

const PaymentRequestUniRevaConfirmationPage = () => {
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const router = useRouter();

  const queryClient = useQueryClient();

  const { candidacy, confirmPaymentRequestUniReva, getCandidacyStatus } =
    usePaymentRequestUniRevaConfirmationPage();

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PaymentRequestUniRevaConfirmationFormData>({
    resolver: standardSchemaResolver(paymentRequestUniRevaConfirmationSchema),
  });

  const handleFormSubmit = handleSubmit(
    async () => {
      try {
        await confirmPaymentRequestUniReva.mutateAsync();
        queryClient.invalidateQueries({ queryKey: [candidacyId] });
        successToast("Modifications enregistrées");
        router.push(`/candidacies/${candidacyId}/summary`);
      } catch (e) {
        graphqlErrorToast(e);
      }
    },
    (e) => console.log({ e }),
  );

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    handleReset();
  }, [handleReset]);

  const paymentRequestAlreadySent = isCandidacyPaymentRequestAlreadySent({
    candidacy,
  });

  const { totalCost } = costsAndHoursTotal(candidacy?.paymentRequest || {});

  return (
    <div className="flex flex-col w-full p-1 md:p-2">
      <CandidacyBackButton candidacyId={candidacyId} />
      <h1>Demande de paiement</h1>
      <FormOptionalFieldsDisclaimer />
      <Stepper title="Confirmation" currentStep={3} stepCount={3} />
      <hr />
      {getCandidacyStatus === "success" && (
        <>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Info title="NUMÉRO DE PRISE EN CHARGE FRANCE VAE">
              {candidacy?.fundingRequest?.numAction}
            </Info>
            <Info title="NUMÉRO DE FACTURE">
              {candidacy?.paymentRequest?.invoiceNumber}
            </Info>
            <Info title="COÛT TOTAL DE LA DEMANDE DE PAIEMENT">
              {totalCost} €
            </Info>
          </dl>
          <form
            className="flex flex-col gap-6 mt-6"
            onSubmit={handleFormSubmit}
            onReset={(e) => {
              e.preventDefault();
              handleReset();
            }}
          >
            <Checkbox
              options={[
                {
                  label:
                    "Je confirme ce montant de paiement. Je ne pourrai pas modifier cette demande de paiement après son envoi.",
                  nativeInputProps: {
                    ...register("payementRequestConfirmation"),
                  },
                },
              ]}
              state={errors.payementRequestConfirmation ? "error" : "default"}
              stateRelatedMessage={errors.payementRequestConfirmation?.message}
            />
            {!paymentRequestAlreadySent && (
              <FormButtons formState={{ isDirty, isSubmitting }} />
            )}
          </form>
        </>
      )}
    </div>
  );
};

export default PaymentRequestUniRevaConfirmationPage;
