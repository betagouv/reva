"use client";

import Alert from "@codegouvfr/react-dsfr/Alert";
import Badge from "@codegouvfr/react-dsfr/Badge";
import { toDate } from "date-fns";
import { useRouter } from "next/navigation";

import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { SettingsBreadcrumb } from "@/components/settings/settings-breadcrumb/SettingsBreadcrumb";
import { SettingsPageHeader } from "@/components/settings/settings-page-header/SettingsPageHeader";
import {
  errorToast,
  graphqlErrorToast,
  successToast,
} from "@/components/toast/toast";
import { formatSiret } from "@/utils/formatSiret";

import { StatutValidationInformationsJuridiquesMaisonMereAap } from "@/graphql/generated/types";

import {
  AccountInfoRows,
  pendingIfChanged,
} from "./_components/AccountInfoRows";
import { AdminToggleGestionBranch } from "./_components/AdminToggleGestionBranch";
import { AttestationReferencement } from "./_components/AttestationReferencement";
import { InfoRow } from "./_components/InfoRow";
import { LegalInformationUpdateBlock } from "./_components/legal-information-update-block/LegalInformationUpdateBlock";
import { LegalInformationTile } from "./_components/LegalInformationTile";
import { SiretInformationCard } from "./_components/SiretInformationCard";
import {
  buildLegalInformationPayload,
  Etablissement,
  useGeneralInformationPage,
} from "./generalInformationPage.hook";

const getTileHref = ({
  isAdmin,
  maisonMereAAPId,
  legalInformationUrl,
  statutValidationInformationsJuridiquesMaisonMereAAP: statut,
  updateRequested,
}: {
  isAdmin: boolean;
  maisonMereAAPId: string;
  legalInformationUrl: string;
  statutValidationInformationsJuridiquesMaisonMereAAP: StatutValidationInformationsJuridiquesMaisonMereAap;
  updateRequested: boolean;
}) => {
  if (isAdmin) {
    // Une demande déposée se traite depuis la fiche de vérification.
    if (statut === "EN_ATTENTE_DE_VERIFICATION") {
      return `/maisonMereAAPs/${maisonMereAAPId}`;
    }

    // Demande envoyée: l'administrateur attend que la structure la traite.
    return statut === "A_METTRE_A_JOUR" && updateRequested
      ? undefined
      : legalInformationUrl;
  }

  switch (statut) {
    // Mise à jour demandée par France VAE: page de préparation puis parcours complet.
    case "A_METTRE_A_JOUR":
      return legalInformationUrl;
    // Self-service: l'AAP choisit lui-même les informations à mettre à jour.
    case "A_JOUR":
      return `${legalInformationUrl}/targeted`;
    default:
      return undefined;
  }
};

