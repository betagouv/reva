import Tile from "@codegouvfr/react-dsfr/Tile";

import { IncompleteBadge } from "./IncompleteBadge";

export const CertificationTile = ({
  selectedCertificationId,
}: {
  selectedCertificationId?: string | null;
}) => (
  <Tile
    data-testid="certification-tile"
    start={!selectedCertificationId ? <IncompleteBadge /> : undefined}
    desc={selectedCertificationId ? "Modifier" : undefined}
    title="Diplôme visé"
    small
    linkProps={{
      href: !!selectedCertificationId
        ? `./certification/${selectedCertificationId}`
        : "./search-certification",
    }}
    imageUrl="/candidat/images/pictograms/search.svg"
  />
);
