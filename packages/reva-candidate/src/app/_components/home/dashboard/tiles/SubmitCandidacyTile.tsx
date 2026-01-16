import Badge from "@codegouvfr/react-dsfr/Badge";
import Tile from "@codegouvfr/react-dsfr/Tile";
import { useRouter } from "next/navigation";

const SentBadge = () => (
  <Badge severity="success" data-testid="sent-badge">
    Envoyée
  </Badge>
);

export const SubmitCandidacyTile = ({
  candidacyAlreadySubmitted,
  canSubmitCandidacy,
}: {
  candidacyAlreadySubmitted: boolean;
  canSubmitCandidacy: boolean;
}) => {
  const router = useRouter();

  const getDesc = () => {
    if (candidacyAlreadySubmitted) {
      return "";
    }
    if (canSubmitCandidacy) {
      return "Vérifier et envoyer";
    }
    return "Compléter toutes les sections";
  };

  return (
    <Tile
      data-testid="submit-candidacy-tile"
      start={candidacyAlreadySubmitted ? <SentBadge /> : undefined}
      disabled={!candidacyAlreadySubmitted && !canSubmitCandidacy}
      title="Envoi de la candidature"
      small
      buttonProps={{
        onClick: () => {
          router.push("./submit-candidacy");
        },
      }}
      imageUrl="/candidat/images/pictograms/mail-send.svg"
      desc={getDesc()}
    />
  );
};
