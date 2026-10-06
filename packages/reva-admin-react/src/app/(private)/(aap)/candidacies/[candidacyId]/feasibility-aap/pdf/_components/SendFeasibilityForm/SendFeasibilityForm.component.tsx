import Alert from "@codegouvfr/react-dsfr/Alert";
import Button from "@codegouvfr/react-dsfr/Button";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import Select from "@codegouvfr/react-dsfr/Select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { ContactInfosSection } from "@/app/contact-infos-section/ContactInfosSection";
import { GrayCard } from "@/components/card/gray-card/GrayCard";
import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { FeasibilityDecisionHistory } from "@/components/feasibility-decision-history/FeasibilityDecisionHistory";
import { errorToast, graphqlErrorToast } from "@/components/toast/toast";

import { FeasibilityHistory } from "@/graphql/generated/graphql";

import { useSendFeasibilityForm } from "./SendFeasibilityForm.hooks";

const schema = z.object({
  feasibilityFile: z.object({
    0: z.instanceof(File, { message: "Merci de remplir ce champ" }),
  }),
  idFile: z.object({
    0: z.instanceof(File, { message: "Merci de remplir ce champ" }),
  }),
  documentaryProofFile: z.object({ 0: z.instanceof(File).optional() }),
  certificateOfAttendanceFile: z.object({ 0: z.instanceof(File).optional() }),
  requirements: z
    .object({ id: z.string(), label: z.string(), checked: z.boolean() })
    .array(),
});

type FeasibilityFormData = z.infer<typeof schema>;

interface Props {
  candidacyId: string;
}

