import SideMenu, { SideMenuProps } from "@codegouvfr/react-dsfr/SideMenu";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";

import { useAuth } from "@/components/auth/auth";
import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";

import {
  CandidacyCountByStatus,
  CandidacyStatusFilter,
} from "@/graphql/generated/types";

import { MaisonMereAAP } from "./MaisonMereAAP";

const CandidaciesListSideMenu = ({
  candidaciesByStatusCount,
  cohortesVaeCollectives,
}: {
  candidaciesByStatusCount: CandidacyCountByStatus;
  cohortesVaeCollectives: { id: string; nom: string }[];
}) => {
  const searchParams = useSearchParams();
  const candidacyStatus = searchParams.get("status");
  const searchFilter = searchParams.get("search") || "";
  const sortByFilter = searchParams.get("sortBy");
  const maisonMereAAPId = searchParams.get("maisonMereAAPId") as
    | string
    | undefined;

  const { isAdmin } = useAuth();
  const { isFeatureActive } = useFeatureflipping();

  const hrefSideMenu = (
    status: CandidacyStatusFilter,
    extraParams?: Record<string, string>,
  ) => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("status", status);

    if (searchFilter) {
      params.set("search", searchFilter);
    }
    if (sortByFilter) {
      params.set("sortBy", sortByFilter);
    }
    if (maisonMereAAPId) {
      params.set("maisonMereAAPId", maisonMereAAPId);
    }

    //add extra params to the url params
    Object.entries(extraParams || {}).forEach(([key, value]) => {
      params.set(key, value);
    });

    return `/candidacies?${params.toString()}`;
  };

  const isActive = (
    status: CandidacyStatusFilter,
    extraParams?: Record<string, string>,
  ) =>
    candidacyStatus === status &&
    //if isActive depends on extraParams we check if they are all present in the url
    Object.entries(extraParams || {}).every(
      ([key, value]) => searchParams.get(key) === value,
    );

  const showCounters = !isFeatureActive("DISABLE_CANDIDACIES_PAGE_COUNTERS");

  const getCounterText = (status: CandidacyStatusFilter) =>
    showCounters ? `(${candidaciesByStatusCount?.[status] ?? 0})` : "";

  const sideMenuItems: SideMenuProps.Item[] = [
    {
      linkProps: {
        href: hrefSideMenu("ACTIVE_HORS_ABANDON"),
      },
      expandedByDefault: true,
      isActive: isActive("ACTIVE_HORS_ABANDON"),
      text: `Toutes les candidatures actives ${getCounterText("ACTIVE_HORS_ABANDON")}`,
      items: [
        {
          linkProps: {
            href: hrefSideMenu("VALIDATION_HORS_ABANDON"),
          },
          text: `Nouvelles candidatures ${getCounterText("VALIDATION_HORS_ABANDON")}`,
          isActive: isActive("VALIDATION_HORS_ABANDON"),
        },
        {
          linkProps: {
            href: hrefSideMenu("PRISE_EN_CHARGE_HORS_ABANDON"),
          },
          text: `Candidatures prises en charge ${getCounterText("PRISE_EN_CHARGE_HORS_ABANDON")}`,
          isActive: isActive("PRISE_EN_CHARGE_HORS_ABANDON"),
        },
        {
          linkProps: {
            href: hrefSideMenu("PARCOURS_ENVOYE_HORS_ABANDON"),
          },
          text: `Parcours envoyés ${getCounterText("PARCOURS_ENVOYE_HORS_ABANDON")}`,
          isActive: isActive("PARCOURS_ENVOYE_HORS_ABANDON"),
        },
        {
          linkProps: {
            href: hrefSideMenu("PARCOURS_CONFIRME_HORS_ABANDON"),
          },
          text: `Parcours confirmés par le candidat ${getCounterText("PARCOURS_CONFIRME_HORS_ABANDON")}`,
          isActive: isActive("PARCOURS_CONFIRME_HORS_ABANDON"),
        },
        {
          linkProps: {
            href: hrefSideMenu("DOSSIER_FAISABILITE_ENVOYE_HORS_ABANDON"),
          },
          text: `Dossiers de faisabilité envoyés ${getCounterText("DOSSIER_FAISABILITE_ENVOYE_HORS_ABANDON")}`,
          isActive: isActive("DOSSIER_FAISABILITE_ENVOYE_HORS_ABANDON"),
        },
        {
          linkProps: {
            href: hrefSideMenu("DOSSIER_FAISABILITE_INCOMPLET_HORS_ABANDON"),
          },
          text: `Dossiers de faisabilité incomplets ${getCounterText("DOSSIER_FAISABILITE_INCOMPLET_HORS_ABANDON")}`,
          isActive: isActive("DOSSIER_FAISABILITE_INCOMPLET_HORS_ABANDON"),
        },
        {
          linkProps: {
            href: hrefSideMenu("DOSSIER_FAISABILITE_RECEVABLE_HORS_ABANDON"),
          },
          text: `Dossiers de faisabilité recevables ${getCounterText("DOSSIER_FAISABILITE_RECEVABLE_HORS_ABANDON")}`,
          isActive: isActive("DOSSIER_FAISABILITE_RECEVABLE_HORS_ABANDON"),
        },
        {
          linkProps: {
            href: hrefSideMenu("DOSSIER_DE_VALIDATION_ENVOYE_HORS_ABANDON"),
          },
          text: `Dossiers de validation envoyés ${getCounterText("DOSSIER_DE_VALIDATION_ENVOYE_HORS_ABANDON")}`,
          isActive: isActive("DOSSIER_DE_VALIDATION_ENVOYE_HORS_ABANDON"),
        },
        {
          linkProps: {
            href: hrefSideMenu("DOSSIER_DE_VALIDATION_SIGNALE_HORS_ABANDON"),
          },
          text: `Dossiers de validation signalés ${getCounterText("DOSSIER_DE_VALIDATION_SIGNALE_HORS_ABANDON")}`,
          isActive: isActive("DOSSIER_DE_VALIDATION_SIGNALE_HORS_ABANDON"),
        },
      ],
    },
    {
      text: `Toutes les candidatures en jury ${getCounterText("JURY_HORS_ABANDON")}`,
      linkProps: {
        href: hrefSideMenu("JURY_HORS_ABANDON"),
      },
      items: [
        {
          linkProps: {
            href: hrefSideMenu("JURY_PROGRAMME_HORS_ABANDON"),
          },
          text: `Jurys programmés ${getCounterText("JURY_PROGRAMME_HORS_ABANDON")}`,
          isActive: isActive("JURY_PROGRAMME_HORS_ABANDON"),
        },
        {
          linkProps: {
            href: hrefSideMenu("JURY_PASSE_HORS_ABANDON"),
          },
          text: `Résultats renseignés ${getCounterText("JURY_PASSE_HORS_ABANDON")}`,
          isActive: isActive("JURY_PASSE_HORS_ABANDON"),
        },
      ],
      isActive: isActive("JURY_HORS_ABANDON"),
    },

    {
      text: `Toutes les candidatures non recevables ${getCounterText("DOSSIER_FAISABILITE_NON_RECEVABLE_HORS_ABANDON")}`,
      linkProps: {
        href: hrefSideMenu("DOSSIER_FAISABILITE_NON_RECEVABLE_HORS_ABANDON"),
      },
      isActive: isActive("DOSSIER_FAISABILITE_NON_RECEVABLE_HORS_ABANDON"),
    },
    {
      text: `Toutes les candidatures abandonnées ${getCounterText("ABANDON")}`,
      linkProps: {
        href: hrefSideMenu("ABANDON"),
      },
      isActive: isActive("ABANDON"),
    },
    {
      text: `Toutes les candidatures réorientées ${getCounterText("REORIENTEE")}`,
      linkProps: {
        href: hrefSideMenu("REORIENTEE"),
      },
      isActive: isActive("REORIENTEE"),
    },
    {
      text: `Toutes les candidatures supprimées ${getCounterText("ARCHIVE_HORS_ABANDON_HORS_REORIENTATION")}`,
      linkProps: {
        href: hrefSideMenu("ARCHIVE_HORS_ABANDON_HORS_REORIENTATION"),
      },
      isActive: isActive("ARCHIVE_HORS_ABANDON_HORS_REORIENTATION"),
    },
    {
      text: `Demandes de financement envoyées ${getCounterText("DEMANDE_FINANCEMENT_ENVOYEE")}`,
      linkProps: {
        href: hrefSideMenu("DEMANDE_FINANCEMENT_ENVOYEE"),
      },
      isActive: isActive("DEMANDE_FINANCEMENT_ENVOYEE"),
    },
    {
      text: `Demandes de paiement envoyées ${getCounterText("DEMANDE_PAIEMENT_ENVOYEE")}`,
      linkProps: {
        href: hrefSideMenu("DEMANDE_PAIEMENT_ENVOYEE"),
      },
      isActive: isActive("DEMANDE_PAIEMENT_ENVOYEE"),
    },
    {
      text: `Demandes de paiement à envoyer ${getCounterText("DEMANDE_PAIEMENT_A_ENVOYER")}`,
      linkProps: {
        href: hrefSideMenu("DEMANDE_PAIEMENT_A_ENVOYER"),
      },
      isActive: isActive("DEMANDE_PAIEMENT_A_ENVOYER"),
    },
  ];

  if (isAdmin) {
    sideMenuItems.push({
      text: `Tous les projets en cours d'édition ${getCounterText("PROJET_HORS_ABANDON")}`,
      linkProps: {
        href: hrefSideMenu("PROJET_HORS_ABANDON"),
      },
      isActive: isActive("PROJET_HORS_ABANDON"),
    });
    const cohorteSelected = !!searchParams.get("cohorteVaeCollectiveId");
    sideMenuItems.push({
      text: `VAE Collective ${getCounterText("VAE_COLLECTIVE")}`,
      linkProps: {
        href: hrefSideMenu("VAE_COLLECTIVE"),
      },
      isActive: isActive("VAE_COLLECTIVE") && !cohorteSelected,
      ...(!!cohortesVaeCollectives.length
        ? {
            items: cohortesVaeCollectives.map((cohorteVaeCollective) => ({
              text: cohorteVaeCollective.nom,
              linkProps: {
                href: hrefSideMenu("VAE_COLLECTIVE", {
                  cohorteVaeCollectiveId: cohorteVaeCollective.id,
                }),
              },
              isActive: isActive("VAE_COLLECTIVE", {
                cohorteVaeCollectiveId: cohorteVaeCollective.id,
              }),
            })),
          }
        : {}),
    });
  }

  sideMenuItems.push({
    text: `Accompagnements terminés ${getCounterText("END_ACCOMPAGNEMENT")}`,
    linkProps: {
      href: hrefSideMenu("END_ACCOMPAGNEMENT"),
    },
    isActive: isActive("END_ACCOMPAGNEMENT"),
  });

  return (
    <nav
      role="navigation"
      aria-label="Menu latéral"
      className="flex flex-col gap-4 md:w-[282px] md:flex-shrink-0 [overflow-wrap:anywhere]"
    >
      {isAdmin && maisonMereAAPId && (
        <MaisonMereAAP maisonMereAAPId={maisonMereAAPId} />
      )}
      <SideMenu
        className="flex-shrink-0 flex-grow-0 md:basis-[400px]"
        align="left"
        burgerMenuButtonText="Candidatures"
        items={sideMenuItems}
      />
    </nav>
  );
};

export const CandidaciesLayout = ({
  children,
  candidaciesByStatusCount,
  cohortesVaeCollectives,
}: {
  children: ReactNode;
  candidaciesByStatusCount: CandidacyCountByStatus;
  cohortesVaeCollectives: { id: string; nom: string }[];
}) => (
  <div className="flex flex-col flex-1 md:flex-row gap-10 md:gap-0">
    <CandidaciesListSideMenu
      candidaciesByStatusCount={candidaciesByStatusCount}
      cohortesVaeCollectives={cohortesVaeCollectives}
    />
    <div className="mt-3 flex-1">{children}</div>
  </div>
);
