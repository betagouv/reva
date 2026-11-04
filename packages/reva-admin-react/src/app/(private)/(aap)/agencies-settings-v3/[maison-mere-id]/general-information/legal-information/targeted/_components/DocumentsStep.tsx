import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { FancyUpload } from "@/components/fancy-upload/FancyUpload";

import { DocumentKey } from "./requiredDocuments";

const ACCEPTED_FILE_TYPES = ".jpg,.jpeg,.png,.pdf";
const FILE_HINT =
  "Formats supportés : jpg, png, pdf avec un poids maximum de 15Mo";

const optionalFile = z
  .object({
    0: z.undefined().or(z.instanceof(File)),
  })
  .optional();

// Les pièces attendues dépendent des blocs mis à jour, choisis dans la page: le
// schéma est construit à partir de cette liste.
const buildSchema = (requiredDocuments: DocumentKey[]) =>
  z
    .object({
      attestationURSSAF: optionalFile,
      justificatifIdentiteDirigeant: optionalFile,
      lettreDeDelegation: optionalFile,
      justificatifIdentiteDelegataire: optionalFile,
    })
    .superRefine((files, { addIssue }) => {
      for (const document of requiredDocuments) {
        if (!files[document]?.[0]) {
          addIssue({
            path: [`${document}[0]`],
            message: "Merci de remplir ce champ",
            code: "custom",
          });
        }
      }
    });

export type DocumentsFormValues = z.infer<ReturnType<typeof buildSchema>>;

export const useDocumentsForm = (requiredDocuments: DocumentKey[]) =>
  useForm<DocumentsFormValues>({
    resolver: standardSchemaResolver(buildSchema(requiredDocuments)),
  });

const identityDocumentDescription = (person: string) => (
  <>
    Pour confirmer l’identité {person}, merci de transmettre l’un des
    justificatifs d’identité suivants :
    <ul>
      <li>
        Carte nationale d'identité recto/verso en cours de validité (ou dépassée
        depuis moins de 5 ans) ;
      </li>
      <li>Passeport en cours de validité.</li>
    </ul>
  </>
);

export const DocumentsStep = ({
  formHook: {
    register,
    formState: { errors },
  },
  requiredDocuments,
}: {
  formHook: UseFormReturn<DocumentsFormValues>;
  requiredDocuments: DocumentKey[];
}) => (
  <div className="flex flex-col gap-6">
    {requiredDocuments.includes("attestationURSSAF") && (
      <FancyUpload
        title="Attestation URSSAF ou attestation MSA"
        description={
          <>
            Merci de fournir une attestation URSSAF ou MSA{" "}
            <strong>datée de moins de 6 mois</strong> qui affiche les
            informations suivantes :
            <ul>
              <li>
                Le code de sécurité (visible sur l'attestation de vigilance,
                l'attestation fiscale ou l'attestation MSA) ;
              </li>
              <li>
                Le numéro de SIRET de la structure accompagnatrice (14 chiffres)
              </li>
            </ul>
          </>
        }
        hint={FILE_HINT}
        nativeInputProps={{
          ...register("attestationURSSAF"),
          accept: ACCEPTED_FILE_TYPES,
        }}
        state={errors.attestationURSSAF ? "error" : "default"}
        stateRelatedMessage={errors.attestationURSSAF?.[0]?.message}
      />
    )}
    {requiredDocuments.includes("justificatifIdentiteDirigeant") && (
      <FancyUpload
        title="Copie du justificatif d'identité du dirigeant"
        description={identityDocumentDescription("du dirigeant")}
        hint={FILE_HINT}
        nativeInputProps={{
          ...register("justificatifIdentiteDirigeant"),
          accept: ACCEPTED_FILE_TYPES,
        }}
        state={errors.justificatifIdentiteDirigeant ? "error" : "default"}
        stateRelatedMessage={errors.justificatifIdentiteDirigeant?.[0]?.message}
      />
    )}
    {requiredDocuments.includes("lettreDeDelegation") && (
      <>
        <FancyUpload
          title="Lettre de délégation"
          description="Il s'agit de la lettre de délégation de l'administration du compte France VAE signée par le dirigeant et le délégataire."
          hint={FILE_HINT}
          nativeInputProps={{
            ...register("lettreDeDelegation"),
            accept: ACCEPTED_FILE_TYPES,
          }}
          state={errors.lettreDeDelegation ? "error" : "default"}
          stateRelatedMessage={errors.lettreDeDelegation?.[0]?.message}
        />
        <FancyUpload
          title="Copie du justificatif d'identité du délégataire"
          description={identityDocumentDescription("du délégataire")}
          hint={FILE_HINT}
          nativeInputProps={{
            ...register("justificatifIdentiteDelegataire"),
            accept: ACCEPTED_FILE_TYPES,
          }}
          state={errors.justificatifIdentiteDelegataire ? "error" : "default"}
          stateRelatedMessage={
            errors.justificatifIdentiteDelegataire?.[0]?.message
          }
        />
      </>
    )}
  </div>
);
