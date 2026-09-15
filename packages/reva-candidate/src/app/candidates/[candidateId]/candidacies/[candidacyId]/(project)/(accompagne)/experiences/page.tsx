"use client";
import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import Card from "@codegouvfr/react-dsfr/Card";
import { format } from "date-fns";
import Link from "next/link";

import { Panel } from "@/components/layout/Panel";

import { Duration } from "@/graphql/generated/graphql";

import { useExperiences } from "./experiences.hooks";

const durationToString: {
  [key in Duration]: string;
} = {
  unknown: "inconnue",
  lessThanOneYear: "de moins d'un an",
  betweenOneAndThreeYears: "entre 1 et 3 ans",
  moreThanThreeYears: "de plus de 3 ans",
  moreThanFiveYears: "de plus de 5 ans",
  moreThanTenYears: "de plus de 10 ans",
};

export default function ExperiencesPage() {
  const { candidacy, canEditCandidacy } = useExperiences();

  const experiences = candidacy?.experiences;

  return (
    <Panel>
      <div className="flex flex-col w-full">
        <Breadcrumb
          currentPageLabel="Mes expériences"
          className="mb-0"
          segments={[
            {
              label: "Ma candidature",
              linkProps: {
                href: "../",
              },
            },
          ]}
        />
        <h1 className="mt-2 mb-6">Mes expériences</h1>
        <p className="text-xl mb-12">
          Présentez les expériences (professionnelles, personnelles, bénévoles…)
          réalisées. Présentez l’ensemble des expériences en lien avec la
          certification visée et vous permettant de démontrer les compétences
          attendues.
        </p>

        {(!experiences || experiences.length === 0) && (
          <div className="">
            <ResourcesSection codeRncp={candidacy?.certification?.codeRncp} />
          </div>
        )}

        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-3 flex flex-col">
            <div className="flex flex-col w-full">
              {experiences?.map((experience) => (
                <Card
                  key={experience.id}
                  className="mb-6"
                  background
                  border
                  desc={experience.description}
                  enlargeLink
                  footer={`${format(experience.startedAt, "MM/yyyy")} - ${durationToString[experience.duration]}`}
                  linkProps={{
                    href: `./${experience.id}`,
                  }}
                  size="small"
                  title={experience.title}
                  titleAs="h3"
                />
              ))}
            </div>

            {canEditCandidacy && (
              <>
                <hr className="mb-0 pb-4" />
                <div>
                  <Link
                    href="./add"
                    className="flex items-center gap-2 fr-link w-fit bg-none"
                  >
                    <span className="fr-icon-add-line fr-icon--sm" />
                    <span className="text-sm">Ajouter une expérience</span>
                  </Link>
                </div>
              </>
            )}
          </div>

          {experiences && experiences.length > 0 && (
            <div className="col-span-1">
              <ResourcesSection codeRncp={candidacy?.certification?.codeRncp} />
            </div>
          )}
        </div>

        <Button
          className="mt-12"
          priority="secondary"
          linkProps={{ href: "../" }}
        >
          Retour
        </Button>
      </div>
    </Panel>
  );
}

const ResourcesSection = ({ codeRncp }: { codeRncp?: string }) => (
  <div className="mb-6 flex flex-col px-4 pb-2 pt-6 bg-dsfr-light-decisions-background-background-alt-blue-france">
    <h6>Ressources :</h6>

    <div>
      <p className="font-medium mb-2">Besoin d'aide ?</p>
      <p className="mb-1">
        Consultez la partie "Résumé de la certification" sur la fiche de la
        certification :<br />
        <a
          className="fr-link"
          href={`https://www.francecompetences.fr/recherche/rncp/${codeRncp}`}
          target="_blank"
        >
          www.francecompetences.fr
        </a>
      </p>

      <p>Vous y trouverez les activités liées à la certification.</p>

      <hr />
      <p>
        <a
          className="fr-link"
          href="https://scribehow.com/viewer/Tutoriel__Candidat_sans_accompagnement_autonome__0NQyq175SDaI0Epy7bdyLA?referrer=documents&mode=edit"
          target="_blank"
        >
          Consultez le guide pas à pas
        </a>
      </p>
    </div>
  </div>
);
