import { Tile } from "@codegouvfr/react-dsfr/Tile";
import { Fragment } from "react";

type Organism = {
  label: string;
  nomPublic?: string | null;
  adresseNumeroEtNomDeRue?: string | null;
  adresseCodePostal?: string | null;
  adresseVille?: string | null;
  emailContact?: string | null;
  telephone?: string | null;
};

export const OrganismCard = ({
  commanditaireId,
  cohorteVaeCollectiveId,
  organism,
  certificationSelected,
  disabled,
  readonly,
  className,
}: {
  commanditaireId: string;
  cohorteVaeCollectiveId: string;
  organism?: Organism | null;
  certificationSelected?: boolean;
  disabled: boolean;
  readonly: boolean;
  className?: string;
}) => {
  if (organism) {
    return (
      <FilledOrganismCard
        commanditaireId={commanditaireId}
        cohorteVaeCollectiveId={cohorteVaeCollectiveId}
        organism={organism}
        disabled={disabled}
        readonly={readonly}
        className={className}
      />
    );
  }

  return (
    <EmptyOrganismCard
      commanditaireId={commanditaireId}
      cohorteVaeCollectiveId={cohorteVaeCollectiveId}
      disabled={disabled}
      readonly={readonly}
      certificationSelected={certificationSelected}
      className={className}
    />
  );
};

const EmptyOrganismCard = ({
  commanditaireId,
  cohorteVaeCollectiveId,
  disabled,
  readonly,
  certificationSelected,
  className,
}: {
  commanditaireId: string;
  cohorteVaeCollectiveId: string;
  disabled: boolean;
  readonly: boolean;
  certificationSelected?: boolean;
  className?: string;
}) => {
  const getAdditionalProps = () => {
    if (readonly) {
      return {};
    }
    if (disabled) {
      return { disabled: true, buttonProps: { disabled: true } };
    }
    return {
      enlargeLinkOrButton: true,
      linkProps: {
        href: `/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}/aaps`,
      },
    };
  };

  const additionalProps = getAdditionalProps();

  const getDetail = () => {
    if (certificationSelected) {
      return "Choisir un AAP qui sera en charge de cette cohorte.";
    }
    if (readonly) {
      return "Non renseigné";
    }
    return "Liste accessible une fois la certification sélectionnée.";
  };

  return (
    <Tile
      data-testid="empty-organism-card"
      className={className || ""}
      title="Architecte Accompagnateur de parcours"
      detail={getDetail()}
      small
      orientation="horizontal"
      {...additionalProps}
    />
  );
};

const FilledOrganismCard = ({
  commanditaireId,
  cohorteVaeCollectiveId,
  organism,
  disabled,
  readonly,
  className,
}: {
  commanditaireId: string;
  cohorteVaeCollectiveId: string;
  organism: Organism;
  disabled?: boolean;
  readonly?: boolean;
  className?: string;
}) => {
  const getAdditionalProps = ({
    disabled,
    readonly,
  }: {
    disabled?: boolean;
    readonly?: boolean;
  }) => {
    if (disabled) {
      return { disabled: true, buttonProps: { disabled: true } };
    }
    if (readonly) {
      return {};
    }
    return {
      enlargeLinkOrButton: true,
      linkProps: {
        href: `/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}/aaps`,
      },
    };
  };

  const additionalProps = getAdditionalProps({ disabled, readonly });

  const organismLabel = organism.nomPublic || organism.label;

  const organismAddress = [
    organism.adresseNumeroEtNomDeRue,
    organism.adresseCodePostal,
    organism.adresseVille,
  ]
    .filter(Boolean)
    .join(" - ");

  return (
    <Tile
      data-testid="filled-organism-card"
      className={className || ""}
      title="Architecte Accompagnateur de parcours"
      desc={
        <>
          {[
            organismLabel,
            organismAddress,
            organism.emailContact,
            organism.telephone,
          ]
            .filter(Boolean)
            .map((item, index) => (
              <Fragment key={index}>
                {index > 0 && <br />}
                {item}
              </Fragment>
            ))}
        </>
      }
      detail={readonly ? undefined : "Changer d'AAP"}
      small
      orientation="horizontal"
      {...additionalProps}
    />
  );
};
