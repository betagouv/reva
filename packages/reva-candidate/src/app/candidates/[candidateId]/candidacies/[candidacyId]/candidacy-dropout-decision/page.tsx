"use client";

import { Card } from "@codegouvfr/react-dsfr/Card";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { Tag } from "@codegouvfr/react-dsfr/Tag";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format, toDate, addMonths } from "date-fns";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useFeatureFlipping } from "@/components/feature-flipping/featureFlipping";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { Panel } from "@/components/layout/Panel";
import { FormOptionalFieldsDisclaimer } from "@/components/legacy/atoms/FormOptionalFieldsDisclaimer/FormOptionalFieldsDisclaimer";
import { LoaderWithLayout } from "@/components/loaders/LoaderWithLayout";
import { graphqlErrorToast } from "@/components/toast/toast";
import { isDropOutConfirmed } from "@/utils/dropOutHelper";

import { OrganismModaliteAccompagnement } from "@/graphql/generated/graphql";

import { useDropOutDecisionPage } from "./dropOutDecision.hooks";

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
  dropOutConfirmed: z.enum(["DROP_OUT_CONFIRMED", "DROP_OUT_CANCELED"], {
    message: "Merci de choisir une option",
  }),
});

type FormData = z.infer<typeof schema>;

export default function CandidacyDropOutDecisionPage() {
  const { isFeatureActive } = useFeatureFlipping();
  const isMiddleNamesEnabled = isFeatureActive("MIDDLE_NAMES");

  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
  });

  const {
    candidacy,
    isDropOutDecisionLoading,
    updateCandidateCandidacyDropoutDecision,
  } = useDropOutDecisionPage();

  if (isDropOutDecisionLoading) {
    return <LoaderWithLayout />;
  }

  if (!candidacy) {
    return null;
  }

  const dropOutConfirmed =
    candidacy.candidacyDropOut &&
    isDropOutConfirmed({
      dropOutConfirmedByCandidate:
        candidacy.candidacyDropOut.dropOutConfirmedByCandidate,
      proofReceivedByAdmin: candidacy.candidacyDropOut.proofReceivedByAdmin,
      dropOutDate: toDate(candidacy.candidacyDropOut.createdAt),
    });

  if (
    !candidacy.candidacyDropOut ||
    (dropOutConfirmed && !updateCandidateCandidacyDropoutDecision.isSuccess)
  ) {
    return router.push("../");
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
    try {
      const dropOutConfirmed = data.dropOutConfirmed === "DROP_OUT_CONFIRMED";
      await updateCandidateCandidacyDropoutDecision.mutateAsync({
        dropOutConfirmed,
      });

      if (dropOutConfirmed) {
        router.push("./dropout-confirmation");
      }
    } catch (e) {
      graphqlErrorToast(e);
    }
  });

  return (
    <Panel>
      <div data-testid="candidacy-dropout-decision-page">
        <h1 className="mt-6 mb-2">Abandon d’une candidature VAE</h1>
        <FormOptionalFieldsDisclaimer />
        <p className="text-xl mb-12">
          Votre accompagnateur a déclaré l’abandon un de vos parcours VAE. Sans
          réponse de votre part avant le{" "}
          {format(
            addMonths(
              toDate(candidacy.candidacyDropOut?.createdAt || new Date()),
              6,
            ),
            "dd/MM/yyyy",
          )}{" "}
          votre parcours sera considéré en abandon.{" "}
          <strong>
            Vos autres candidatures ne sont pas affectées par cette décision.
          </strong>
        </p>
        <div className="mb-12">
          <p className="text-md font-bold mb-4">
            Candidature concernée par cet abandon
          </p>
          <Card
            start={getBadge({ modaliteAccompagnement })}
            imageComponent={null}
            title={candidateFullName}
            desc={
              <div className="flex flex-col">
                <span>{candidateCertification}</span>
                <span>{candidacy.organism?.label}</span>
              </div>
            }
            detail={<span className="mt-2">{candidateDepartment}</span>}
            titleAs="h6"
            endDetail={
              admissibleDate
                ? `Recevable le ${format(new Date(admissibleDate), "dd/MM/yyyy")}`
                : null
            }
          />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFormSubmit(e);
          }}
          className="flex flex-col gap-6"
        >
          <RadioButtons
            legend="Voulez-vous continuer un parcours de VAE sur cette candidature ?"
            stateRelatedMessage={errors.dropOutConfirmed?.message}
            state={errors.dropOutConfirmed ? "error" : "default"}
            className="hide-radio-img"
            options={[
              {
                label: "Oui, je continue ce parcours VAE",
                illustration: null,
                hintText: "Votre parcours continue !",
                nativeInputProps: {
                  className: "drop-out-cancelation-radio-button",
                  value: "DROP_OUT_CANCELED",
                  ...register("dropOutConfirmed"),
                },
              },
              {
                label: "Non, je souhaite arrêter ce parcours VAE",
                illustration: null,
                hintText:
                  "Votre parcours sera considéré en abandon. Vous ne pourrez pas finaliser votre VAE.",
                nativeInputProps: {
                  className: "drop-out-confirmation-radio-button",
                  value: "DROP_OUT_CONFIRMED",
                  ...register("dropOutConfirmed"),
                },
              },
            ]}
          />
          <FormButtons
            formState={{
              isDirty,
              isSubmitting,
            }}
          />
        </form>
      </div>
    </Panel>
  );
}
