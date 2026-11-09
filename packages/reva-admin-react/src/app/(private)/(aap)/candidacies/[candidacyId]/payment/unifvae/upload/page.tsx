"use client";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { Stepper } from "@codegouvfr/react-dsfr/Stepper";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { useKeycloakContext } from "@/components/auth/keycloakContext";
import { CandidacyBackButton } from "@/components/candidacy-back-button/CandidacyBackButton";
import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { errorToast, successToast } from "@/components/toast/toast";
import { REST_API_URL } from "@/config/config";

import { Section } from "../../_components/form/Section";

const paymentRequestUniFvaeUploadSchema = z.object({
  invoiceFile: z.object({
    0: z.instanceof(File, { message: "Merci de remplir ce champ" }),
  }),

  certificateOfAttendanceFile: z.object({
    0: z.instanceof(File, { message: "Merci de remplir ce champ" }),
  }),
  contractorInvoiceFiles: z
    .object({
      0: z.undefined().or(z.instanceof(File)),
    })
    .array(),

  confirmation1Checked: z.literal(true, {
    error: "Veuillez cocher toutes les cases",
  }),

  confirmation2Checked: z.literal(true, {
    error: "Veuillez cocher toutes les cases",
  }),

  confirmation3Checked: z.literal(true, {
    error: "Veuillez cocher toutes les cases",
  }),
});

export type PaymentRequestUniFvaeUploadFormData = z.infer<
  typeof paymentRequestUniFvaeUploadSchema
>;

const PaymentRequestUniFvaeUploadPage = () => {
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const queryClient = useQueryClient();

  const { accessToken } = useKeycloakContext();
  const router = useRouter();
  const {
    register,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
  } = useForm<PaymentRequestUniFvaeUploadFormData>({
    resolver: standardSchemaResolver(paymentRequestUniFvaeUploadSchema),
    defaultValues: { contractorInvoiceFiles: [{ 0: undefined }] },
  });

  const {
    fields: contractorInvoiceFilesFields,
    insert: insertContractorInvoiceFiles,
    remove: removeContractorInvoiceFiles,
  } = useFieldArray({
    name: "contractorInvoiceFiles",
    control,
  });

  const handleFormSubmit = handleSubmit(
    async (data) => {
      const formData = new FormData();

      formData.append("candidacyId", candidacyId);
      formData.append("invoice", data.invoiceFile?.[0]);
      formData.append(
        "certificateOfAttendance",
        data.certificateOfAttendanceFile?.[0],
      );

      data.contractorInvoiceFiles.forEach(
        (f) => f?.[0] && formData.append("contractorInvoices", f?.[0]),
      );

      const result = await fetch(
        `${REST_API_URL}/payment-request-unifvae/confirmation`,
        {
          method: "post",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        },
      );
      if (result.ok) {
        successToast("Demande de paiement envoyée");
        queryClient.invalidateQueries({ queryKey: [candidacyId] });
        router.push(`/candidacies/${candidacyId}/summary`);
      } else {
        const data = await result.json();
        const message = data.message || (await result.text());
        errorToast(message);
      }
    },
    (e) => console.log({ e }),
  );

  const handleReset = useCallback(() => {
    reset({ contractorInvoiceFiles: [{ 0: undefined }] });
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
        currentStep={2}
        stepCount={2}
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
          title="1 - Pièces jointes liées à la facturation"
          className="flex flex-col gap-6"
        >
          <FancyUpload
            title="Joindre la facture globale avec un RIB inclus"
            description="La facture doit être nette de TVA et doit contenir un RIB. (Un RIB unique par AAP).”"
            hint="Format supporté : PDF uniquement avec un poids maximum de 10Mo"
            nativeInputProps={{
              ...register("invoiceFile"),
              accept: ".pdf",
            }}
            state={errors.invoiceFile ? "error" : "default"}
            stateRelatedMessage={errors.invoiceFile?.[0]?.message}
          />
          <FancyUpload
            title="Joindre le certificat de réalisation signé par le candidat et l'AAP"
            description="Le document est disponible dans l'espace documentaire et doit comprendre l'ensemble des actes réalisés pour le parcours (étude de faisabilité, heures d'accompagnement individuel et collectif, actes formatifs). Le certificat est également disponible avec l’accord de prise en charge de Uniformation."
            hint="Format supporté : PDF uniquement avec un poids maximum de 2Mo"
            nativeInputProps={{
              ...register("certificateOfAttendanceFile"),
              accept: ".pdf",
            }}
            state={errors.certificateOfAttendanceFile ? "error" : "default"}
            stateRelatedMessage={
              errors.certificateOfAttendanceFile?.[0]?.message
            }
          />
          {contractorInvoiceFilesFields.map((c, i) => (
            <FancyUpload
              key={c.id}
              title="Joindre la facture acquittée des actes formatifs réalisés chez des prestataires autres que l'AAP (optionnel)"
              description="Déposez ici la facture acquittée du prestataire (hors AAP) auprès duquel le candidat a suivi sa formation. Les éléments affichés dans cette facture doivent correspondre avec l’assiduité du candidat"
              hint="Format supporté : PDF uniquement avec un poids maximum de 10Mo"
              nativeInputProps={{
                ...register(`contractorInvoiceFiles.${i}`, {
                  onChange: (e) => {
                    if (e.target.value) {
                      //if the file input has a value and it was the last empty one we add another empty file input
                      if (i == contractorInvoiceFilesFields.length - 1) {
                        insertContractorInvoiceFiles(
                          contractorInvoiceFilesFields.length,
                          [{ 0: undefined }],
                        );
                      }
                    } else {
                      removeContractorInvoiceFiles(i);
                    }
                  },
                }),
                accept: ".pdf",
              }}
              state={errors.contractorInvoiceFiles?.[i] ? "error" : "default"}
              stateRelatedMessage={errors.contractorInvoiceFiles?.[i]?.message}
            />
          ))}
        </Section>
        <Section title="2 - Confirmation">
          <Checkbox
            legend={
              <p className="font-medium">Avant de finaliser votre envoi :</p>
            }
            options={[
              {
                label:
                  "Je confirme le montant de paiement. Je ne pourrai pas modifier cette demande de paiement après son envoi.",
                nativeInputProps: { ...register("confirmation1Checked") },
              },
              {
                label:
                  "J’ai bien vérifié que le dossier de demande de paiement était correct et complet.",
                nativeInputProps: { ...register("confirmation2Checked") },
              },
              {
                label:
                  "J’ai bien vérifié que j’avais ajouté les différentes pièces justificatives nécessaires et qu’elles étaient correctes et complètes.",
                nativeInputProps: { ...register("confirmation3Checked") },
              },
            ]}
            state={
              errors.confirmation1Checked ||
              errors.confirmation2Checked ||
              errors.confirmation3Checked
                ? "error"
                : "default"
            }
            stateRelatedMessage={
              errors.confirmation1Checked?.message ||
              errors.confirmation2Checked?.message ||
              errors.confirmation3Checked?.message
            }
          />
        </Section>
        <FormButtons
          formState={{ isDirty, isSubmitting }}
          backUrl={`/candidacies/${candidacyId}/payment/unifvae/invoice/`}
          submitButtonLabel="Envoyer la demande de paiement"
        />
      </form>
    </div>
  );
};

export default PaymentRequestUniFvaeUploadPage;
