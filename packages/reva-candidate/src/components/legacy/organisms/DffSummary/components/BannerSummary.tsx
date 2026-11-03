import Alert from "@codegouvfr/react-dsfr/Alert";
import { format } from "date-fns";

import { FeasibilityDecision } from "@/graphql/generated/types";

const getDecisionBanner = (
  decision: FeasibilityDecision,
  decisionSentAt: number,
  decisionComment?: string | null,
) => {
  if (decision === "ADMISSIBLE") {
    return (
      <Alert
        description={decisionComment ? `”${decisionComment}”` : ""}
        severity="success"
        title={`Dossier recevable le ${format(decisionSentAt, "dd/MM/yyyy")}`}
        data-testid="dff-summary-decision-banner-admissible"
      />
    );
  } else if (decision === "REJECTED") {
    return (
      <Alert
        description={decisionComment ? `”${decisionComment}”` : ""}
        severity="error"
        title={`Dossier non recevable le ${format(decisionSentAt, "dd/MM/yyyy")}`}
        data-testid="dff-summary-decision-banner-rejected"
      />
    );
  } else if (decision === "INCOMPLETE") {
    return (
      <Alert
        description={decisionComment ? `”${decisionComment}”` : ""}
        severity="warning"
        title={`Dossier retourné incomplet le ${format(decisionSentAt, "dd/MM/yyyy")}`}
        data-testid="dff-summary-decision-banner-incomplete"
      />
    );
  }
};

export function BannerSummary({
  feasibilitySentToCertificationAuthorityAt,
  decision,
  decisionSentAt,
  decisionComment,
  isAccompagnementAutonome = false,
}: {
  feasibilitySentToCertificationAuthorityAt?: number | null;
  decision?: FeasibilityDecision | null;
  decisionSentAt?: number | null;
  decisionComment?: string | null;
  isAccompagnementAutonome?: boolean;
}) {
  if (
    decision &&
    decision !== "DRAFT" &&
    decision !== "PENDING" &&
    decision !== "COMPLETE" &&
    decisionSentAt
  ) {
    return getDecisionBanner(decision, decisionSentAt, decisionComment);
  }
  if (feasibilitySentToCertificationAuthorityAt) {
    return (
      <Alert
        description={`Dossier envoyé au certificateur le ${format(
          feasibilitySentToCertificationAuthorityAt,
          "dd/MM/yyyy",
        )}`}
        severity="success"
        title=""
      />
    );
  }

  if (isAccompagnementAutonome) {
    return null;
  }

  return (
    <p className="text-xl mb-0">
      Vous avez en partie rempli ce dossier avec votre accompagnateur. Vérifiez
      les informations puis validez votre dossier en envoyant une attestation
      sur l'honneur à votre accompagnateur. Il se chargera ensuite de le
      transmettre au certificateur qui se prononcera sur la recevabilité.
    </p>
  );
}
