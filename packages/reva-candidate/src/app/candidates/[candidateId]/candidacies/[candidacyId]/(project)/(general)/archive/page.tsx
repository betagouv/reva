"use client";
import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import { Select } from "@codegouvfr/react-dsfr/Select";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import z from "zod";

import { BackButton } from "@/components/back-button/BackButton";
import { Panel } from "@/components/layout/Panel";
import { FormOptionalFieldsDisclaimer } from "@/components/legacy/atoms/FormOptionalFieldsDisclaimer/FormOptionalFieldsDisclaimer";
import { LoaderWithLayout } from "@/components/loaders/LoaderWithLayout";
import { graphqlErrorToast } from "@/components/toast/toast";

import { useArchive } from "./archive.hook";

const ARCHIVING_REASON_LABELS = {
  REPRISE_EMPLOI: "Reprise d'emploi",
  ENTREE_EN_FORMATION: "Entrée en formation",
  DECOURAGEMENT: "Découragement",
  RAISONS_PERSONNELLES: "Raisons personnelles (santé, famille)",
  CHANGEMENT_DE_PROJET: "Changement de projet",
  MANQUE_DE_TEMPS: "Manque de temps",
  NON_INTERESSE: "Pas / plus intéressé",
  REMUNERATION_NON_OBTENUE: "Remuneration non obtenue",
  AVIS_DEFAVORABLE_AAP:
    "Avis défavorable de l'Architecte accompagnateur de parcours",
  PROBLEME_FINANCEMENT_PARCOURS:
    "Problème pour financer le parcours (accompagnement, formation)",
  PROBLEME_FINANCEMENT_CERTIFICATEUR:
    "Problème pour financer les frais du certificateur (jury)",
  DELAIS_TROP_LONG: "Délais trop longs (recevabilité, jury)",
  REORIENTATION_HORS_FRANCE_VAE: "Réorientation hors France VAE",
  NON_OBTENTION_PRE_REQUIS: "Non obtention d’un pré-requis",
  CANDIDATURE_CREEE_PAR_ERREUR: "Candidature créée par erreur",
};

const schema = z.object({
  archivingReason: z.enum(
    [
      "REPRISE_EMPLOI",
      "ENTREE_EN_FORMATION",
      "DECOURAGEMENT",
      "RAISONS_PERSONNELLES",
      "CHANGEMENT_DE_PROJET",
      "MANQUE_DE_TEMPS",
      "NON_INTERESSE",
      "REMUNERATION_NON_OBTENUE",
      "AVIS_DEFAVORABLE_AAP",
      "PROBLEME_FINANCEMENT_PARCOURS",
      "PROBLEME_FINANCEMENT_CERTIFICATEUR",
      "DELAIS_TROP_LONG",
      "REORIENTATION_HORS_FRANCE_VAE",
      "NON_OBTENTION_PRE_REQUIS",
      "CANDIDATURE_CREEE_PAR_ERREUR",
    ],
    {
      message: "Veuillez sélectionner une option",
    },
  ),
});

export default function ArchiveCandidacyPage() {
  const {
    handleSubmit,
    register,
    formState: { isSubmitting, errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: standardSchemaResolver(schema),
  });

  const router = useRouter();

  const { candidacy, archiveCandidacyById, isArchiveLoading } = useArchive();

  if (isArchiveLoading) {
    return <LoaderWithLayout />;
  }

  if (!candidacy) {
    return null;
  }

  const candidateCertification =
    candidacy.certification &&
    `RNCP ${candidacy.certification?.codeRncp} : ${candidacy.certification?.label}`;

  const handleFormSubmit = handleSubmit(async (data) => {
    if (!candidacy?.id) {
      return;
    }

    try {
      const archivingReason = data.archivingReason;
      await archiveCandidacyById({
        candidacyId: candidacy.id,
        archivingReason,
      });
      toast.success("Candidature supprimée avec succès");
      router.push(`../../`);
    } catch (error) {
      graphqlErrorToast(error);
    }
  });

  const certificationLabel = `RNCP ${candidacy.certification?.codeRncp} : ${candidacy.certification?.label}`;

  return (
    <Panel>
      <Breadcrumb
        currentPageLabel="Suppression de la candidature"
        className="mb-0"
        segments={[
          {
            label: "Mes candidatures",
            linkProps: {
              href: "../../",
            },
          },
          {
            label: certificationLabel,
            linkProps: {
              href: "../",
            },
          },
        ]}
      />

      <div className="pr-[30%]">
        <h1 className="mt-6 mb-2">Suppression de la candidature</h1>
        <FormOptionalFieldsDisclaimer className="mb-12" />
        <p className="mb-6">
          Vous êtes sur le point de supprimer votre candidature sur la
          certification <strong>{candidateCertification}</strong>.
          <br />
          <br />
          Votre dossier de faisabilité n'a pas encore été envoyé au
          certificateur.
        </p>
        <p className="mb-6 text-lg font-bold">
          Quelles sont les conséquences d’une suppression à cette étape ?
        </p>
        <div className="fr-highlight mb-6">
          <ul>
            <li>
              les éléments renseignés dans cette candidature seront perdus
            </li>
            <li>
              une nouvelle candidature sur la même certification pourra être
              créée
            </li>
            <li>
              si un financement a été validé, tournez-vous vers votre
              accompagnateur. La gestion du financement se fait hors plateforme
              France VAE.
            </li>
          </ul>
        </div>
      </div>
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
        <div className="pr-[30%]">
          <Select
            label="Motif de la suppression :"
            nativeSelectProps={{
              ...register("archivingReason"),
              defaultValue: "",
            }}
            state={errors.archivingReason ? "error" : "default"}
            stateRelatedMessage={errors.archivingReason?.message}
          >
            <option value="" disabled>
              Sélectionner une option
            </option>
            {Object.entries(ARCHIVING_REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <p className="mb-6 font-bold">
            Confirmez-vous la suppression de cette candidature ?
          </p>
        </div>

        <div className="flex justify-between">
          <BackButton navigateBack={() => router.push("../")} />

          <Button
            type="submit"
            disabled={isSubmitting}
            className="self-end"
            data-testid="candidacy-archive-confirm-button"
          >
            Confirmer
          </Button>
        </div>
      </form>
    </Panel>
  );
}
