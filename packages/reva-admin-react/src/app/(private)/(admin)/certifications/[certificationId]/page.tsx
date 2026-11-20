"use client";

import { Button } from "@codegouvfr/react-dsfr/Button";
import { useParams, useRouter } from "next/navigation";
import { ReactNode } from "react";

import { EnhancedSectionCard } from "@/components/card/enhanced-section-card/EnhancedSectionCard";
import { CertificationAdditionalInfoSummaryCard } from "@/components/certifications/certification-additional-info-summary-card/CertificationAdditionalInfoSummaryCard";
import { CertificationCompetenceBlocsSummaryCard } from "@/components/certifications/certification-competence-blocs-summary-card/CertificationCompetenceBlocsSummaryCard";
import { CertificationParcoursCard } from "@/components/certifications/certification-parcours-card/CertificationParcoursCard";
import CertificationPrerequisitesCard from "@/components/certifications/certification-prerequisites-card/CertificationPrerequisitesCard";
import CertificationSummaryCard from "@/components/certifications/certification-summary-card/CertificationSummaryCard";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";

import { NoCertificationAuthorityAlert } from "./structure/_components/NoCertificationAuthorityAlert";
import { NoCertificationRegistryManagerAlert } from "./structure/_components/NoCertificationRegistryManagerAlert";
import { useUpdateCertificationPage } from "./updateCertification.hook";

type CertificationForPage = Exclude<
  ReturnType<typeof useUpdateCertificationPage>["certification"],
  undefined
>;

export default function UpdateCertificationPage() {
  const { certificationId } = useParams<{
    certificationId: string;
  }>();

  const { certification, getCertificationQueryStatus } =
    useUpdateCertificationPage({ certificationId });
  return getCertificationQueryStatus === "success" && certification ? (
    <PageContent certification={certification} />
  ) : null;
}

const PageContent = ({
  certification,
}: {
  certification: CertificationForPage;
}) => {
  const router = useRouter();

  const structureSummaryCardComplete =
    !!certification.certificationAuthorityStructure;

  const {
    sendCertificationToRegistryManager,
    resetCompetenceBlocsByCertification,
  } = useUpdateCertificationPage({
    certificationId: certification.id,
  });

  const onClickSend = async () => {
    try {
      await sendCertificationToRegistryManager.mutateAsync();
      successToast("La certification a bien été envoyée");
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  const onClickReset = async () => {
    try {
      await resetCompetenceBlocsByCertification.mutateAsync();
      successToast(
        "Les blocs de compétences de la certification ont bien été réinitialisés",
      );
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  const isEditable = certification.status == "BROUILLON";
  const hasReducedRequirements =
    certification.certificationAuthorityStructure?.hasReducedRequirements ??
    false;

  return (
    <div className="w-full" data-testid="update-certification-page">
      <h1>{certification.label}</h1>
      <p className="mb-12 text-xl">
        Pour faciliter l’ajout, renseignez le code RNCP pour pré-remplir le
        document avec les informations de France compétences et du Formacode.
        Ensuite, vous pourrez renseigner une structure certificatrice et (à
        minima) un gestionnaire des candidatures.
      </p>

      <div className="flex flex-col gap-8">
        {isEditable && (
          <div
            data-testid="button-reset"
            className="flex flex-row justify-end mt-2"
          >
            <Button
              type="button"
              iconId="fr-icon-refresh-line"
              onClick={onClickReset}
              priority="tertiary no outline"
              title="Label button"
            >
              Réinitialiser depuis France Compétences
            </Button>
          </div>
        )}

        <CertificationSummaryCard certification={certification} />

        <CertificationCompetenceBlocsSummaryCard
          isEditable={isEditable}
          competenceBlocs={certification.competenceBlocs}
          onAddBlocCompetenceButtonClick={() =>
            router.push(
              `/certifications/${certification.id}/bloc-competence/add`,
            )
          }
          onUpdateCompetenceBlocButtonClick={(blocId) =>
            router.push(
              `/certifications/${certification.id}/bloc-competence/${blocId}`,
            )
          }
        />

        {!hasReducedRequirements && (
          <CertificationPrerequisitesCard
            prerequisites={certification.prerequisites}
            isEditable={isEditable}
            customButtonTitle="Modifier"
            buttonOnClickHref={`/certifications/${certification.id}/prerequisites`}
          />
        )}

        {!hasReducedRequirements && (
          <CertificationAdditionalInfoSummaryCard
            isAdmin
            updateButtonHref={`/responsable-certifications/certifications/${certification.id}/additional-info`}
            certificationAdditionalInfo={certification.additionalInfo}
          />
        )}

        <EnhancedSectionCard
          data-testid="certification-structure-summary-card"
          title="Structure certificatrice et gestionnaires"
          titleIconClass="fr-icon-group-fill"
          isEditable
          status={structureSummaryCardComplete ? "COMPLETED" : "TO_COMPLETE"}
          buttonOnClickHref={
            isEditable
              ? `/certifications/${certification.id}/structure`
              : undefined
          }
        >
          {structureSummaryCardComplete && (
            <>
              <Info
                title="Structure certificatrice"
                data-testid="certification-authority-structure-label"
              >
                {certification.certificationAuthorityStructure?.label}
              </Info>
              {!certification.certificationAuthorityStructure
                ?.certificationRegistryManager && (
                <NoCertificationRegistryManagerAlert className="mt-4" />
              )}
              {certification.certificationAuthorities.length ? (
                <>
                  <h3 className="mt-4 mb-2">
                    Gestionnaires des candidatures liés à cette structure
                  </h3>
                  <ul
                    className="list-none"
                    data-testid="certification-authority-list"
                  >
                    {certification.certificationAuthorities.map((ca) => (
                      <li
                        key={ca.id}
                        className="border-t border-light-decisions-border-border-default-grey font-bold pt-2 mb-1"
                      >
                        {ca.label}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <NoCertificationAuthorityAlert className="mt-4" />
              )}
            </>
          )}
        </EnhancedSectionCard>

        {hasReducedRequirements &&
          certification.parcoursByCertificationAuthorities && (
            <CertificationParcoursCard
              certificationHasParcours={
                (certification.parcours?.info?.totalRows ?? 0) > 0
              }
              parcoursByCertificationAuthorities={
                certification.parcoursByCertificationAuthorities
              }
            />
          )}
      </div>
      <hr className="mt-8" />
      {isEditable && (
        <>
          <h2>Validation par le responsable des certifications</h2>
          <div className="flex">
            <p className="mb-0">
              Lorsque la certification est prête, vous devez l’envoyer au
              responsable des certifications pour validation. Si aucun
              responsable de certifications n’existe pour le moment et qu’aucune
              validation n’est possible, elle pourra être visible des AAP mais
              pas encore des candidats.
            </p>
            <Button
              data-testid="button-send"
              disabled={!certification.certificationAuthorityStructure}
              className="h-[40px] self-end"
              onClick={onClickSend}
            >
              Envoyer
            </Button>
          </div>
          <hr className="mt-8 mb-6" />
        </>
      )}
      <Button
        priority="secondary"
        linkProps={{ href: "/certifications", target: "_self" }}
      >
        Retour
      </Button>
    </div>
  );
};

const Info = ({
  title,
  children,
  className,
  "data-testid": dataTest,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}) => (
  <dl data-testid={dataTest} className={`${className || ""}`}>
    <dt className="mb-1">{title}</dt>
    <dd className="font-medium">{children}</dd>
  </dl>
);
