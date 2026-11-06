import Tile from "@codegouvfr/react-dsfr/Tile";

import { PICTOGRAMS } from "@/components/pictograms/Pictograms";

export const RequestCorrectionTile = ({
  candidacyId,
}: {
  candidacyId: string;
}) => (
  <Tile
    small
    orientation="horizontal"
    titleAs="h3"
    pictogram={PICTOGRAMS.errorSmall}
    title="Demande de correction"
    desc="Vous observez une ou plusieurs informations à corriger ? Transmettez vos remarques au candidat et à l’AAP, le cas échéant."
    detail="Compléter la demande"
    linkProps={{
      href: `/candidacies/${candidacyId}/dossier-de-validation-v2/problem`,
    }}
  />
);
