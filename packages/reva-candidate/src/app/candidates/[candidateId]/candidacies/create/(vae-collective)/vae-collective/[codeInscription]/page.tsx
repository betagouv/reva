"use client";

import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import { Card } from "@codegouvfr/react-dsfr/Card";
import { Tile } from "@codegouvfr/react-dsfr/Tile";
import { useRouter } from "next/navigation";

import { useGetVaeCollectiveCohort } from "./getVaeCollective.hook";

export default function RejoindreVaeCollectivePage() {
  const router = useRouter();

  const { cohorteVaeCollective, isLoading: isLoadingCohortVaeCollective } =
    useGetVaeCollectiveCohort();

  const defaultCertification =
    cohorteVaeCollective?.certificationCohorteVaeCollectives[0]?.certification;

  return (
    <div className="px-4 lg:px-6 pb-6">
      <Breadcrumb
        currentPageLabel={cohorteVaeCollective?.nom}
        className="mb-4"
        segments={[
          {
            label: "Mes candidatures",
            linkProps: {
              href: "../../../",
            },
          },
          {
            label: "Créer une candidature",
            linkProps: {
              href: "../../",
            },
          },
          {
            label: "Rejoindre une VAE collective",
            linkProps: {
              href: "../",
            },
          },
        ]}
      />

      <div className="flex flex-col gap-6">
        <h1 className="mt-4 mb-0">Rejoindre cette VAE collective</h1>

        <p>
          En rejoignant cette cohorte, vous créez une candidature dans le cadre
          des certifications et accompagnateurs pré-sélectionnés par le porteur
          de projet VAE collective de cette cohorte.
        </p>

        {cohorteVaeCollective && (
          <>
            <Card
              className="shadow"
              size="small"
              title={cohorteVaeCollective?.nom}
              detail={
                <div className="flex items-center gap-1">
                  <span className="fr-icon-building-fill fr-icon--sm" />
                  {
                    cohorteVaeCollective.commanditaireVaeCollective
                      .raisonSociale
                  }
                </div>
              }
              classes={{
                detail: "mt-2",
                end: "m-0 p-0",
              }}
            />

            <Tile
              orientation="horizontal"
              title={<p>Accompagnateur de la cohorte</p>}
              desc={
                <p className="flex flex-col text-sm">
                  <span>{cohorteVaeCollective.organism?.label}</span>
                  <span>
                    {cohorteVaeCollective.organism?.adresseNumeroEtNomDeRue}
                  </span>
                  <span>
                    {cohorteVaeCollective.organism?.adresseCodePostal}{" "}
                    {cohorteVaeCollective.organism?.adresseVille}
                  </span>
                  <span>{cohorteVaeCollective.organism?.telephone}</span>
                </p>
              }
              classes={{
                content: "p-0",
              }}
            />

            {cohorteVaeCollective?.certificationCohorteVaeCollectives.length ===
              1 &&
              defaultCertification && (
                <Card
                  size="small"
                  title={defaultCertification.label}
                  detail={`RNCP ${defaultCertification.codeRncp}`}
                  desc={
                    defaultCertification.certificationAuthorityStructure?.label
                  }
                  endDetail={<span>Consulter</span>}
                  key={defaultCertification.id}
                  linkProps={{
                    href: `${process.env.NEXT_PUBLIC_WEBSITE_BASE_URL}/certifications/${defaultCertification.id}`,
                    target: "_blank",
                  }}
                  enlargeLink
                  classes={{
                    detail: "mt-2",
                  }}
                />
              )}
          </>
        )}

        <div className="flex flex-row justify-end mt-6">
          <Button
            disabled={isLoadingCohortVaeCollective || !cohorteVaeCollective}
            className="justify-center w-[100%]  md:w-fit"
            onClick={() =>
              router.push(
                `./consent?certificationId=${defaultCertification?.id}`,
              )
            }
          >
            Rejoindre cette cohorte
          </Button>
        </div>
      </div>
    </div>
  );
}
