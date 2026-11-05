"use client";

import Button from "@codegouvfr/react-dsfr/Button";
import ToggleSwitch from "@codegouvfr/react-dsfr/ToggleSwitch";
import { useParams } from "next/navigation";

import { SettingsSummaryForGestionnaire } from "@/app/(private)/(aap)/agencies-settings-v3/_components/agencies-settings-summary/SettingsSummaryForGestionnaire";
import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";
import { Impersonate } from "@/components/impersonate/Impersonate.component";
import { successToast } from "@/components/toast/toast";

import { MaisonMereAap, Organism } from "@/graphql/generated/types";

import { useMaisonMereAAP } from "./_components/maisonMereAAP.hook";

const MaisonMereAapPage = () => {
  const { "maison-mere-id": maisonMereAAPId }: { "maison-mere-id": string } =
    useParams();
  const {
    maisonMereAAP,
    remoteOrganism,
    gestionnaireAccountId,
    comptesCollaborateurs,
    updateOrganismIsActive,
    updateMaisonMereIsSignalized,
    isAdmin,
  } = useMaisonMereAAP(maisonMereAAPId);

  const { isFeatureActive } = useFeatureflipping();

  const isAppAccountListingPageFeatureActive = isFeatureActive(
    "AAP_ACCOUNTS_LISTING_PAGE",
  );
  const isCandidaciesForAAPEnabled = isFeatureActive("CANDIDACIES_FOR_AAP");

  const candidaciesUrl = isCandidaciesForAAPEnabled
    ? `/candidacies/candidacies-for-aap/?page=1&maisonMereAAPId=${maisonMereAAPId}`
    : `/candidacies/?status=ACTIVE_HORS_ABANDON&page=1&maisonMereAAPId=${maisonMereAAPId}`;

  if (!maisonMereAAP) return null;

  const handleIsActiveChange = async (isActive: boolean) => {
    await updateOrganismIsActive({
      maisonMereAAPId,
      isActive,
    });
    successToast(
      isActive
        ? "La maison mère a été activée avec succès"
        : "La maison mère a été désactivée avec succès",
    );
  };

  const handleIsSignalizedChange = async (isSignalized: boolean) => {
    await updateMaisonMereIsSignalized({
      maisonMereAAPId,
      isSignalized,
    });
    successToast(
      isSignalized
        ? "La maison mère a été signalée avec succès"
        : "La maison mère n'est plus signalée",
    );
  };

  return (
    <>
      <div className="flex w-full">
        <h1>{maisonMereAAP.raisonSociale}</h1>
      </div>
      <div className="flex-1 flex flex-col md:flex-row w-full gap-4">
        <Impersonate accountId={gestionnaireAccountId} />
        {isAdmin && (
          <div>
            <Button
              priority="secondary"
              linkProps={{
                href: `/maison-mere-aap/${maisonMereAAPId}/logs`,
              }}
            >
              Journal des actions
            </Button>
          </div>
        )}
        <div>
          <Button
            priority="secondary"
            linkProps={{
              href: candidaciesUrl,
              target: "_blank",
            }}
          >
            Voir les candidatures
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between flex-col w-full  py-2 my-4">
        <div className="flex items-center justify-between w-full flex-wrap pb-4 border-b-[1px] border-y-neutral-200">
          <span>Statut de la structure</span>
          <ToggleSwitch
            label=""
            defaultChecked={maisonMereAAP.isActive}
            inputTitle="Activer tous les lieux d'accueil de la maison mère"
            onChange={(checked) => handleIsActiveChange(checked)}
          />
          <span className="text-xs text-dsfrGray-mentionGrey">
            Si le statut de la structure est désactivé, l'accompagnement à
            distance et les lieux d'accueil ne seront plus affichés aux
            candidats dans les résultats de recherche.
          </span>
        </div>
        <div className="flex items-center justify-between w-full flex-wrap pb-4 border-b-[1px] border-y-neutral-200">
          <span>Signaler cette structure</span>
          <ToggleSwitch
            label=""
            defaultChecked={maisonMereAAP.isSignalized}
            inputTitle="Signaler la maison mère"
            onChange={(checked) => handleIsSignalizedChange(checked)}
          />
          <span className="text-xs text-dsfrGray-mentionGrey">
            À utiliser lorsqu’un ou plusieurs candidats se plaignent des délais
            de traitement de cette structure. Les structures signalées auront un
            badge permettant de les repérer plus facilement.
          </span>
        </div>
      </div>
      <SettingsSummaryForGestionnaire
        gestionnaireAccountId={gestionnaireAccountId}
        organism={remoteOrganism as Organism}
        comptesCollaborateurs={comptesCollaborateurs || []}
        maisonMereAAP={maisonMereAAP as MaisonMereAap}
        isAdmin={isAdmin}
        isAppAccountListingPageFeatureActive={
          isAppAccountListingPageFeatureActive
        }
      />
    </>
  );
};

export default MaisonMereAapPage;
