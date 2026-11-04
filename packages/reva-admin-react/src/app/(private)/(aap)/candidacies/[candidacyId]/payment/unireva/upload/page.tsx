"use client";
import { Stepper } from "@codegouvfr/react-dsfr/Stepper";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useKeycloakContext } from "@/components/auth/keycloakContext";
import { CandidacyBackButton } from "@/components/candidacy-back-button/CandidacyBackButton";
import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { errorToast, successToast } from "@/components/toast/toast";
import { REST_API_URL } from "@/config/config";

import { Section } from "../../_components/form/Section";

const paymentRequestUniRevaUploadSchema = z.object({
  invoiceFile: z.object({
    0: z.instanceof(File, { message: "Merci de remplir ce champ" }),
  }),

  appointmentFile: z.object({
    0: z.instanceof(File, { message: "Merci de remplir ce champ" }),
  }),
});

export type PaymentRequestUniRevaUploadFormData = z.infer<
  typeof paymentRequestUniRevaUploadSchema
>;

const PaymentRequestUniRevaUploadPage = () => {
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { accessToken } = useKeycloakContext();
  const router = useRouter();
  const {
    register,
    reset,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
  } = useForm<PaymentRequestUniRevaUploadFormData>({
    resolver: standardSchemaResolver(paymentRequestUniRevaUploadSchema),
  });

  const handleFormSubmit = handleSubmit(
    async (data) => {
      const formData = new FormData();

      formData.append("candidacyId", candidacyId);
      formData.append("invoice", data.invoiceFile?.[0]);
      formData.append("appointment", data.appointmentFile?.[0]);

      const result = await fetch(`${REST_API_URL}/payment-request/proof`, {
        method: "post",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      if (result.ok) {
        successToast("Modifications enregistrées");
        router.push(`/candidacies/${candidacyId}/payment/unireva/confirmation`);
      } else {
        const data = await result.json();
        const message = data.message || (await result.text());
        errorToast(message);
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

  return (
    <div className="flex flex-col w-full p-1 md:p-2">
      <CandidacyBackButton candidacyId={candidacyId} />
      <h1>Demande de paiement</h1>
      <FormOptionalFieldsDisclaimer />
      <Stepper
        title="Déposez les pièces justificicatives"
        nextTitle="Confirmation"
        currentStep={2}
        stepCount={3}
      />
      <hr />
      <form
        className="flex flex-col gap-6"
        onSubmit={handleFormSubmit}
        onReset={(e) => {
          e.preventDefault();
          handleReset();
        }}
      >
        <Section
          title="1 - Pièces justificatives à joindre"
          className="flex flex-col gap-6"
        >
          <div className="mb-4">
            <p>La facture doit faire apparaître les éléments suivants :</p>
            <ul>
              <li>
                Nom de la structure prestataire (accompagnement, organisme de
                formation)
              </li>
              <li>Numéro de convention de prise en charge d'Uniformation</li>
              <li>
                Nombre d'heures réalisées en accompagnement individuel et
                collectif, actes formatifs, jury et post jury
              </li>
              <li>Total demandé et total réalisé</li>
            </ul>
          </div>
          <FancyUpload
            title="Facture"
            hint="Format supporté : PDF uniquement avec un poids maximum de 10Mo"
            nativeInputProps={{
              ...register("invoiceFile"),
              accept: ".pdf",
            }}
            state={errors.invoiceFile ? "error" : "default"}
            stateRelatedMessage={errors.invoiceFile?.[0]?.message}
          />
          <FancyUpload
            title="Récapitulatif des attestations de présence"
            hint="Format supporté : PDF uniquement avec un poids maximum de 2Mo"
            nativeInputProps={{
              ...register("appointmentFile"),
              accept: ".pdf",
            }}
            state={errors.appointmentFile ? "error" : "default"}
            stateRelatedMessage={errors.appointmentFile?.[0]?.message}
          />
        </Section>
        <Section title="2 - Confirmation" className="flex flex-col">
          <p className="mt-6">
            Pièces justificatives que vous devez collecter et conserver pendant
            5 ans, en cas de contrôle à posteriori de l'OPCO de la Cohésion :
          </p>
          <ul>
            <li>Avis de recevabilité transmis par le certificateur </li>
            <li>
              Relevéd'assiduité du candidat par prestation (récapitulatif du
              nombre
            </li>
            <li>d'heures de présence par prestataire)</li>
            <li>
              Résultat du jury dans le cas d'une demande d'heure
              d'accompagnement post-Jury
            </li>
            <li>
              Justificatif situation "public fragile" (ce justificatif, demandé
              au moment du paiement seulement, entérine la calcul de prise en
              charge ainsi que le règlement)
            </li>
            <li>Copie RQTH (ou renouvellement en cours)</li>
            <li>Justificatif du bénéfice de minima sociaux (ASS, RSA, AAH)</li>
            <li>Justificatif demandeurs d'emploi + 12 mois</li>
            <li>Justificatif du plus haut niveau de diplôme obtenu</li>
          </ul>
        </Section>
        <FormButtons
          formState={{ isDirty, isSubmitting }}
          backUrl={`/candidacies/${candidacyId}/payment/unireva/invoice/`}
          submitButtonLabel="Envoyer la demande de paiement"
        />
      </form>
    </div>
  );
};

export default PaymentRequestUniRevaUploadPage;
