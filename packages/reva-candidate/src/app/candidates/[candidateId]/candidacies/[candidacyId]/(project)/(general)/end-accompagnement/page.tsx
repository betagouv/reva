"use client";
import Button from "@codegouvfr/react-dsfr/Button";
import Card from "@codegouvfr/react-dsfr/Card";
import RadioButtons from "@codegouvfr/react-dsfr/RadioButtons";
import Tag from "@codegouvfr/react-dsfr/Tag";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import z from "zod";

import { useFeatureFlipping } from "@/components/feature-flipping/featureFlipping";
import { Panel } from "@/components/layout/Panel";
import { FormOptionalFieldsDisclaimer } from "@/components/legacy/atoms/FormOptionalFieldsDisclaimer/FormOptionalFieldsDisclaimer";
import { LoaderWithLayout } from "@/components/loaders/LoaderWithLayout";
import { graphqlErrorToast } from "@/components/toast/toast";

import { OrganismModaliteAccompagnement } from "@/graphql/generated/graphql";

import { useEndAccompagnement } from "./end-accompagnement.hook";

const getBadge = ({
  modaliteAccompagnement,
}: {
  modaliteAccompagnement?: OrganismModaliteAccompagnement;
}) => {
  if (modaliteAccompagnement === "A_DISTANCE") {
    return (
      <Tag small iconId="fr-icon-headphone-fill">
        À distance
      </Tag>
    );
  }

  if (modaliteAccompagnement === "LIEU_ACCUEIL") {
    return (
      <Tag small iconId="fr-icon-home-4-fill">
        Sur site
      </Tag>
    );
  }

  return null;
};

const schema = z.object({
  endAccompagnement: z.enum(["CONFIRMED", "REFUSED"], {
    message: "Veuillez sélectionner une option",
  }),
});

export default function EndAccompagnementPage() {
  const { isFeatureActive } = useFeatureFlipping();
  const isMiddleNamesEnabled = isFeatureActive("MIDDLE_NAMES");

  const {
    handleSubmit,
    register,
    formState: { isSubmitting, errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: standardSchemaResolver(schema),
  });

  const {
    candidacy,
    updateCandidacyEndAccompagnementDecision,
    isEndAccompagnementLoading,
  } = useEndAccompagnement();

  if (isEndAccompagnementLoading) {
    return <LoaderWithLayout />;
  }

  if (!candidacy) {
    return null;
  }

  if (candidacy.endAccompagnementStatus !== "PENDING") {
    return redirect("../");
  }

  const candidate = candidacy.candidate;

  const middleNames = isMiddleNamesEnabled
    ? candidate.middleNames
    : `${candidate?.firstname2 ? `${candidate?.firstname2}` : ""}${candidate?.firstname3 ? ` ${candidate?.firstname3}` : ""}`;

  const candidateFullName = `${candidate?.lastname} ${candidate?.givenName ? candidate?.givenName : ""} ${candidate?.firstname}${middleNames ? ` ${middleNames}` : ""}`;
  const candidateDepartment = `${candidate?.department?.label} (${candidate?.department?.code})`;
  const candidateCertification =
    candidacy.certification &&
    `RNCP ${candidacy.certification?.codeRncp} : ${candidacy.certification?.label}`;
  const modaliteAccompagnement = candidacy.organism?.modaliteAccompagnement;
  const admissibleDate = candidacy.feasibility?.decisionSentAt;

  const handleFormSubmit = handleSubmit(async (data) => {
    if (!candidacy?.id) {
      return;
    }

    try {
      const endAccompagnement = data.endAccompagnement === "CONFIRMED";
      await updateCandidacyEndAccompagnementDecision({
        candidacyId: candidacy.id,
        endAccompagnement,
      });
      toast.success("Décision enregistrée");
    } catch (error) {
      graphqlErrorToast(error);
    }
  });

  return (
    <Panel>
      <h1 className="mt-6 mb-2">Fin d'accompagnement</h1>
      <FormOptionalFieldsDisclaimer className="mb-6" />
      <p className="text-xl mb-12">
        Votre accompagnateur a déclaré la fin de votre accompagnement sur ce
        parcours de VAE
        {candidacy.endAccompagnementDate
          ? ` en date du ${format(new Date(candidacy.endAccompagnementDate), "dd/MM/yyyy")}`
          : ""}
        . Vous avez la possibilité de confirmer ou de refuser cette fin
        d'accompagnement. Cette décision ne concerne que la candidature
        ci-dessous. Dans tous les cas, vous aurez toujours accès à votre
        candidature pour finaliser votre VAE.
      </p>
      <div className="mb-12">
        <p className="text-md font-bold mb-4">
          Candidature concernée par la fin d’accompagnement
        </p>
        <Card
          start={getBadge({ modaliteAccompagnement })}
          imageComponent={null}
          title={candidateFullName}
          desc={
            <span className="flex flex-col">
              <span>{candidateCertification}</span>
              <span>{candidacy.organism?.label}</span>
            </span>
          }
          detail={<span className="mt-2">{candidateDepartment}</span>}
          titleAs="h6"
          endDetail={
            admissibleDate
              ? `Recevable le ${format(new Date(admissibleDate), "dd/MM/yyyy")}`
              : `Créée le ${format(new Date(candidacy.createdAt), "dd/MM/yyyy")}`
          }
        />
      </div>
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
        <RadioButtons
          legend="Voulez-vous accepter la fin de votre accompagnement pour cette candidature France VAE ?"
          stateRelatedMessage={errors.endAccompagnement?.message}
          state={errors.endAccompagnement ? "error" : "default"}
          data-testid="candidacy-end-accompagnement-radio-buttons"
          className="hide-radio-img"
          options={[
            {
              label:
                "Oui, mon accompagnement est terminé pour cette candidature.",
              illustration: null,
              hintText: "Votre parcours continue !",
              nativeInputProps: {
                ...register("endAccompagnement"),
                value: "CONFIRMED",
              },
            },
            {
              label:
                "Non, je souhaite continuer mon accompagnement pour cette candidature.",
              illustration: null,
              hintText: "Reprenez votre accompagnement comme précédemment.",
              nativeInputProps: {
                ...register("endAccompagnement"),
                value: "REFUSED",
              },
            },
          ]}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex self-end"
          data-testid="candidacy-end-accompagnement-confirm-button"
        >
          Confirmer la décision
        </Button>
      </form>
    </Panel>
  );
}
