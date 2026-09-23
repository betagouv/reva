import { Button } from "@codegouvfr/react-dsfr/Button";
import { Card } from "@codegouvfr/react-dsfr/Card";
import Tag from "@codegouvfr/react-dsfr/Tag";
import { ReactNode } from "react";

const CertificationsCardLayout = ({
  numberOfCertifications,
  action,
  desc,
}: {
  numberOfCertifications: number;
  action: ReactNode;
  desc?: string;
}) => (
  <Card
    data-testid="certifications-card"
    title={
      <span className="flex gap-2 items-center">
        <span className="fr-icon-award-fill" />
        Certification(s) visée(s)
        <Tag small className="font-normal mt-1 ml-2">
          {numberOfCertifications} certification(s)
        </Tag>
        {action}
      </span>
    }
    size="small"
    desc={desc}
    classes={desc === undefined ? { content: "!py-4" } : undefined}
  />
);

type ReadonlyCertificationsCardProps = {
  numberOfCertifications: number;
  certificationsSelectionneesHref: string;
};

const ReadonlyCertificationsCard = ({
  numberOfCertifications,
  certificationsSelectionneesHref,
}: ReadonlyCertificationsCardProps) => (
  <CertificationsCardLayout
    numberOfCertifications={numberOfCertifications}
    action={
      numberOfCertifications > 0 && (
        <Button
          className="ml-auto"
          priority="tertiary no outline"
          linkProps={{ href: certificationsSelectionneesHref }}
        >
          Visualiser
        </Button>
      )
    }
  />
);

type EditableCertificationsCardProps = {
  numberOfCertifications: number;
  selectCertificationsHref: string;
};

const EditableCertificationsCard = ({
  numberOfCertifications,
  selectCertificationsHref,
}: EditableCertificationsCardProps) => (
  <CertificationsCardLayout
    numberOfCertifications={numberOfCertifications}
    desc="Le choix des certifications visées par cette cohorte vous permettra d'accéder à la recherche de l'accompagnateur de votre choix."
    action={
      numberOfCertifications > 0 ? (
        <Button
          className="ml-auto"
          priority="tertiary"
          linkProps={{ href: selectCertificationsHref }}
        >
          Modifier
        </Button>
      ) : (
        <Button
          className="ml-auto text-white"
          linkProps={{ href: selectCertificationsHref }}
        >
          Compléter
        </Button>
      )
    }
  />
);

type CertificationsCardProps = {
  numberOfCertifications: number;
} & (
  | { readonly: true; certificationsSelectionneesHref: string }
  | { readonly: false; selectCertificationsHref: string }
);

export const CertificationsCard = (props: CertificationsCardProps) => {
  if (props.readonly) {
    return (
      <ReadonlyCertificationsCard
        numberOfCertifications={props.numberOfCertifications}
        certificationsSelectionneesHref={props.certificationsSelectionneesHref}
      />
    );
  }

  return (
    <EditableCertificationsCard
      numberOfCertifications={props.numberOfCertifications}
      selectCertificationsHref={props.selectCertificationsHref}
    />
  );
};
