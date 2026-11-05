import Badge from "@codegouvfr/react-dsfr/Badge";
import { Highlight } from "@codegouvfr/react-dsfr/Highlight";
import { ReactNode } from "react";

import { GestionnaireMaisonMereAAPSettingsSectionAccountList } from "@/app/(private)/(aap)/agencies-settings-v3/_components/agencies-settings-section/GestionnaireMaisonMereAAPSettingsSectionAccountList";
import { BadgeCompleted } from "@/components/badge/badge-completed/BadgeCompleted";
import { EnhancedSectionCard } from "@/components/card/enhanced-section-card/EnhancedSectionCard";
import { AAPSettingsSummarySectionRemote } from "@/components/settings/aap-settings-summary-section-remote/AAPSettingsSummarySectionRemote";
import { SmallNotice } from "@/components/small-notice/SmallNotice";

import { Account, MaisonMereAap, Organism } from "@/graphql/generated/types";

import { AAPSettingsSectionOnSite } from "../AAPSettingsSectionOnSite";

// Le badge de la ligne "Informations générales" suit le statut du dossier juridique,
// quel que soit le rôle qui consulte la page.
const GENERAL_INFORMATION_BADGES: Record<
  MaisonMereAap["statutValidationInformationsJuridiquesMaisonMereAAP"],
  ReactNode
> = {
  A_METTRE_A_JOUR: (
    <Badge data-testid="to-update-badge" severity="warning">
      À mettre à jour
    </Badge>
  ),
  EN_ATTENTE_DE_VERIFICATION: (
    <Badge data-testid="awaiting-verification-badge" severity="info">
      En attente de vérification
    </Badge>
  ),
  A_JOUR: <BadgeCompleted />,
};

const getRemoteOrganism = ({
  organism,
  maisonMereAAP,
}: {
  organism: Organism;
  maisonMereAAP: MaisonMereAap;
}) => {
  // Utiliser l'organisme actuel si il est configuré pour l'acompagnement à distance
  if (organism?.modaliteAccompagnement === "A_DISTANCE") {
    return organism;
  }

  // Sinon, vérifier parmi toutes les organismes s'il y en a un configuré pour l'acompagnement à distance
  const maisonMereAAPRemoteOrganism = maisonMereAAP?.organisms?.find(
    (o) => o.modaliteAccompagnement === "A_DISTANCE",
  );
  if (maisonMereAAPRemoteOrganism) {
    return maisonMereAAPRemoteOrganism;
  }
};

