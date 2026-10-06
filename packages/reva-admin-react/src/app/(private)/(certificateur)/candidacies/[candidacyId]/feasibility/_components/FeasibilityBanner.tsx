import Alert, { AlertProps } from "@codegouvfr/react-dsfr/Alert";
import Button from "@codegouvfr/react-dsfr/Button";
import { toDate } from "date-fns";

import { FeasibilityDecisionHistory } from "@/components/feasibility-decision-history/FeasibilityDecisionHistory";
import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";

import {
  FeasibilityDecision,
  FeasibilityHistory,
} from "@/graphql/generated/graphql";

interface Props {
  decision: FeasibilityDecision;
  decisionComment?: string | null;
  decisionSentAt?: number | null;
  feasibilityHistory?: FeasibilityHistory[];
  candidacyId: string;
  onRevokeDecision?: () => void;
  isAdmin?: boolean;
  candidacyStatus: string;
}

const decisionToStatusMap: Record<string, string[]> = {
  ADMISSIBLE: ["DOSSIER_FAISABILITE_RECEVABLE"],
  REJECTED: ["DOSSIER_FAISABILITE_NON_RECEVABLE"],
  COMPLETE: ["DOSSIER_FAISABILITE_COMPLET"],
  INCOMPLETE: ["DOSSIER_FAISABILITE_INCOMPLET"],
};

const severityMap: Record<string, AlertProps.Severity> = {
  ADMISSIBLE: "success",
  COMPLETE: "success",
  INCOMPLETE: "warning",
  REJECTED: "error",
};

export function FeasibilityBanner({
  decision,
  decisionComment,
  decisionSentAt,
  feasibilityHistory = [],
  onRevokeDecision,
  isAdmin = false,
  candidacyStatus,
}: Props) {
  const { isFeatureActive } = useFeatureflipping();
  if (decision === "PENDING") {
    return <FeasibilityDecisionHistory history={feasibilityHistory} />;
  }

  const formattedDate = decisionSentAt
    ? toDate(decisionSentAt).toLocaleDateString("fr-FR")
    : null;

  const titleMap: Record<string, string> = {
    ADMISSIBLE: formattedDate
      ? `Recevabilité acceptée le ${formattedDate}`
      : "Recevabilité acceptée",
    REJECTED: formattedDate
      ? `Dossier déclaré comme "non recevable" le ${formattedDate}`
      : `Dossier déclaré comme "non recevable"`,
    COMPLETE: "Dossier complet",
    INCOMPLETE: formattedDate
      ? `Dossier renvoyé car "incomplet" le ${formattedDate}`
      : `Dossier renvoyé car "incomplet"`,
  };

  const descriptionMap: Record<
    string,
    NonNullable<React.ReactNode> | undefined
  > = {
    ADMISSIBLE: undefined,
    COMPLETE: decisionComment ? <p>"{decisionComment}"</p> : undefined,
    REJECTED: (
      <p>
        Si vous avez précisé les motifs de cette décision, ils seront transmis
        au candidat : {'"'}
        {decisionComment}
        {'"'}
      </p>
    ),
    INCOMPLETE: (
      <p>
        Le dossier a été renvoyé au candidat car "incomplet". Si vous avez
        précisé les motifs de cette décision, ils seront transmis au candidat :{" "}
        {'"'}
        {decisionComment}
        {'"'}
      </p>
    ),
  };

  const canRevokeDfIncomplete = isFeatureActive("ADMIN_REVOKE_DF_INCOMPLETE");
  const canRevoke =
    isAdmin &&
    decisionToStatusMap[decision]?.includes(candidacyStatus) &&
    (decision !== "INCOMPLETE" || canRevokeDfIncomplete);

  const alertProps = {
    className: "mb-4",
    severity: severityMap[decision] ?? ("info" as AlertProps.Severity),
    "data-testid": `feasibility-decision-${decision.toLowerCase()}`,
  };

  return (
    <>
      <div>
        {decision === "ADMISSIBLE" ? (
          <Alert {...alertProps} small description={titleMap[decision] ?? ""} />
        ) : (
          <Alert
            {...alertProps}
            title={titleMap[decision] ?? ""}
            description={descriptionMap[decision]}
          />
        )}
        {canRevoke && (
          <div className="flex justify-end mb-4">
            <Button priority="secondary" onClick={onRevokeDecision}>
              Annuler la décision
            </Button>
          </div>
        )}
      </div>

      <FeasibilityDecisionHistory history={feasibilityHistory} />
    </>
  );
}
