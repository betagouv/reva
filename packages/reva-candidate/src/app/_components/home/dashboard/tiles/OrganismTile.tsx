import Tag from "@codegouvfr/react-dsfr/Tag";
import Tile from "@codegouvfr/react-dsfr/Tile";
import { useRouter } from "next/navigation";

import { CandidacyStatusStep } from "@/graphql/generated/graphql";

import { IncompleteBadge } from "./IncompleteBadge";

export const OrganismTile = ({
  hasSelectedOrganism,
  candidacyStatus,
  hasSelectedCertification,
  endAccompagnementConfirmed,
}: {
  hasSelectedOrganism: boolean;
  candidacyStatus: CandidacyStatusStep;
  hasSelectedCertification: boolean; // in some cases (vae collective) the candidate can register without selecting a certification
  endAccompagnementConfirmed: boolean;
}) => {
  const router = useRouter();

  const tileDisabled =
    (candidacyStatus !== "PROJET" &&
      candidacyStatus !== "VALIDATION" &&
      candidacyStatus !== "PRISE_EN_CHARGE" &&
      candidacyStatus !== "PARCOURS_ENVOYE") ||
    !hasSelectedCertification ||
    endAccompagnementConfirmed;

  const canModifyOrganism = hasSelectedOrganism && !endAccompagnementConfirmed;

  const getStartContent = () => {
    if (endAccompagnementConfirmed) {
      return <Tag small>Accompagnement terminé</Tag>;
    }
    if (!hasSelectedOrganism) {
      return <IncompleteBadge />;
    }
    return undefined;
  };

  return (
    <Tile
      data-testid="organism-tile"
      start={getStartContent()}
      desc={canModifyOrganism ? "Modifier" : undefined}
      title="Accompagnateur"
      small
      buttonProps={{
        onClick: () => {
          router.push("./set-organism");
        },
      }}
      imageUrl="/candidat/images/pictograms/avatar.svg"
      disabled={tileDisabled}
    />
  );
};
