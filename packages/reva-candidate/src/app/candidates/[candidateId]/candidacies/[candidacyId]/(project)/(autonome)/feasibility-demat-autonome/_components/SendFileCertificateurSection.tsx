import Badge from "@codegouvfr/react-dsfr/Badge";
import Tile from "@codegouvfr/react-dsfr/Tile";
import { format } from "date-fns";
import Image from "next/image";
import { ComponentProps } from "react";

import { CustomErrorBadge } from "@/components/badge/custom-error-badge/CustomErrorBadge";

const TILE_COMMON_PROPS = {
  orientation: "horizontal" as const,
  titleAs: "h3" as const,
  small: true,
  title: "Vérifier et envoyer le dossier au certificateur",
  pictogram: (
    <Image
      src="/candidat/components/document.svg"
      alt="document"
      width={40}
      height={40}
    />
  ),
};

export const SendFileCertificationAuthoritySection = ({
  sentToCertificationAuthorityAt,
  isReadyToBeSentToCertificationAuthority,
  disabled,
  isIncomplete,
  buttonProps,
}: {
  sentToCertificationAuthorityAt?: Date | null;
  isReadyToBeSentToCertificationAuthority: boolean;
  disabled?: boolean;
  isIncomplete?: boolean;
  buttonProps?: ComponentProps<"button">;
}) => {
  // Apres INCOMPLETE, l'envoi precedent n'est plus valide (pas de comparaison temporelle necessaire
  // car sendDFFToCertificationAuthority remet decision a PENDING, donc INCOMPLETE implique toujours stale)
  const feasibilityHasBeenSent =
    !!sentToCertificationAuthorityAt && !isIncomplete;

  if (feasibilityHasBeenSent) {
    return (
      <Tile
        {...TILE_COMMON_PROPS}
        start={
          <Badge severity="success">
            Dossier envoyé au certificateur le{" "}
            {format(sentToCertificationAuthorityAt, "dd/MM/yyyy")}
          </Badge>
        }
        desc="Si le certificateur juge que c'est incomplet, il vous le renverra."
        detail="voir le dossier"
        linkProps={{ href: "./send-file-certification-authority" }}
        data-testid="send-file-certification-authority-tile-sent"
      />
    );
  }

  if (isReadyToBeSentToCertificationAuthority) {
    const tileProps = disabled
      ? { disabled: true }
      : buttonProps
        ? { buttonProps }
        : { linkProps: { href: "./send-file-certification-authority" } };
    return (
      <Tile
        {...TILE_COMMON_PROPS}
        desc="Vous pouvez maintenant vérifier et envoyer le dossier au certificateur."
        data-testid="send-file-certification-authority-tile-ready"
        {...tileProps}
      />
    );
  }

  return (
    <Tile
      {...TILE_COMMON_PROPS}
      disabled
      classes={{
        title:
          "text-dsfr-light-decisions-text-disabled-grey before:bg-gradient-to-t before:from-dsfr-light-decisions-border-border-disabled-grey before:to-dsfr-light-decisions-border-border-disabled-grey",
      }}
      start={<CustomErrorBadge label="En attente de la saisie complète" />}
      desc="Une fois toutes les sections complétées, vous pourrez envoyer le dossier au certificateur."
      data-testid="send-file-certification-authority-tile-pending-validation"
      style={{
        paddingBottom: "0",
        color: "grey",
      }}
    />
  );
};