const GeneralInformationPage = () => {
  const router = useRouter();
  const {
    maisonMereAAP,
    maisonMereAAPId,
    maisonMereAAPSuccess,
    maisonMereAAPError,
    etablissement,
    etablissementIsFetching,
    isGestionnaireMaisonMereAAP,
    isAdmin,
    siret,
    formHook,
    handleReset,
    updateMaisonMereLegalInformation,
  } = useGeneralInformationPage();

  const {
    formState: { isSubmitting, isDirty },
    handleSubmit,
    setValue,
    watch,
  } = formHook;

  const { isFeatureActive } = useFeatureflipping();
  const legalInformationUpdateIsActive = isFeatureActive(
    "MAISON_MERE_GENERAL_INFORMATION_UPDATE",
  );

  const gestionBranchIsChecked = watch("gestionBranch");

  const setGestionBranch = (value: boolean) =>
    setValue("gestionBranch", value, { shouldDirty: true });

  const backUrl = isAdmin
    ? `/maison-mere-aap/${maisonMereAAPId}`
    : "/agencies-settings-v3";

  const handleFormSubmit = handleSubmit(
    async (data) => {
      let payload;

      try {
        payload = buildLegalInformationPayload({
          data,
          etablissement: etablissement as Etablissement,
          maisonMereAAPId,
          currentSiret: maisonMereAAP?.siret,
        });
      } catch (error) {
        return errorToast((error as Error).message);
      }

      try {
        await updateMaisonMereLegalInformation(payload);

        successToast("Les informations ont été modifiées");
        router.push(backUrl);
      } catch (error) {
        graphqlErrorToast(error);
      }
    },
    () =>
      errorToast(
        "Certaines informations enregistrées sont invalides. Corrigez-les depuis la mise à jour des informations générales.",
      ),
  );

  if (!maisonMereAAP || !maisonMereAAP.gestionnaire) {
    return null;
  }

  const legalInformationUrl = `/agencies-settings-v3/${maisonMereAAP.id}/general-information/legal-information`;

  // Les décisions sont triées de la plus récente à la plus ancienne côté API. Les
  // deux types de demande remettent le dossier à mettre à jour, la tuile les annonce.
  const lastUpdateRequest =
    maisonMereAAP.legalInformationDocumentsDecisions.find(
      ({ decision }) => decision !== "VALIDE",
    );
  // L'enregistrement en attente survit à une demande de précisions: hors
  // vérification, il ne décrit plus une demande en cours d'examen.
  const legalInformationDocuments =
    maisonMereAAP.statutValidationInformationsJuridiquesMaisonMereAAP ===
    "EN_ATTENTE_DE_VERIFICATION"
      ? maisonMereAAP.legalInformationDocuments
      : null;

  const canDownloadAttestationReferencement =
    maisonMereAAP.statutValidationInformationsJuridiquesMaisonMereAAP ===
      "A_JOUR" &&
    !!etablissement &&
    !etablissement.dateFermeture;

  const pendingSiret = pendingIfChanged(
    maisonMereAAP.siret,
    legalInformationDocuments?.siret,
  );

  const emphasis = isAdmin ? "pending" : "current";
  const badgeLabel = isAdmin ? "Modifié" : "Traitement en cours";

  const breadcrumb = isAdmin ? (
    <SettingsBreadcrumb
      currentPageLabel="Informations générales"
      homeLinkProps={{ href: "/" }}
      segments={[
        {
          label: "Structures accompagnatrices",
          linkProps: { href: "/maison-mere-aap" },
        },
        {
          label: maisonMereAAP.raisonSociale ?? "Structure",
          linkProps: { href: `/maison-mere-aap/${maisonMereAAP.id}` },
        },
      ]}
    />
  ) : (
    <SettingsBreadcrumb
      currentPageLabel="Informations générales"
      segments={[
        { label: "Paramètres", linkProps: { href: "/agencies-settings-v3" } },
      ]}
    />
  );

  const pageContent = (
    <>
      {etablissement && (
        <AttestationReferencement
          raisonSociale={etablissement.raisonSociale}
          siret={etablissement.siret}
          canDownloadAttestationReferencement={
            canDownloadAttestationReferencement
          }
        />
      )}
      {maisonMereAAPError && (
        <Alert
          className="mb-6"
          severity="error"
          title="Une erreur est survenue pendant la récupération des informations générales."
        />
      )}
      {maisonMereAAPSuccess && (
        <div className="flex flex-col gap-6 my-1">
          <InfoRow
            label="Numéro de SIRET"
            className="border-t"
            badge={
              pendingSiret && (
                <Badge severity="info" small>
                  {badgeLabel}
                </Badge>
              )
            }
            pendingValue={pendingSiret ? formatSiret(pendingSiret) : undefined}
            emphasis={emphasis}
          >
            {formatSiret(maisonMereAAP.siret)}
          </InfoRow>
          <SiretInformationCard
            siret={siret}
            etablissement={etablissement as Etablissement}
            isLoading={etablissementIsFetching}
          />
          <AccountInfoRows
            maisonMereAAP={maisonMereAAP}
            pendingValues={legalInformationDocuments}
            emphasis={emphasis}
            badgeLabel={badgeLabel}
          />
          {legalInformationUpdateIsActive && (
            <LegalInformationTile
              isAdmin={isAdmin}
              href={getTileHref({
                isAdmin,
                maisonMereAAPId: maisonMereAAP.id,
                legalInformationUrl,
                statutValidationInformationsJuridiquesMaisonMereAAP:
                  maisonMereAAP.statutValidationInformationsJuridiquesMaisonMereAAP,
                updateRequested: !!lastUpdateRequest,
              })}
              statutValidationInformationsJuridiquesMaisonMereAAP={
                maisonMereAAP.statutValidationInformationsJuridiquesMaisonMereAAP
              }
              updateRequestedAt={
                lastUpdateRequest && toDate(lastUpdateRequest.decisionTakenAt)
              }
              updateRequestIsTotal={
                lastUpdateRequest?.decision === "DEMANDE_DE_MISE_A_JOUR_TOTALE"
              }
              documentsSubmittedAt={
                legalInformationDocuments &&
                toDate(legalInformationDocuments.createdAt)
              }
            />
          )}
          {/* Flag off, l'encart historique reste la seule entrée du parcours. */}
          {!legalInformationUpdateIsActive &&
            (isGestionnaireMaisonMereAAP || isAdmin) && (
              <LegalInformationUpdateBlock
                hideUpdateButton={isAdmin}
                onUpdateButtonClick={() =>
                  router.push(
                    `/agencies-settings-v3/${maisonMereAAP.id}/general-information/legal-information-update`,
                  )
                }
                statutValidationInformationsJuridiquesMaisonMereAAP={
                  maisonMereAAP.statutValidationInformationsJuridiquesMaisonMereAAP
                }
                decisions={maisonMereAAP.legalInformationDocumentsDecisions
                  .filter(({ decision }) => decision === "DEMANDE_DE_PRECISION")
                  .map((d) => ({
                    ...d,
                    decisionTakenAt: toDate(d.decisionTakenAt),
                  }))}
              />
            )}
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col w-full">
      <SettingsPageHeader
        breadcrumb={breadcrumb}
        title="Informations générales"
      />
      <p>
        Retrouvez ici les informations renseignées lors de l'inscription. Vous
        pouvez signaler un changement en cliquant sur “Modifier mes informations
        générales” en bas de votre écran.
      </p>
      {isAdmin ? (
        // Le formulaire ne sert plus qu'au toggle "Gestion des branches": il n'a
        // pas de mutation dédiée, cet enregistrement est sa seule persistance.
        <form
          className="flex flex-col"
          onSubmit={handleFormSubmit}
          onReset={(e) => {
            e.preventDefault();
            handleReset();
          }}
        >
          {pageContent}
          <AdminToggleGestionBranch
            className="mt-6"
            gestionBranchIsChecked={gestionBranchIsChecked}
            setGestionBranch={setGestionBranch}
          />
          <FormButtons
            className="col-span-2"
            formState={{ isSubmitting, isDirty }}
            backUrl={backUrl}
          />
        </form>
      ) : (
        pageContent
      )}
    </div>
  );
};

export default GeneralInformationPage;
