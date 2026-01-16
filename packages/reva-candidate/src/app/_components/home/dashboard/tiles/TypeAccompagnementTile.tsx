import Tile from "@codegouvfr/react-dsfr/Tile";

export const TypeAccompagnementTile = ({
  disabled,
}: {
  disabled?: boolean;
}) => (
  <Tile
    data-testid="type-accompagnement-tile"
    disabled={disabled}
    desc="Modifier"
    title="Modalité de parcours"
    small
    linkProps={
      disabled
        ? undefined
        : ({
            href: "./type-accompagnement",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
    }
    imageUrl="/candidat/images/pictograms/human-cooperation.svg"
  />
);
