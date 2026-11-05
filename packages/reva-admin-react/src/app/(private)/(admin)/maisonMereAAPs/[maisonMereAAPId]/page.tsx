"use client";

import Alert from "@codegouvfr/react-dsfr/Alert";
import Badge from "@codegouvfr/react-dsfr/Badge";
import { useQuery } from "@tanstack/react-query";
import { format, toDate } from "date-fns";
import { useParams } from "next/navigation";

import {
  AccountInfoRows,
  pendingIfChanged,
} from "@/app/(private)/(aap)/agencies-settings-v3/[maison-mere-id]/general-information/_components/AccountInfoRows";
import { InfoRow } from "@/app/(private)/(aap)/agencies-settings-v3/[maison-mere-id]/general-information/_components/InfoRow";
import { SiretInformationCard } from "@/app/(private)/(aap)/agencies-settings-v3/[maison-mere-id]/general-information/_components/SiretInformationCard";
import { Etablissement } from "@/app/(private)/(aap)/agencies-settings-v3/[maison-mere-id]/general-information/generalInformationPage.hook";
import { useEtablissement } from "@/components/company-preview/CompanyPreview.hooks";
import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { LegalDocumentList } from "@/components/legal-document-list/LegalDocumentList";
import { SettingsBreadcrumb } from "@/components/settings/settings-breadcrumb/SettingsBreadcrumb";
import { PREVIEW_URL_REFETCH_INTERVAL_MS } from "@/constants/previewUrl.constant";
import { formatSiret } from "@/utils/formatSiret";

import { graphql } from "@/graphql/generated";

import { MandatairesSociauxCard } from "./(components)/MandatairesSociauxCard";
import ValidationDecisionForm from "./(components)/ValidationDecisionForm";

const getMaisonMereAAP = graphql(`
  query getMaisonMereAAPById($maisonMereAAPId: ID!) {
    organism_getMaisonMereAAPById(maisonMereAAPId: $maisonMereAAPId) {
      id
      phone
      siret
      raisonSociale
      createdAt
      statutValidationInformationsJuridiquesMaisonMereAAP
      managerFirstname
      managerLastname
      legalInformationDocuments {
        createdAt
        managerFirstname
        managerLastname
        siret
        gestionnaireFirstname
        gestionnaireLastname
        gestionnaireEmail
        phone
        siretAlreadyUsed
        gestionnaireEmailAlreadyUsed
        attestationURSSAFFile {
          previewUrl
        }
        justificatifIdentiteDirigeantFile {
          previewUrl
        }
        lettreDeDelegationFile {
          previewUrl
        }
        justificatifIdentiteDelegataireFile {
          previewUrl
        }
      }
      gestionnaire {
        firstname
        lastname
        email
      }
    }
  }
`);