export const SettingsSummaryForGestionnaire = ({
  maisonMereAAP,
  organism,
  gestionnaireAccountId,
  isAdmin,
  comptesCollaborateurs,
  isAppAccountListingPageFeatureActive,
}: {
  maisonMereAAP: MaisonMereAap;
  organism: Organism;
  gestionnaireAccountId: string;
  isAdmin: boolean;
  comptesCollaborateurs: Pick<
    Account,
    "id" | "email" | "firstname" | "lastname" | "disabledAt"
  >[];
  isAppAccountListingPageFeatureActive: boolean;
}) => {
  if (!maisonMereAAP) {
    return null;
  }
  const isGeneralInformationCompleted = [
    "A_JOUR",
    "EN_ATTENTE_DE_VERIFICATION",
  ].includes(maisonMereAAP.statutValidationInformationsJuridiquesMaisonMereAAP);

  const isFinancingMethodsCompleted = maisonMereAAP.isMCFCompatible !== null;

  const remoteOrganism = getRemoteOrganism({
    organism: organism as Organism,
    maisonMereAAP: maisonMereAAP as MaisonMereAap,
  });

  let otherAccounts = comptesCollaborateurs.filter(
    (account) => account.id != gestionnaireAccountId,
  );

  otherAccounts = isAdmin
    ? otherAccounts
    : otherAccounts.filter((account) => !account.disabledAt);

  const hasOtherAccounts = !!otherAccounts.length;

  return (
    <div className="flex flex-col gap-8 mt-4 w-full">
      <EnhancedSectionCard
        data-testid="general-information"
        title="Informations générales"
        CustomBadge={
          GENERAL_INFORMATION_BADGES[
            maisonMereAAP.statutValidationInformationsJuridiquesMaisonMereAAP
          ]
        }
        isEditable
        buttonOnClickHref={`/agencies-settings-v3/${maisonMereAAP.id}/general-information`}
        titleIconClass="fr-icon-information-fill"
      />
      <EnhancedSectionCard
        data-testid="financing-methods"
        title="Modalités de financement"
        status={isFinancingMethodsCompleted ? "COMPLETED" : "TO_COMPLETE"}
        isEditable
        buttonOnClickHref={`/agencies-settings-v3/${maisonMereAAP.id}/financing-methods`}
        titleIconClass="fr-icon-coin-fill"
      >
        {!isFinancingMethodsCompleted && (
          <p data-testid="no-financing-method-text">
            Vous êtes référencé sur la plateforme Mon Compte Formation ?
            Faites-le faire savoir aux candidats afin qu’ils puissent financer
            l’accompagnement via ce dispositif.
          </p>
        )}
        {isFinancingMethodsCompleted && (
          <Highlight
            className="[&_p]:mb-0"
            data-testid="financing-methods-text"
          >
            {maisonMereAAP.isMCFCompatible
              ? "Référencé Mon Compte Formation"
              : "Non-référencé Mon Compte Formation"}
          </Highlight>
        )}
      </EnhancedSectionCard>
      <AAPSettingsSummarySectionRemote
        organism={remoteOrganism}
        detailsPageUrl={`/agencies-settings-v3/${maisonMereAAP.id}/organisms/${remoteOrganism?.id}/remote`}
      />
      <AAPSettingsSectionOnSite
        organisms={maisonMereAAP?.organisms.filter(
          (o) => o.modaliteAccompagnement === "LIEU_ACCUEIL",
        )}
        maisonMereAAPId={maisonMereAAP.id}
        isEditable={!isAdmin}
      />
      {isAppAccountListingPageFeatureActive ? (
        <EnhancedSectionCard
          data-testid="user-accounts"
          title="Comptes collaborateurs"
          isEditable
          disabled={!isGeneralInformationCompleted}
          titleIconClass="fr-icon-team-fill"
          customButtonTitle={isAdmin ? "Consulter" : "Modifier"}
          buttonOnClickHref={`/agencies-settings-v3/${maisonMereAAP.id}/user-accounts/list`}
        >
          <p className="ml-10 md:w-4/5">
            Vous avez besoin de collaborer à plusieurs sur la plateforme ?
            Donnez à vos collaborateurs l’accès aux candidatures, sur un ou
            plusieurs lieux (distanciel et/ou présentiel).
          </p>
        </EnhancedSectionCard>
      ) : (
        <EnhancedSectionCard
          data-testid="user-accounts"
          title="Comptes collaborateurs"
          isEditable={!isAdmin}
          disabled={!isGeneralInformationCompleted}
          buttonOnClickHref={`/agencies-settings-v3/${maisonMereAAP.id}/user-accounts/add-user-account`}
          titleIconClass="fr-icon-team-fill"
          CustomBadge={<div />}
          status={hasOtherAccounts ? "COMPLETED" : "TO_COMPLETE"}
          customButtonTitle={"Créer un compte"}
        >
          {hasOtherAccounts ? (
            <GestionnaireMaisonMereAAPSettingsSectionAccountList
              gestionnaireAccountId={gestionnaireAccountId}
              maisonMereAAPId={maisonMereAAP.id}
              isAdmin={isAdmin}
              comptesCollaborateurs={comptesCollaborateurs}
            />
          ) : (
            <p className="ml-10 md:w-4/5">
              Vous avez besoin de collaborer à plusieurs sur la plateforme ?
              Créez des comptes collaborateurs pour que vos collaborateurs
              puissent avoir accès à leurs candidatures.
            </p>
          )}
          {!isGeneralInformationCompleted && (
            <SmallNotice>
              Vous pourrez ajouter des comptes collaborateurs une fois que vous
              aurez complété les paramètres précédents.
            </SmallNotice>
          )}
        </EnhancedSectionCard>
      )}
    </div>
  );
};
