import Alert, { AlertProps } from "@codegouvfr/react-dsfr/Alert";
import Button from "@codegouvfr/react-dsfr/Button";
import { format } from "date-fns";

import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";

import { FeasibilityDecision } from "@/graphql/generated/graphql";

const severityMap = {
  ADMISSIBLE: "success",
  COMPLETE: "info",
  INCOMPLETE: "info",
  REJECTED: "error",
};

export const DecisionSentComponent = ({
  decisionSentAt,
  decision,
  decisionComment,
  onRevokeDecision,
  isAdmin = false,
  candidacyStatus,
}: {
  decisionSentAt: Date | null;
  decision: FeasibilityDecision;
  decisionComment?: string | null;
  onRevokeDecision?: () => void;
  isAdmin?: boolean;
  candidacyStatus?: string;
}) => {
  const { isFeatureActive } = useFeatureflipping();
  if (decision === "PENDING" || decision === "DRAFT") {
    return null;
  }

  const titleMap = {
    ADMISSIBLE: decisionSentAt
      ? `Dossier recevable le ${format(decisionSentAt, "dd/MM/yyyy")}`
      : "Dossier recevable",
    COMPLETE: "Dossier déclaré complet",
    INCOMPLETE: decisionSentAt
      ? `Dossier retourné incomplet le ${format(decisionSentAt, "dd/MM/yyyy")}`
      : "Dossier retourné incomplet",
    REJECTED: decisionSentAt
      ? `Dossier non recevable le ${format(decisionSentAt, "dd/MM/yyyy")}`
      : "Dossier non recevable",
  };

  const decisionToStatusMap: Record<string, string[]> = {
    ADMISSIBLE: ["DOSSIER_FAISABILITE_RECEVABLE"],
    REJECTED: ["DOSSIER_FAISABILITE_NON_RECEVABLE"],
    COMPLETE: ["DOSSIER_FAISABILITE_COMPLET"],
    INCOMPLETE: ["DOSSIER_FAISABILITE_INCOMPLET"],
  };

  const canRevokeDfIncomplete = isFeatureActive("ADMIN_REVOKE_DF_INCOMPLETE");

  const canRevoke =
    isAdmin &&
    candidacyStatus &&
    decisionToStatusMap[decision]?.includes(candidacyStatus) &&
    (decision !== "INCOMPLETE" || canRevokeDfIncomplete);

  return (
    <>
      <div>
        <Alert
          title={titleMap[decision as keyof typeof titleMap]}
          severity={
            severityMap[
              decision as keyof typeof severityMap
            ] as AlertProps.Severity
          }
          description={decisionComment ? `”${decisionComment}”` : ""}
          className="mb-4"
        />
        {canRevoke && (
          <div className="flex justify-end mb-4">
            <Button priority="secondary" onClick={onRevokeDecision}>
              Annuler la décision
            </Button>
          </div>
        )}
      </div>
    </>
  );
};
