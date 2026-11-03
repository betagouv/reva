import Badge from "@codegouvfr/react-dsfr/Badge";
import Input from "@codegouvfr/react-dsfr/Input";

import { DfFileAapDecision } from "@/graphql/generated/types";

import { CustomErrorBadge } from "../../CustomErrorBadge/CustomErrorBadge";

const DecisionBadge = ({ decision }: { decision: DfFileAapDecision }) => {
  if (decision === "FAVORABLE") {
    return (
      <Badge severity="success" noIcon>
        Favorable
      </Badge>
    );
  }
  return <CustomErrorBadge label="Non favorable" />;
};

export default function DecisionSection({
  decision,
  decisionComment,
  candidateDecisionComment,
  setCandidateDecisionComment,
  candidateDecisionCommentDisabled,
}: {
  decision?: DfFileAapDecision | null;
  decisionComment?: string | null;
  candidateDecisionComment: string;
  setCandidateDecisionComment: (comment: string) => void;
  candidateDecisionCommentDisabled: boolean;
}) {
  if (!decision) {
    return null;
  }

  const isDecisionUnfavorable = decision === "UNFAVORABLE";

  return (
    <div className="ml-10" data-testid="decision-section">
      <div className="flex">
        <h4 className="mb-0">Avis de l'accompagnateur</h4>
      </div>
      <div className="my-4">
        <DecisionBadge decision={decision} />
      </div>
      {decisionComment && <p>“{decisionComment}”</p>}
      {isDecisionUnfavorable && (
        <Input
          className="mt-4 mb-8"
          textArea
          label="Commentaire (optionnel)"
          hintText="Vous pouvez fournir des arguments pour contester cet avis. Ce message sera visible par le certificateur et l’accompagnateur."
          nativeTextAreaProps={{
            value: candidateDecisionComment,
            onChange: (e) => setCandidateDecisionComment?.(e.target.value),
            maxLength: 2000,
          }}
          disabled={candidateDecisionCommentDisabled}
        />
      )}
    </div>
  );
}
