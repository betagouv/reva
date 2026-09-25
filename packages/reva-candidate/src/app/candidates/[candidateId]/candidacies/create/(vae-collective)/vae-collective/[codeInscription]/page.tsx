"use client";

import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import { Card } from "@codegouvfr/react-dsfr/Card";
import { Tile } from "@codegouvfr/react-dsfr/Tile";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { EnhancedSectionCard } from "@/components/card/enhanced-section-card/EnhancedSectionCard";

import { useGetVaeCollectiveCohort } from "./getVaeCollective.hook";

export default function RejoindreVaeCollectivePage() {
  const router = useRouter();

  const { cohorteVaeCollective, isLoading: isLoadingCohortVaeCollective } =
    useGetVaeCollectiveCohort();

  const defaultCertification =
    cohorteVaeCollective?.certificationCohorteVaeCollectives[0]?.certification;

  const selectedCertificationIdParams =
    useSearchParams().get("certificationId");

  const selectedCertificationId = useMemo(() => {
    if (cohorteVaeCollective?.certificationCohorteVaeCollectives.length === 1) {
      return cohorteVaeCollective?.certificationCohorteVaeCollectives[0]
        ?.certification?.id;
    }

    return selectedCertificationIdParams;
  }, [
    selectedCertificationIdParams,
    cohorteVaeCollective?.certificationCohorteVaeCollectives,
  ]);

  const selectCertification = useMemo(() => {
    return cohorteVaeCollective?.certificationCohorteVaeCollectives.find(
      (certification) =>
        certification.certification?.id === selectedCertificationId,
    )?.certification;
  }, [
    selectedCertificationId,
    cohorteVaeCollective?.certificationCohorteVaeCollectives,
  ]);

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
              selectCertification && (
                <Card
                  size="small"
                  title={selectCertification.label}
                  detail={`RNCP ${selectCertification.codeRncp}`}
                  desc={
                    selectCertification.certificationAuthorityStructure?.label
                  }
                  endDetail={<span>Consulter</span>}
                  key={selectCertification.id}
                  linkProps={{
                    href: `${process.env.NEXT_PUBLIC_WEBSITE_BASE_URL}/certifications/${selectCertification.id}`,
                    target: "_blank",
                  }}
                  enlargeLink
                  classes={{
                    detail: "mt-2",
                  }}
                />
              )}

            {cohorteVaeCollective?.certificationCohorteVaeCollectives.length >
              1 && (
              <>
                {selectCertification ? (
                  <Card
                    size="small"
                    title={selectCertification.label}
                    detail={`RNCP ${selectCertification.codeRncp}`}
                    desc={
                      selectCertification.certificationAuthorityStructure?.label
                    }
                    endDetail={<span>Consulter</span>}
                    key={selectCertification.id}
                    linkProps={{
                      href: `${process.env.NEXT_PUBLIC_WEBSITE_BASE_URL}/certifications/${selectCertification.id}`,
                      target: "_blank",
                    }}
                    enlargeLink
                    classes={{
                      detail: "mt-2",
                    }}
                  />
                ) : (
                  <div className="border border-gray-200 shadow">
                    <EnhancedSectionCard
                      title="Certification visée"
                      titleIconClass="fr-icon-award-fill"
                      isEditable
                      status={"TO_COMPLETE"}
                      buttonOnClickHref={`./search-certification`}
                      data-testid="certification-section"
                      CustomBadge={<></>}
                    >
                      <p className="text-md mb-2 ml-10 w-[60%]">
                        Si votre cohorte a plusieurs certifications, la
                        certification que vous visez reste modifiable au début
                        du parcours. Votre accompagnateur est là pour vous aider
                        à faire votre choix.
                      </p>
                    </EnhancedSectionCard>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <div className="flex flex-row justify-end mt-6">
          <Button
            disabled={isLoadingCohortVaeCollective || !cohorteVaeCollective}
            className="justify-center w-[100%]  md:w-fit"
            onClick={() =>
              router.push(
                `./consent?certificationId=${selectedCertificationId ?? defaultCertification?.id}`,
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
