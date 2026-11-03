import CallOut from "@codegouvfr/react-dsfr/CallOut";

import { useFeatureFlipping } from "@/components/feature-flipping/featureFlipping";
import { GenderEnum } from "@/constants/genders.constant";
import { formatIso8601Date } from "@/utils/formatIso8601Date";

import {
  Candidate,
  CandidateTypology,
  Gender,
} from "@/graphql/generated/types";

function getGenderPrefix(gender: Gender) {
  switch (gender) {
    case GenderEnum.man:
      return "M. ";
    case GenderEnum.woman:
      return "Mme ";
    case GenderEnum.undisclosed:
      return "Non spécifié";
  }
}

function getCandidateTypologyLabel(typology: CandidateTypology) {
  switch (typology) {
    case "NON_SPECIFIE":
      return "Non spécifié";
    case "SALARIE_PRIVE":
      return "Salarié du privé";
    case "BENEVOLE":
      return "Bénévole";
    case "AIDANTS_FAMILIAUX":
      return "Aidant familial";
    case "AIDANTS_FAMILIAUX_AGRICOLES":
      return "Aidant familial agricole";
    case "DEMANDEUR_EMPLOI":
      return "Demandeur d'emploi";
    case "TRAVAILLEUR_NON_SALARIE":
      return "Travailleur non salarié";
    case "RETRAITE":
      return "Retraité";
    case "TITULAIRE_MANDAT_ELECTIF":
      return "Titulaire d’un mandat électif";
    case "CONJOINT_COLLABORATEUR":
      return "Conjoint collaborateur";
    case "STAGIAIRE":
      return "Stagiaire";
    case "SALARIE_PUBLIC":
      return "Salarié public";
    case "SALARIE_PUBLIC_HOSPITALIER":
      return "Salarié public hospitalier";
    case "SALARIE_ALTERNANT":
      return "Salarié alternant";
    case "SALARIE_INTERIMAIRE":
      return "Salarié interimaire";
    case "SALARIE_INTERMITTENT":
      return "Salarié intermittent";
    case "SALARIE_EN_CONTRATS_AIDES":
      return "Salarié en contrats d'aides";
    case "AUTRE":
      return "Autre";
    default:
      return typology;
  }
}

export default function CandidateSection({
  candidate,
  typology,
  conventionCollective,
}: {
  candidate: Candidate;
  typology: CandidateTypology;
  conventionCollective?: string | null;
}) {
  const { isFeatureActive } = useFeatureFlipping();
  const isMiddleNamesEnabled = isFeatureActive("MIDDLE_NAMES");

  if (!candidate) return null;
  const {
    firstname,
    lastname,
    email,
    gender,
    birthdate,
    birthCity,
    birthDepartment,
    nationality,
    phone,
    street,
    addressComplement,
    zip,
    city,
    niveauDeFormationLePlusEleve,
    highestDegree,
    highestDegreeLabel,
  } = candidate;

  const genderLabel = gender ? getGenderPrefix(gender) : "";

  const middleNames = isMiddleNamesEnabled
    ? candidate.middleNames
    : `${candidate.firstname2 ? `${candidate.firstname2}` : ""}${candidate.firstname3 ? ` ${candidate.firstname3}` : ""}`;

  const candidateFullName = `${firstname}${middleNames ? ` ${middleNames}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <h3 className="mb-0">Civilité</h3>
      <div className="flex flex-col gap-6 ml-10">
        <div className="flex flex-row gap-4 flex-wrap">
          <dl className="w-[170px]">
            <dt id="candidate-civilite-label">Civilité</dt>
            <dd
              aria-labelledby="candidate-civilite-label"
              className="font-medium"
            >
              {genderLabel}
            </dd>
          </dl>
          <dl className="w-[170px]">
            <dt id="candidate-lastname-label">Nom de naissance</dt>
            <dd
              aria-labelledby="candidate-lastname-label"
              className="font-medium"
            >
              {lastname}
            </dd>
          </dl>
          <dl className="w-[170px]">
            <dt id="candidate-firstnames-label">Prénoms</dt>
            <dd
              aria-labelledby="candidate-firstnames-label"
              className="font-medium"
            >
              {candidateFullName}
            </dd>
          </dl>
          <dl className="w-[170px]">
            <dt id="candidate-birthdate-label">Date de naissance</dt>
            <dd
              aria-labelledby="candidate-birthdate-label"
              className="font-medium"
            >
              {birthdate ? formatIso8601Date(birthdate) : "-"}
            </dd>
          </dl>
          <dl className="w-[170px]">
            <dt id="candidate-birthcity-label">Ville de naissance</dt>
            <dd
              aria-labelledby="candidate-birthcity-label"
              className="font-medium"
            >
              {birthCity}
              {birthDepartment ? ` (${birthDepartment.code})` : ""}
            </dd>
          </dl>
          <dl className="w-[170px]">
            <dt id="candidate-nationality-label">Nationalité</dt>
            <dd
              aria-labelledby="candidate-nationality-label"
              className="font-medium"
            >
              {nationality}
            </dd>
          </dl>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="mb-0">Niveau de formation</h4>
          <dl>
            <dt id="candidate-education-level-label">
              Niveau de formation le plus élevé
            </dt>
            <dd
              aria-labelledby="candidate-education-level-label"
              className="font-medium"
            >
              {niveauDeFormationLePlusEleve?.level}
            </dd>
          </dl>
          <dl>
            <dt id="candidate-highest-degree-level-label">
              Niveau de la certification obtenue la plus élevée
            </dt>
            <dd
              aria-labelledby="candidate-highest-degree-level-label"
              className="font-medium"
            >
              {highestDegree?.level}
            </dd>
          </dl>
          <dl>
            <dt id="candidate-highest-degree-label-label">
              Intitulé de la certification la plus élevée obtenue
            </dt>
            <dd
              aria-labelledby="candidate-highest-degree-label-label"
              className="font-medium"
            >
              {highestDegreeLabel}
            </dd>
          </dl>
        </div>
      </div>
      <h3 className="mb-0">Contact</h3>
      <div className="flex flex-col gap-4 ml-10">
        <dl>
          <dt id="candidate-address-label">Adresse postale</dt>
          <dd aria-labelledby="candidate-address-label" className="font-medium">
            {street} {addressComplement ? `, ${addressComplement}` : ""} {zip}{" "}
            {city}
          </dd>
        </dl>
        <div className="flex flex-row gap-4 flex-wrap">
          <dl>
            <dt id="candidate-email-label">Adresse électronique</dt>
            <dd aria-labelledby="candidate-email-label" className="font-medium">
              {email}
            </dd>
          </dl>
          <dl>
            <dt id="candidate-phone-label">Téléphone</dt>
            <dd aria-labelledby="candidate-phone-label" className="font-medium">
              {phone}
            </dd>
          </dl>
        </div>
      </div>
      <h3 className="mb-0">Statut</h3>
      <div className="flex flex-col gap-4 ml-10">
        <p className="font-medium mb-0">
          {getCandidateTypologyLabel(typology)}
        </p>

        {conventionCollective && (
          <>
            <h4 className="mb-0">
              Convention collective de l’employeur du candidat
            </h4>{" "}
            <CallOut>{conventionCollective}</CallOut>
          </>
        )}
      </div>
    </div>
  );
}
