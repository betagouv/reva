import Alert from "@codegouvfr/react-dsfr/Alert";
import { useQueryClient } from "@tanstack/react-query";
import { format, toDate } from "date-fns";
import { useParams } from "next/navigation";

import { ContactInfosSection } from "@/app/contact-infos-section/ContactInfosSection";
import { DecisionSentComponent } from "@/components/alert-decision-sent-feasibility/DecisionSentComponent";
import { useAuth } from "@/components/auth/auth";
import { DffSummary } from "@/components/dff-summary/DffSummary";
import { FeasibilityDecisionHistory } from "@/components/feasibility-decision-history/FeasibilityDecisionHistory";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { useUrqlClient } from "@/components/urql-client";

import {
  Candidacy,
  DematerializedFeasibilityFile,
  FeasibilityDecision,
} from "@/graphql/generated/graphql";

import {
  FeasibilityCompletionForm,
  FeasibilityCompletionFormData,
} from "../FeasibilityCompletionForm";
import {
  FeasibilityValidationForm,
  FeasibilityValidationFormData,
} from "../FeasibilityValidationForm";
import { useRevokeFeasibilityDecisionModal } from "../useRevokeFeasibilityDecisionModal.hook";

import {
  createOrUpdateCertificationAuthorityDecision,
  useDematerializedFeasibility,
} from "./dematerializedFeasibility.hook";

export const DematerializedFeasibility = () => {
  const { candidacyId } = useParams<{ candidacyId: string }>();
  const {
    dematerializedFeasibilityFile,
    candidacy,
    feasibility,
    revokeDecision,
  } = useDematerializedFeasibility();

  const urqlClient = useUrqlClient();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const revokeDecisionModal = useRevokeFeasibilityDecisionModal();

  const isCandidacyArchived = candidacy?.status === "ARCHIVE";

  const isCandidacyDroppedOut = !!candidacy?.candidacyDropOut;

  const isFeasibilityWaitingToBeMarkedAsComplete =
    feasibility?.decision === "PENDING" &&
    !isCandidacyArchived &&
    !isCandidacyDroppedOut;

  const isFeasibilityWaitingToBeValidated =
    feasibility?.decision === "COMPLETE" &&
    !isCandidacyArchived &&
    !isCandidacyDroppedOut;

  const waitingForDecision =
    isFeasibilityWaitingToBeMarkedAsComplete ||
    isFeasibilityWaitingToBeValidated;

  const handleValidationFormSubmit = async (
    data: FeasibilityValidationFormData,
  ) => {
    const decisionFile = data.infoFile?.[0];
    const input = {
      decisionFile,
      decision: data.decision,
      decisionComment: data.comment,
    };

    try {
      const result = await urqlClient.mutation(
        createOrUpdateCertificationAuthorityDecision,
        {
          input,
          candidacyId,
        },
      );
      if (result?.error) {
        throw new Error(result?.error?.graphQLErrors[0].message);
      }
      successToast("Décision du dossier de faisabilité envoyée avec succès");
      queryClient.invalidateQueries({ queryKey: [candidacyId] });
      queryClient.invalidateQueries({
        queryKey: ["feasibilities"],
      });
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  const handleCompletionFormSubmit = async (
    data: FeasibilityCompletionFormData,
  ) => {
    const input = {
      decision: data.decision,
      decisionComment: data.comment,
    };

    try {
      const result = await urqlClient.mutation(
        createOrUpdateCertificationAuthorityDecision,
        {
          input,
          candidacyId,
        },
      );
      if (result?.error) {
        throw new Error(result?.error?.graphQLErrors[0].message);
      }
      successToast("Décision du dossier de faisabilité envoyée avec succès");
      queryClient.invalidateQueries({ queryKey: [candidacyId] });
      queryClient.invalidateQueries({
        queryKey: ["feasibilities"],
      });
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  if (!candidacy || !dematerializedFeasibilityFile || !feasibility) return null;

  const organism = candidacy.organism;

  const feasibilityDecisionSentAt = feasibility?.decisionSentAt
    ? toDate(feasibility.decisionSentAt)
    : null;

  const candidateName = `${candidacy.candidate?.firstname ?? ""} ${candidacy.candidate?.lastname ?? ""}`;
  const certificationName = candidacy.certification?.label ?? "";

  const candidateDisplayName = `${candidacy.candidate?.lastname ?? ""} ${
    candidacy.candidate?.firstname ?? ""
  }`.trim();
  const certificationDisplayName = candidacy.certification
    ? `RNCP${candidacy.certification.codeRncp ?? ""} - ${
        candidacy.certification.label ?? ""
      }`
    : "";

  const isFeasibilityDecisionMade =
    feasibility?.decision === "ADMISSIBLE" ||
    feasibility?.decision === "REJECTED";

  const dffSummaryAccordionsDefaultExpanded = !isFeasibilityDecisionMade;

  return (
    <div
      data-testid={`feasibility-page-dematerialized-${feasibility?.decision?.toLowerCase() || "pending"}`}
    >
      <revokeDecisionModal.Component
        onConfirmButtonClick={async (data: { reason: string }) => {
          try {
            await revokeDecision.mutateAsync({
              feasibilityId: feasibility.id,
              reason: data.reason,
            });
            queryClient.invalidateQueries({ queryKey: [candidacyId] });
          } catch (e) {
            graphqlErrorToast(e);
          }
        }}
      />
      <DffSummary
        dematerializedFeasibilityFile={
          dematerializedFeasibilityFile as DematerializedFeasibilityFile
        }
        candidacy={candidacy as Candidacy}
        FeasibilityBanner={
          <>
            {candidacy.candidacyDropOut?.createdAt && (
              <Alert
                title={`Candidature abandonnée le ${format(
                  toDate(candidacy.candidacyDropOut?.createdAt),
                  "dd/MM/yyyy",
                )}`}
                severity="warning"
                className="mt-4 mb-12"
              />
            )}
            <DecisionSentComponent
              decisionSentAt={feasibilityDecisionSentAt}
              decision={feasibility?.decision as FeasibilityDecision}
              decisionComment={feasibility?.decisionComment}
              onRevokeDecision={() => revokeDecisionModal.open()}
              isAdmin={isAdmin}
              candidacyStatus={candidacy.status}
            />
            <FeasibilityDecisionHistory
              className="mb-6"
              history={feasibility?.history}
            />
          </>
        }
        displayGiveYourDecisionSubtitle
        accordionsDefaultExpanded={dffSummaryAccordionsDefaultExpanded}
      />

      {(feasibility?.certificationAuthority || organism) && (
        <ContactInfosSection
          certificationAuthority={feasibility?.certificationAuthority}
          certificationAuthorityLocalAccounts={
            candidacy.certificationAuthorityLocalAccounts
          }
          organism={organism}
        />
      )}

      {waitingForDecision && (
        <>
          <hr className="mt-12 mb-12 p-1" />
          {isFeasibilityWaitingToBeMarkedAsComplete && (
            <FeasibilityCompletionForm
              onSubmit={handleCompletionFormSubmit}
              candidateDisplayName={candidateDisplayName}
              certificationDisplayName={certificationDisplayName}
            />
          )}
          {isFeasibilityWaitingToBeValidated && (
            <FeasibilityValidationForm
              onSubmit={handleValidationFormSubmit}
              candidateName={candidateName}
              certificationName={certificationName}
            />
          )}
        </>
      )}
    </div>
  );
};