const MaisonMereAAPPage = () => {
  const { maisonMereAAPId }: { maisonMereAAPId: string } = useParams();

  const { graphqlClient } = useGraphQlClient();

  const { data: getMaisonMereAAPResponse, isLoading: isMaisonMereAAPLoading } =
    useQuery({
      queryKey: ["getMaisonMereAAP", maisonMereAAPId],
      refetchInterval: PREVIEW_URL_REFETCH_INTERVAL_MS,
      queryFn: () =>
        graphqlClient.request(getMaisonMereAAP, {
          maisonMereAAPId,
        }),
    });

  const maisonMereAAP = getMaisonMereAAPResponse?.organism_getMaisonMereAAPById;

  const isAwaitingVerification =
    maisonMereAAP?.statutValidationInformationsJuridiquesMaisonMereAAP ===
    "EN_ATTENTE_DE_VERIFICATION";

  // Hors vérification en cours, la demande a été traitée: ni avant/après, ni pièces jointes.
  const legalInformationDocuments = isAwaitingVerification
    ? maisonMereAAP?.legalInformationDocuments
    : null;

  // L'administrateur vérifie le SIRET visé par la demande, pas celui qu'il remplace.
  const { etablissement, isLoading: etablissementIsLoading } = useEtablissement(
    legalInformationDocuments?.siret ?? maisonMereAAP?.siret,
  );

  if (isMaisonMereAAPLoading || !maisonMereAAP) {
    return <></>;
  }

  const pendingSiret = pendingIfChanged(
    maisonMereAAP.siret,
    legalInformationDocuments?.siret,
  );

  const targetedSiret = pendingSiret ?? maisonMereAAP.siret;

  const conflicts = [
    legalInformationDocuments?.siretAlreadyUsed &&
      "Le numéro de SIRET renseigné est déjà utilisé pour un autre compte France VAE.",
    legalInformationDocuments?.gestionnaireEmailAlreadyUsed &&
      "L’adresse électronique renseignée est déjà utilisée pour un autre compte France VAE.",
  ].filter((conflict) => typeof conflict === "string");

  return (
    <div className="flex flex-col flex-1">
      <SettingsBreadcrumb
        currentPageLabel={maisonMereAAP.raisonSociale}
        homeLinkProps={{ href: "/" }}
        segments={[
          {
            label: "Vérifications",
            linkProps: { href: "/subscriptions/check-legal-information" },
          },
        ]}
      />
      <h1>{maisonMereAAP.raisonSociale}</h1>
      <p className="mb-1">
        Inscrit depuis le :{" "}
        {format(toDate(maisonMereAAP.createdAt), "dd/MM/yyyy")}
      </p>
      {legalInformationDocuments && (
        <p className="mb-1">
          Demande de modification envoyée le :{" "}
          {format(toDate(legalInformationDocuments.createdAt), "dd/MM/yyyy")}
        </p>
      )}
      <div className="flex flex-col gap-6 mt-6">
        {conflicts.length > 0 && (
          <Alert
            severity="warning"
            small
            description={
              <ul>
                {conflicts.map((conflict) => (
                  <li key={conflict}>{conflict}</li>
                ))}
              </ul>
            }
          />
        )}
        <InfoRow
          label="Numéro de SIRET"
          badge={
            (pendingSiret || legalInformationDocuments?.siretAlreadyUsed) && (
              <>
                {pendingSiret && (
                  <Badge severity="info" small>
                    Modifié
                  </Badge>
                )}
                {legalInformationDocuments?.siretAlreadyUsed && (
                  <Badge severity="warning" small>
                    Déjà enregistré sur France VAE
                  </Badge>
                )}
              </>
            )
          }
          pendingValue={pendingSiret ? formatSiret(pendingSiret) : undefined}
          emphasis="pending"
          className="border-t"
        >
          {formatSiret(maisonMereAAP.siret)}
        </InfoRow>
        <div>
          <SiretInformationCard
            siret={targetedSiret}
            etablissement={etablissement as Etablissement}
            isLoading={etablissementIsLoading}
          />
          {!!etablissement?.kbis?.mandatairesSociaux?.length && (
            <MandatairesSociauxCard
              mandatairesSociaux={etablissement.kbis.mandatairesSociaux}
            />
          )}
        </div>
        <AccountInfoRows
          maisonMereAAP={maisonMereAAP}
          pendingValues={legalInformationDocuments}
          emphasis="pending"
          badgeLabel="Modifié"
          gestionnaireEmailAlreadyUsed={
            legalInformationDocuments?.gestionnaireEmailAlreadyUsed
          }
        />
        {legalInformationDocuments && (
          <>
            <LegalDocumentList
              collapsible
              attestationURSSAFFileUrl={
                legalInformationDocuments.attestationURSSAFFile?.previewUrl
              }
              justificatifIdentiteDirigeantFileUrl={
                legalInformationDocuments.justificatifIdentiteDirigeantFile
                  ?.previewUrl
              }
              lettreDeDelegationFileUrl={
                legalInformationDocuments.lettreDeDelegationFile?.previewUrl
              }
              justificatifIdentiteDelegataireFileUrl={
                legalInformationDocuments.justificatifIdentiteDelegataireFile
                  ?.previewUrl
              }
            />
            <hr />
            <ValidationDecisionForm
              maisonMereAAPId={maisonMereAAP.id}
              aapUpdatedDocumentsAt={legalInformationDocuments.createdAt}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default MaisonMereAAPPage;
