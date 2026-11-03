"use client";
import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import { Highlight } from "@codegouvfr/react-dsfr/Highlight";
import { Select } from "@codegouvfr/react-dsfr/Select";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format, toDate } from "date-fns";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import z from "zod";

import { BackButton } from "@/components/back-button/BackButton";
import { Panel } from "@/components/layout/Panel";
import { FormOptionalFieldsDisclaimer } from "@/components/legacy/atoms/FormOptionalFieldsDisclaimer/FormOptionalFieldsDisclaimer";
import { LoaderWithLayout } from "@/components/loaders/LoaderWithLayout";
import { graphqlErrorToast } from "@/components/toast/toast";
import { sanitizedText } from "@/utils/input-sanitization";

import { CandidacyStatusStep } from "@/graphql/generated/graphql";

import { useDropout, CandidacyTypeForDropout } from "./dropout.hook";

const schema = z.object({
  dropOutReasonId: sanitizedText(),
});

export default function DropoutCandidacyPage() {
  const {
    handleSubmit,
    register,
    formState: { isSubmitting, errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: standardSchemaResolver(schema),
  });

  const router = useRouter();

  const {
    candidacy,
    dropoutCandidacyById,
    isDropoutLoading,
    activeDropoutReasons,
  } = useDropout();

  if (isDropoutLoading) {
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
      await dropoutCandidacyById({
        candidacyId: candidacy.id,
        dropoutReasonId: data.dropOutReasonId,
      });
      toast.success("Candidature abandonnée avec succès");
      router.push(`../`);
    } catch (error) {
      graphqlErrorToast(error);
    }
  });

  const certificationLabel = `RNCP ${candidacy.certification?.codeRncp} : ${candidacy.certification?.label}`;

  const isFeasibilityDecisionPending =
    candidacy.status === "DOSSIER_FAISABILITE_ENVOYE" ||
    candidacy.status === "DOSSIER_FAISABILITE_COMPLET";

  if (isFeasibilityDecisionPending) {
    return (
      <Panel>
        <Breadcrumb
          currentPageLabel="Abandon de la candidature"
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
          <h1 className="mt-6 mb-2">Abandon de la candidature</h1>
          <p className="mt-12 mb-6">
            Un <strong>dossier de faisabilité</strong> a été envoyé le{" "}
            {candidacy.feasibility?.feasibilityFileSentAt ? (
              <strong>
                {format(
                  toDate(candidacy.feasibility.feasibilityFileSentAt),
                  "dd/MM/yyyy",
                )}
              </strong>
            ) : (
              ""
            )}{" "}
            sur cette candidature.
          </p>

          <p className="mb-6 text-lg font-bold">
            Vous ne pouvez pas abandonner à cette étape.
          </p>

          <Highlight className="mb-12">
            Vous pourrez abandonner dès que le certificateur aura donné sa
            décision.
          </Highlight>

          <div className="flex justify-between">
            <BackButton navigateBack={() => router.push("../")} />
          </div>
        </div>
      </Panel>
    );
  }

  const isFeasibilityDecisionHasBeenMade = isFeasibilityDecisionMade(
    candidacy.status,
  );

  return (
    <Panel>
      <Breadcrumb
        currentPageLabel="Abandon de la candidature"
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
        <h1 className="mt-6 mb-2">Abandon de la candidature</h1>
        <FormOptionalFieldsDisclaimer className="mb-12" />
        <p className="mb-6">
          Vous êtes sur le point d'abandonner votre candidature sur la
          certification <strong>{candidateCertification}</strong>.
          {isFeasibilityDecisionHasBeenMade ? (
            <>
              <br />
              <br />
              {getCandidacyStatusDescription(candidacy)}
            </>
          ) : (
            <>
              <br />
              <br />
              Votre dossier de faisabilité n'a pas encore été envoyé au
              certificateur.
            </>
          )}
        </p>
        <p className="mb-6 text-lg font-bold">
          Quelles sont les conséquences d’un abandon à cette étape ?
        </p>
        <Highlight className="mb-6">
          {isFeasibilityDecisionHasBeenMade ? (
            <ul>
              <li>
                Vous ne pourrez pas continuer votre parcours, déposer votre
                dossier de validation et passer devant le jury
              </li>
              <li>
                Si un financement a été validé, tournez-vous vers votre
                accompagnateur. La gestion du financement se fait hors
                plateforme France VAE.
              </li>
            </ul>
          ) : (
            <ul>
              <li>
                Une nouvelle candidature sur la même certification pourra être
                créée
              </li>
              <li>
                Si un financement a été validé, tournez-vous vers votre
                accompagnateur. La gestion du financement se fait hors
                plateforme France VAE.
              </li>
            </ul>
          )}
        </Highlight>
      </div>

      <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
        <div className="pr-[30%]">
          <Select
            label="Motif de l'abandon :"
            nativeSelectProps={{
              ...register("dropOutReasonId"),
              defaultValue: "",
            }}
            state={errors.dropOutReasonId ? "error" : "default"}
            stateRelatedMessage={errors.dropOutReasonId?.message}
          >
            <option value="" disabled>
              Sélectionner une option
            </option>
            {activeDropoutReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.label}
              </option>
            ))}
          </Select>

          <p className="mb-6 font-bold">
            Confirmez-vous l'abandon de cette candidature ?
          </p>
        </div>

        <div className="flex justify-between">
          <BackButton navigateBack={() => router.push("../")} />

          <Button
            type="submit"
            disabled={isSubmitting}
            className="self-end"
            data-testid="candidacy-dropout-confirm-button"
          >
            Confirmer
          </Button>
        </div>
      </form>
    </Panel>
  );
}