export const SendFeasibilityForm = (props: Props): React.ReactNode => {
  const { candidacyId } = props;

  const { candidacy, sendFeasibility } = useSendFeasibilityForm(candidacyId);

  const feasibility = candidacy.data?.getCandidacyById?.feasibility;
  const organism = candidacy.data?.getCandidacyById?.organism;
  const candidate = candidacy.data?.getCandidacyById?.candidate;
  const certification = candidacy.data?.getCandidacyById?.certification;
  const warningOnFeasibilitySubmission =
    candidacy.data?.getCandidacyById?.warningOnFeasibilitySubmission;

  const certificationAuthorities = useMemo(
    () => candidacy.data?.getCandidacyById?.certificationAuthorities || [],
    [candidacy.data?.getCandidacyById?.certificationAuthorities],
  );

  const [certificationAuthorityId, setCertificationAuthorityId] = useState<
    string | undefined
  >();

  const certificationAuthority = certificationAuthorities.find(
    (c) => c.id == certificationAuthorityId,
  );

  useEffect(() => {
    if (certificationAuthorities.length == 1) {
      setCertificationAuthorityId(certificationAuthorities[0].id);
    }
  }, [certificationAuthorities]);

  const certificationAuthorityLocalAccounts =
    certificationAuthority?.certificationAuthorityLocalAccounts;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FeasibilityFormData>({
    resolver: zodResolver(schema),
    mode: "all",
    defaultValues: {
      requirements: [
        {
          id: "0",
          label:
            "J'ai bien vérifié que le dossier de faisabilité était correct, complet et signé par moi-même ainsi que par le candidat.",
          checked: false,
        },
        {
          id: "1",
          label:
            "J'ai bien vérifié que la pièce d’identité était conforme, en cours de validité et lisible.",
          checked: false,
        },
      ],
    },
  });

  const { fields: requirements } = useFieldArray({
    control,
    name: "requirements",
  });

  const handleFormSubmit = handleSubmit(async (data) => {
    if (!candidacyId || !certificationAuthority) {
      return;
    }

    try {
      const response = await sendFeasibility.mutateAsync({
        candidacyId,
        certificationAuthorityId: certificationAuthority.id,
        feasibilityFile: data.feasibilityFile[0],
        IDFile: data.idFile[0],
        documentaryProofFile: data.documentaryProofFile?.[0],
        certificateOfAttendanceFile: data.certificateOfAttendanceFile?.[0],
      });

      const textError = await response.text();
      if (textError) {
        if (response.status == 413) {
          errorToast(
            "Le fichier que vous tentez d'envoyer est trop volumineux. Veuillez soumettre un fichier d'une taille égale ou inférieure à 20 Mo.",
          );
        } else {
          errorToast(textError);
        }
      }
    } catch (error) {
      graphqlErrorToast(error);
    }
  });

  let feasibilityHistory: FeasibilityHistory[] = feasibility?.history || [];
  if (feasibility?.decision == "INCOMPLETE") {
    feasibilityHistory = [
      {
        id: feasibility.id,
        decision: feasibility.decision,
        decisionComment: feasibility.decisionComment,
        decisionSentAt: feasibility.decisionSentAt,
      },
      ...feasibilityHistory,
    ];
  }

  if (candidacy.status !== "success") {
    return null;
  }

  if (!certificationAuthorities.length) {
    return (
      <Alert
        className="mt-4"
        small
        severity="warning"
        title="Attention"
        description="Aucun certificateur n'est actuellement rattaché à cette certification
          pour le département de la candidature. Il n'est donc pas actuellement
          possible de remplir le dossier de faisabilité."
      />
    );
  }

  return (
    <>
      {warningOnFeasibilitySubmission ===
        "MAX_SUBMISSIONS_UNIQUE_CERTIFICATION_REACHED" && (
        <Alert
          className="mt-6 mb-12"
          severity="error"
          title="Une demande de recevabilité existe déjà pour ce diplôme"
          description={`${candidate?.lastname} ${candidate?.firstname} a déjà transmis une demande de recevabilité pour la certification ${certification?.label}, visée en totalité, en ${new Date().getFullYear()}. Vous pouvez reprendre la candidature existante si elle a été abandonnée, ou soumettre une nouvelle demande à partir de Janvier ${new Date().getFullYear() + 1}.`}
        />
      )}

      {warningOnFeasibilitySubmission ===
        "MAX_SUBMISSIONS_CROSS_CERTIFICATION_REACHED" && (
        <Alert
          className="mt-6 mb-12"
          severity="error"
          title="Nombre maximum de demandes de recevabilité atteintes"
          description={`${candidate?.lastname} ${candidate?.firstname} a déjà transmis 3 demandes de recevabilité sur des certifications visées en totalité pour l’année ${new Date().getFullYear()}. Vous pourrez soumettre le dossier de faisabilité pour la certification ${certification?.label}, visée en totalité, à partir de Janvier ${new Date().getFullYear() + 1}.`}
        />
      )}

      <h5 className="mb-0">Pièces jointes</h5>

      <Alert
        severity="info"
        small
        description={
          <p>
            Si vous ne joignez pas la bonne pièce, cliquez à nouveau sur le
            bouton <strong className="italic">“Parcourir”</strong> pour la
            remplacer par la pièce valide.
          </p>
        }
      />

      <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
        <FancyUpload
          title="Joindre le dossier de faisabilité"
          description="Le dossier doit être complet et signé par vous-même et le candidat. Pensez à vérifier que vous avez tout saisi avant l’envoi."
          hint="Format supporté : PDF uniquement avec un poids maximum de 20 Mo"
          nativeInputProps={{
            ...register("feasibilityFile"),
            accept: ".pdf",
            disabled: warningOnFeasibilitySubmission !== "NONE",
          }}
          state={errors.feasibilityFile ? "error" : "default"}
          stateRelatedMessage={errors.feasibilityFile?.[0]?.message}
        />
        <FancyUpload
          title="Joindre la pièce d’identité (carte identité, passeport, carte de séjour)"
          description="Copie ou scan lisible (la photo ne doit pas être floue) et en cours de validité. Cette pièce sera demandée au candidat pour justifier de son identité lors du passage devant jury et la délivrance éventuelle du diplôme."
          hint="Formats supportés : jpg, png, pdf avec un poids maximum de 2Mo"
          nativeInputProps={{
            ...register("idFile"),
            disabled: warningOnFeasibilitySubmission !== "NONE",
          }}
          state={errors.idFile ? "error" : "default"}
          stateRelatedMessage={errors.idFile?.[0]?.message}
        />
        <FancyUpload
          title="Joindre une autre pièce (optionnel)"
          description="Copie du ou des justificatif(s) ouvrant accès à une équivalence ou dispense en lien avec la certification visée."
          hint="Format supporté : PDF uniquement avec un poids maximum de 20 Mo"
          nativeInputProps={{
            ...register("documentaryProofFile"),
            accept: ".pdf",
            disabled: warningOnFeasibilitySubmission !== "NONE",
          }}
          state={errors.documentaryProofFile ? "error" : "default"}
          stateRelatedMessage={errors.documentaryProofFile?.[0]?.message}
        />
        <FancyUpload
          title="Joindre une autre pièce (optionnel)"
          description="Attestation ou certificat de suivi de formation dans le cas du prérequis demandé par la certification visée."
          hint="Format supporté : PDF uniquement avec un poids maximum de 20 Mo"
          nativeInputProps={{
            ...register("certificateOfAttendanceFile"),
            accept: ".pdf",
            disabled: warningOnFeasibilitySubmission !== "NONE",
          }}
          state={errors.certificateOfAttendanceFile ? "error" : "default"}
          stateRelatedMessage={errors.certificateOfAttendanceFile?.[0]?.message}
        />

        {certificationAuthorities.length > 1 && (
          <Select
            label={
              <label className="block mt-[6px] mb-[10px] text-xs font-semibold">
                SÉLECTIONNEZ L'AUTORITÉ DE CERTIFICATION
              </label>
            }
            nativeSelectProps={{
              onChange: (event) =>
                setCertificationAuthorityId(event.target.value),
              value: certificationAuthorityId || "",
              required: true,
            }}
            disabled={warningOnFeasibilitySubmission !== "NONE"}
          >
            <>
              <option disabled hidden value="">
                Sélectionner
              </option>
              {certificationAuthorities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </>
          </Select>
        )}

        {certificationAuthority && (
          <ContactInfosSection
            certificationAuthority={certificationAuthority}
            certificationAuthorityLocalAccounts={
              certificationAuthorityLocalAccounts
            }
            organism={organism}
          />
        )}

        <FeasibilityDecisionHistory history={feasibilityHistory} />

        <fieldset>
          <h4>Avant de finaliser votre envoi</h4>
          <GrayCard>
            <Checkbox
              className="mb-0"
              options={requirements.map((option, optionId) => ({
                label: option.label,
                nativeInputProps: {
                  required: true,
                  ...register(`requirements.${optionId}.checked`),
                  disabled: warningOnFeasibilitySubmission !== "NONE",
                },
              }))}
            />
          </GrayCard>
        </fieldset>

        <div className="flex flex-row justify-end">
          <Button
            priority="primary"
            type="submit"
            disabled={
              sendFeasibility.isPending ||
              warningOnFeasibilitySubmission !== "NONE"
            }
          >
            Valider
          </Button>
        </div>
      </form>
    </>
  );
};
