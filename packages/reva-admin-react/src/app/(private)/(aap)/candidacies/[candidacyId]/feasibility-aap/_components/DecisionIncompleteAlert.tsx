import Alert from "@codegouvfr/react-dsfr/Alert";
import { format } from "date-fns";

export const DecisionIncompleteAlert = ({
  decisionSentAt,
  decisionComment,
}: {
  decisionSentAt: number;
  decisionComment: string;
}) => {
  return (
    <div className="my-6" data-testid="decision-incomplete-alert">
      <Alert
        title={`Dossier déclaré incomplet le ${format(decisionSentAt, "dd/MM/yyyy")}`}
        severity="warning"
        description={
          <div className="flex flex-col gap-2">
            {decisionComment && <p>”{decisionComment}”</p>}
            <p className="font-bold">
              Corrigez les éléments signalés par le certificateur et renvoyez le
              dossier pour validation à votre candidat afin de pouvoir le
              renvoyer compléter au certificateur.
            </p>
          </div>
        }
      />
    </div>
  );
};