const getCandidacyStatusDescription = (candidacy: CandidacyTypeForDropout) => {
  const { feasibility, activeDossierDeValidation, jury } = candidacy;

  if (jury?.dateOfResult) {
    return (
      <span>
        Un <strong>jury</strong> a été passé le{" "}
        <strong>{format(toDate(jury.dateOfResult), "dd/MM/yyyy")}</strong> pour
        cette candidature.
      </span>
    );
  }

  if (jury?.dateOfSession) {
    return (
      <span>
        Un <strong>jury</strong> est programmé le{" "}
        <strong>{format(toDate(jury.dateOfSession), "dd/MM/yyyy")}</strong> pour
        cette candidature.
      </span>
    );
  }

  if (
    activeDossierDeValidation?.decision === "INCOMPLETE" &&
    activeDossierDeValidation?.decisionSentAt
  ) {
    return (
      <span>
        Un <strong>dossier de validation</strong> a été signalé le{" "}
        <strong>
          {format(
            toDate(activeDossierDeValidation.decisionSentAt),
            "dd/MM/yyyy",
          )}
        </strong>{" "}
        pour cette candidature.
      </span>
    );
  }

  if (activeDossierDeValidation?.decision === "PENDING") {
    return (
      <span>
        Un <strong>dossier de validation</strong> a été envoyé le{" "}
        <strong>
          {format(toDate(activeDossierDeValidation.createdAt), "dd/MM/yyyy")}
        </strong>{" "}
        pour cette candidature.
      </span>
    );
  }

  if (feasibility?.decision === "ADMISSIBLE" && feasibility?.decisionSentAt) {
    return (
      <span>
        Une <strong>recevabilité favorable</strong> a été attribuée le{" "}
        <strong>
          {format(toDate(feasibility.decisionSentAt), "dd/MM/yyyy")}
        </strong>{" "}
        pour cette candidature.
      </span>
    );
  }

  if (feasibility?.decision === "INCOMPLETE" && feasibility?.decisionSentAt) {
    return (
      <span>
        Un <strong>dossier de faisabilité incomplet</strong> a été retourné le{" "}
        <strong>
          {format(toDate(feasibility.decisionSentAt), "dd/MM/yyyy")}
        </strong>{" "}
        pour cette candidature.
      </span>
    );
  }

  return null;
};

const isFeasibilityDecisionMade = (status: CandidacyStatusStep): boolean => {
  switch (status) {
    case "DOSSIER_FAISABILITE_INCOMPLET":
    case "DOSSIER_FAISABILITE_RECEVABLE":
    case "DOSSIER_FAISABILITE_NON_RECEVABLE":
    case "DOSSIER_DE_VALIDATION_ENVOYE":
    case "DOSSIER_DE_VALIDATION_SIGNALE":
      return true;
    default:
      return false;
  }
};
