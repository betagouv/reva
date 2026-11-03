import Button from "@codegouvfr/react-dsfr/Button";
import { Card } from "@codegouvfr/react-dsfr/Card";
import { Tag } from "@codegouvfr/react-dsfr/Tag";

import {
  ConformiteNormeAccessibilite,
  OrganismModaliteAccompagnement,
} from "@/graphql/generated/graphql";

type Organism = {
  id: string;
  label: string;
  contactAdministrativeEmail: string;
  contactAdministrativePhone?: string | null;
  modaliteAccompagnement: OrganismModaliteAccompagnement;
  website?: string | null;
  distanceKm?: number | null;
  isMaisonMereMCFCompatible?: boolean | null;
  nomPublic?: string | null;
  telephone?: string | null;
  siteInternet?: string | null;
  emailContact?: string | null;
  adresseNumeroEtNomDeRue?: string | null;
  adresseInformationsComplementaires?: string | null;
  adresseCodePostal?: string | null;
  adresseVille?: string | null;
  conformeNormesAccessibilite?: ConformiteNormeAccessibilite | null;
  fermePourAbsenceOuConges?: boolean | null;
};

const getMandatoryInfo = (organism: Organism) => {
  const { nomPublic, siteInternet, emailContact, telephone } = organism;
  const isOnSite = organism.modaliteAccompagnement === "LIEU_ACCUEIL";
  const isRemote = organism.modaliteAccompagnement === "A_DISTANCE";

  return {
    label: nomPublic || organism.label,
    website: siteInternet || organism.website,
    email: emailContact || organism.contactAdministrativeEmail,
    phone: telephone || organism.contactAdministrativePhone,
    isOnSite,
    isRemote,
  };
};

export const OrganismCard = ({
  organism,
  onClick,
  isSelected,
}: {
  organism: Organism;
  onClick: () => void;
  isSelected?: boolean;
}) => {
  const mandatoryInfo = getMandatoryInfo(organism);
  const fermePourAbsenceOuConges = organism.fermePourAbsenceOuConges;

  const tags = [];
  if (organism.isMaisonMereMCFCompatible) {
    tags.push("MCF");
  }
  if (organism.modaliteAccompagnement === "A_DISTANCE") {
    tags.push("À distance");
  }
  if (organism.modaliteAccompagnement === "LIEU_ACCUEIL") {
    tags.push("Sur site");
  }

  return (
    <Card
      data-testid={`project-organisms-organism-${organism.id}`}
      title={mandatoryInfo.label}
      start={
        <div className="flex flex-col gap-2 mb-2">
          <Tags
            remote={organism.modaliteAccompagnement === "A_DISTANCE"}
            onSite={organism.modaliteAccompagnement === "LIEU_ACCUEIL"}
            mcf={!!organism.isMaisonMereMCFCompatible}
          />
          <Distance distanceKm={organism.distanceKm} />
        </div>
      }
      desc={
        <Description
          adresseNumeroEtNomDeRue={organism.adresseNumeroEtNomDeRue}
          adresseInformationsComplementaires={
            organism.adresseInformationsComplementaires
          }
          adresseCodePostal={organism.adresseCodePostal}
          adresseVille={organism.adresseVille}
          conformeNormesAccessibilite={
            organism.conformeNormesAccessibilite === "CONFORME"
          }
          phone={mandatoryInfo.phone}
          email={mandatoryInfo.email}
        />
      }
      end={
        <div className="flex gap-4">
          {fermePourAbsenceOuConges ? (
            <NotAvailableText />
          ) : (
            <SelectButton
              organismId={organism.id}
              isSelected={isSelected}
              onClick={onClick}
            />
          )}
          <WebsiteButton website={mandatoryInfo.website} />
        </div>
      }
    />
  );
};

const Tags = ({
  remote,
  onSite,
  mcf,
}: {
  remote?: boolean;
  onSite?: boolean;
  mcf?: boolean;
}) => (
  <div className="flex gap-2">
    {remote && (
      <Tag
        data-testid="project-organisms-remote-tag"
        iconId="fr-icon-customer-service-fill"
        small
      >
        À distance
      </Tag>
    )}
    {onSite && (
      <Tag
        data-testid="project-organisms-onsite-tag"
        iconId="fr-icon-home-4-fill"
        small
      >
        Sur site
      </Tag>
    )}
    {mcf && (
      <Tag data-testid="project-organisms-mcf-tag" small>
        MCF
      </Tag>
    )}
  </div>
);

const Distance = ({ distanceKm }: { distanceKm?: number | null }) => {
  if (distanceKm === undefined || distanceKm === null) return null;
  return (
    <div className="text-neutral-500">
      <span
        className="fr-icon-map-pin-2-fill fr-icon--sm mr-2"
        aria-hidden="true"
      ></span>
      <span className="font-bold text-sm">À {distanceKm.toFixed(1)} km</span>
    </div>
  );
};

const Description = ({
  adresseNumeroEtNomDeRue,
  adresseInformationsComplementaires,
  adresseCodePostal,
  adresseVille,
  conformeNormesAccessibilite,
  phone,
  email,
}: {
  adresseNumeroEtNomDeRue?: string | null;
  adresseInformationsComplementaires?: string | null;
  adresseCodePostal?: string | null;
  adresseVille?: string | null;
  conformeNormesAccessibilite?: boolean;
  phone?: string | null;
  email?: string;
}) => (
  <p className="text-sm leading-normal">
    {adresseNumeroEtNomDeRue ||
    adresseInformationsComplementaires ||
    adresseCodePostal ||
    adresseVille ? (
      <address
        data-testid="project-organisms-organism-address"
        className="not-italic"
      >
        {adresseNumeroEtNomDeRue}
        {adresseNumeroEtNomDeRue && ", "}
        {adresseInformationsComplementaires}
        {adresseInformationsComplementaires && ", "}
        {adresseCodePostal} {adresseVille}
      </address>
    ) : (
      <address className="text-gray-500">Adresse non précisée</address>
    )}
    {conformeNormesAccessibilite && (
      <div>
        <span
          className="fr-icon-wheelchair-fill fr-icon--xs mr-3"
          aria-hidden="true"
        ></span>
        Accessibilité PMR
      </div>
    )}
    {phone && (
      <>
        <span data-testid="project-organisms-organism-phone">{phone}</span>
        <br />
      </>
    )}
    {email && (
      <>
        <span data-testid="project-organisms-organism-email">{email}</span>
        <br />
      </>
    )}
  </p>
);

const NotAvailableText = () => (
  <p className="text-neutral-400 text-sm mb-0">Indisponible actuellement</p>
);

const SelectButton = ({
  organismId,
  isSelected,
  onClick,
}: {
  organismId: string;
  isSelected?: boolean;
  onClick: () => void;
}) => (
  <Button
    data-testid={`project-organisms-submit-organism-${organismId}`}
    size="small"
    nativeButtonProps={{ onClick }}
    disabled={isSelected}
    className={isSelected ? "shadow-none" : ""}
    iconId={isSelected ? "fr-icon-check-line" : undefined}
  >
    {isSelected ? "Choisi" : "Choisir"}
  </Button>
);

const WebsiteButton = ({ website }: { website?: string | null }) => {
  if (!website) return null;
  return (
    <Button
      priority="secondary"
      size="small"
      linkProps={{ href: website, target: "_blank" }}
    >
      Site internet
    </Button>
  );
};
