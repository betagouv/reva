import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useKeycloakContext } from "@/components/auth/keycloakContext";
import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { errorToast, successToast } from "@/components/toast/toast";
import { REST_API_URL } from "@/config/config";
import { sanitizedText } from "@/utils/input-sanitization";

const schema = z
  .object({
    managerFirstname: sanitizedText(),
    managerLastname: sanitizedText(),
    attestationURSSAF: z.object({
      0: z.instanceof(File, { message: "Merci de remplir ce champ" }),
    }),
    justificatifIdentiteDirigeant: z.object({
      0: z.instanceof(File, { message: "Merci de remplir ce champ" }),
    }),

    delegataire: z.boolean(),
    lettreDeDelegation: z
      .object({
        0: z.undefined().or(z.instanceof(File)),
      })
      .optional(),
    justificatifIdentiteDelegataire: z
      .object({
        0: z.undefined().or(z.instanceof(File)),
      })
      .optional(),
  })
  .superRefine(
    (
      { lettreDeDelegation, justificatifIdentiteDelegataire, delegataire },
      { addIssue },
    ) => {
      if (delegataire) {
        if (!lettreDeDelegation?.[0]) {
          addIssue({
            path: ["lettreDeDelegation[0]"],
            message: "Merci de remplir ce champ",
            code: "custom",
          });
        }
        if (!justificatifIdentiteDelegataire?.[0]) {
          addIssue({
            path: ["justificatifIdentiteDelegataire[0]"],
            message: "Merci de remplir ce champ",
            code: "custom",
          });
        }
      }
    },
  );

type FormData = z.infer<typeof schema>;

export const LegalInformationUpdateForm = ({
  maisonMereAAPId,
  backUrl,
}: {
  maisonMereAAPId: string;
  backUrl: string;
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
  });

  const { delegataire } = useWatch({ control });
  const { accessToken } = useKeycloakContext();

  const queryClient = useQueryClient();

  const router = useRouter();

  const handleFormSubmit = handleSubmit(
    async (data) => {
      const formData = new FormData();
      formData.append("managerFirstname", data.managerFirstname);
      formData.append("managerLastname", data.managerLastname);
      formData.append("delegataire", data.delegataire.toString());

      if (data.attestationURSSAF?.[0]) {
        formData.append("attestationURSSAF", data.attestationURSSAF?.[0]);
      }
      if (data.justificatifIdentiteDirigeant?.[0]) {
        formData.append(
          "justificatifIdentiteDirigeant",
          data.justificatifIdentiteDirigeant?.[0],
        );
      }
      if (data.lettreDeDelegation?.[0]) {
        formData.append("lettreDeDelegation", data.lettreDeDelegation?.[0]);
      }
      if (data.justificatifIdentiteDelegataire?.[0]) {
        formData.append(
          "justificatifIdentiteDelegataire",
          data.justificatifIdentiteDelegataire?.[0],
        );
      }

      const result = await fetch(
        `${REST_API_URL}/maisonMereAAP/${maisonMereAAPId}/legal-information`,
        {
          method: "post",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        },
      );
      if (result.ok) {
        successToast("Modifications enregistrées");
        queryClient.invalidateQueries({
          queryKey: ["maisonMereAAPLegalInformation"],
        });
        router.push(backUrl);
      } else {
        errorToast(await result.text());
      }
    },
    (e) => console.log({ e }),
  );

  return (
    <div className="flex flex-col">
      <h2>Informations du dirigeant</h2>
      <form
        className="grid grid-cols-2 gap-x-4 gap-y-8"
        onSubmit={handleFormSubmit}
      >
        <Input
          className="my-0"
          label="Prénom"
          nativeInputProps={{ ...register("managerFirstname") }}
          state={errors.managerFirstname ? "error" : "default"}
          stateRelatedMessage={errors.managerFirstname?.message}
        />
        <Input
          className="my-0"
          label="Nom"
          nativeInputProps={{ ...register("managerLastname") }}
          state={errors.managerLastname ? "error" : "default"}
          stateRelatedMessage={errors.managerLastname?.message}
        />

        <FancyUpload
          className="col-span-2"
          title="Attestation URSSAF"
          description="L’attestation URSSAF doit afficher le code de sécurité -
         Exemples : attestation de vigilance, attestation fiscale."
          hint="Format supporté : PDF uniquement avec un poids maximum de 2Mo"
          nativeInputProps={{
            ...register("attestationURSSAF"),
            accept: ".pdf",
          }}
          state={errors.attestationURSSAF ? "error" : "default"}
          stateRelatedMessage={errors.attestationURSSAF?.[0]?.message}
        />
        <FancyUpload
          className="col-span-2"
          title="Copie du justificatif d'identité du dirigeant"
          description={
            <>
              La pièce d’identité peut être une carte nationale d’identité en
              cours de validité ou périmée de moins de 5 ans (recto/verso) ou un
              passeport en cours de validité.
              <br />
              <strong>
                Veillez à ce que la photocopie soit lisible, non tronquée, et
                bien cadrée.
              </strong>
            </>
          }
          hint="Format supporté : PDF uniquement avec un poids maximum de 2Mo"
          nativeInputProps={{
            ...register("justificatifIdentiteDirigeant"),
            accept: ".pdf",
          }}
          state={errors.justificatifIdentiteDirigeant ? "error" : "default"}
          stateRelatedMessage={
            errors.justificatifIdentiteDirigeant?.[0]?.message
          }
        />

        <Checkbox
          className="col-span-2 mt-4 mb-0"
          options={[
            {
              label: "Je souhaite déclarer un délégataire",
              nativeInputProps: { ...register("delegataire") },
              hintText:
                "Lorsque l’administrateur du compte France VAE est différent du dirigeant.",
            },
          ]}
        />
        {delegataire && (
          <>
            <FancyUpload
              className="col-span-2"
              title="Lettre de délégation"
              description="Il s'agit de la lettre de délégation de l'administration du compte France VAE signée et datée par le dirigeant et le délégataire"
              hint="Format supporté : PDF uniquement avec un poids maximum de 2Mo"
              nativeInputProps={{
                ...register("lettreDeDelegation"),
                accept: ".pdf",
              }}
              state={errors.lettreDeDelegation ? "error" : "default"}
              stateRelatedMessage={errors.lettreDeDelegation?.[0]?.message}
            />

            <FancyUpload
              className="col-span-2"
              title="Copie du justificatif d'identité du délégataire"
              description={
                <>
                  Le justificatif d'identité peut être une carte nationale
                  d’identité en cours de validité ou périmée de moins de 5 ans
                  (recto/verso) ou un passeport en cours de validité.
                  <br />
                  <strong>
                    Veillez à ce que votre photocopie soit lisible, non
                    tronquée, bien cadrée.
                  </strong>
                </>
              }
              hint="Format supporté : PDF uniquement avec un poids maximum de 2Mo"
              nativeInputProps={{
                ...register("justificatifIdentiteDelegataire"),
                accept: ".pdf",
              }}
              state={
                errors.justificatifIdentiteDelegataire ? "error" : "default"
              }
              stateRelatedMessage={
                errors.justificatifIdentiteDelegataire?.[0]?.message
              }
            />
          </>
        )}
        <FormButtons
          backUrl={backUrl}
          formState={{ isDirty, isSubmitting }}
          className="col-span-2"
        />
      </form>
    </div>
  );
};
