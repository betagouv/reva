import Badge from "@codegouvfr/react-dsfr/Badge";

import { CustomErrorBadge } from "@/components/badge/custom-error-badge/CustomErrorBadge";

import { DfFileAapDecision } from "@/graphql/generated/types";

export default function DecisionSection({
  decision,
  decisionComment,
}: {
  decision?: DfFileAapDecision | null;
  decisionComment?: string | null;
}) {
  const DecisionBadge = () => {
    if (decision === "FAVORABLE") {
      return (
        <Badge severity="success" noIcon>
          Favorable
        </Badge>
      );
    }
    return <CustomErrorBadge label="Non favorable" />;
  };

  if (!decision) {
    return null;
  }

  return (
    <div className="ml-10">
      <div className="flex">
        <h4 className="mb-0">Avis de l'accompagnateur</h4>
      </div>
      <div className="my-4">
        <DecisionBadge />
      </div>
      {decisionComment && <p>“{decisionComment}”</p>}
    </div>
  );
}
