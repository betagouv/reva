import { Card } from "@codegouvfr/react-dsfr/Card";
import Tag from "@codegouvfr/react-dsfr/Tag";

export const SousCompteCard = ({
  firstname,
  lastname,
  onClickHref,
  canCreateCohorte,
  isAAPAccount,
}: {
  firstname: string;
  lastname: string;
  onClickHref: string;
  canCreateCohorte: boolean;
  isAAPAccount: boolean;
}) => (
  <Card
    start={
      <div className="flex gap-2">
        {isAAPAccount ? (
          <Tag small iconId="ri-user-fill">
            AAP
          </Tag>
        ) : undefined}
        {canCreateCohorte ? (
          <Tag small iconId="ri-checkbox-circle-fill">
            Création de cohorte activée
          </Tag>
        ) : undefined}
      </div>
    }
    title={`${lastname} ${firstname}`}
    linkProps={{ href: onClickHref }}
    enlargeLink
  />
);
