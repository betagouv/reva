import { SideMenu, SideMenuProps } from "@codegouvfr/react-dsfr/SideMenu";

import {
  CandidacyCountByStatus,
  CandidacyStatusFilter,
} from "@/graphql/generated/types";

export const VaeCollectivesSideMenu = ({
  cohortes,
  cohorteIdFilter,
  searchFilter,
  statusFilter,
  candidacyCountByStatus,
}: {
  cohortes: { id: string; nom: string }[];
  cohorteIdFilter?: string | null;
  searchFilter: string;
  statusFilter: CandidacyStatusFilter;
  candidacyCountByStatus?: CandidacyCountByStatus;
}) => {
  const hrefSideMenu = (cohorteId: string, status: CandidacyStatusFilter) =>
    `/vae-collectives?cohorteId=${cohorteId}&status=${status}&search=${searchFilter}`;

  const getCohorteItems = (cohorteId: string): SideMenuProps.Item[] => {
    const isActive = (status: CandidacyStatusFilter) =>
      cohorteId === cohorteIdFilter && status === statusFilter;

    const getCounterText = (status: CandidacyStatusFilter) =>
      `(${candidacyCountByStatus?.[status] ?? 0})`;

    return [
      {
        linkProps: {
          href: hrefSideMenu(cohorteId, "ACTIVE_HORS_ABANDON"),
        },
        expandedByDefault: true,
        isActive: isActive("ACTIVE_HORS_ABANDON"),
        text: `Candidatures actives ${getCounterText("ACTIVE_HORS_ABANDON")}`,
        items: [
          {
            linkProps: {
              href: hrefSideMenu(cohorteId, "VALIDATION_HORS_ABANDON"),
            },
            text: `Nouvelles candidatures ${getCounterText("VALIDATION_HORS_ABANDON")}`,
            isActive: isActive("VALIDATION_HORS_ABANDON"),
          },
          {
            linkProps: {
              href: hrefSideMenu(cohorteId, "PRISE_EN_CHARGE_HORS_ABANDON"),
            },
            text: `Candidatures prises en charge ${getCounterText("PRISE_EN_CHARGE_HORS_ABANDON")}`,
            isActive: isActive("PRISE_EN_CHARGE_HORS_ABANDON"),
          },
          {
            linkProps: {
              href: hrefSideMenu(cohorteId, "PARCOURS_ENVOYE_HORS_ABANDON"),
            },
            text: `Parcours envoyés ${getCounterText("PARCOURS_ENVOYE_HORS_ABANDON")}`,
            isActive: isActive("PARCOURS_ENVOYE_HORS_ABANDON"),
          },
          {
            linkProps: {
              href: hrefSideMenu(cohorteId, "PARCOURS_CONFIRME_HORS_ABANDON"),
            },
            text: `Parcours confirmés par le candidat ${getCounterText("PARCOURS_CONFIRME_HORS_ABANDON")}`,
            isActive: isActive("PARCOURS_CONFIRME_HORS_ABANDON"),
          },
          {
            linkProps: {
              href: hrefSideMenu(
                cohorteId,
                "DOSSIER_FAISABILITE_ENVOYE_HORS_ABANDON",
              ),
            },
            text: `Dossiers de faisabilité envoyés ${getCounterText("DOSSIER_FAISABILITE_ENVOYE_HORS_ABANDON")}`,
            isActive: isActive("DOSSIER_FAISABILITE_ENVOYE_HORS_ABANDON"),
          },
          {
            linkProps: {
              href: hrefSideMenu(
                cohorteId,
                "DOSSIER_FAISABILITE_INCOMPLET_HORS_ABANDON",
              ),
            },
            text: `Dossiers de faisabilité incomplets ${getCounterText("DOSSIER_FAISABILITE_INCOMPLET_HORS_ABANDON")}`,
            isActive: isActive("DOSSIER_FAISABILITE_INCOMPLET_HORS_ABANDON"),
          },
          {
            linkProps: {
              href: hrefSideMenu(
                cohorteId,
                "DOSSIER_FAISABILITE_RECEVABLE_HORS_ABANDON",
              ),
            },
            text: `Dossiers de faisabilité recevables ${getCounterText("DOSSIER_FAISABILITE_RECEVABLE_HORS_ABANDON")}`,
            isActive: isActive("DOSSIER_FAISABILITE_RECEVABLE_HORS_ABANDON"),
          },
          {
            linkProps: {
              href: hrefSideMenu(
                cohorteId,
                "DOSSIER_DE_VALIDATION_ENVOYE_HORS_ABANDON",
              ),
            },
            text: `Dossiers de validation envoyés ${getCounterText("DOSSIER_DE_VALIDATION_ENVOYE_HORS_ABANDON")}`,
            isActive: isActive("DOSSIER_DE_VALIDATION_ENVOYE_HORS_ABANDON"),
          },
          {
            linkProps: {
              href: hrefSideMenu(
                cohorteId,
                "DOSSIER_DE_VALIDATION_SIGNALE_HORS_ABANDON",
              ),
            },
            text: `Dossiers de validation signalés ${getCounterText("DOSSIER_DE_VALIDATION_SIGNALE_HORS_ABANDON")}`,
            isActive: isActive("DOSSIER_DE_VALIDATION_SIGNALE_HORS_ABANDON"),
          },
        ],
      },
      {
        text: `Candidatures en jury ${getCounterText("JURY_HORS_ABANDON")}`,
        linkProps: {
          href: hrefSideMenu(cohorteId, "JURY_HORS_ABANDON"),
        },
        items: [
          {
            linkProps: {
              href: hrefSideMenu(cohorteId, "JURY_PROGRAMME_HORS_ABANDON"),
            },
            text: `Jurys programmés ${getCounterText("JURY_PROGRAMME_HORS_ABANDON")}`,
            isActive: isActive("JURY_PROGRAMME_HORS_ABANDON"),
          },
          {
            linkProps: {
              href: hrefSideMenu(cohorteId, "JURY_PASSE_HORS_ABANDON"),
            },
            text: `Résultats renseignés ${getCounterText("JURY_PASSE_HORS_ABANDON")}`,
            isActive: isActive("JURY_PASSE_HORS_ABANDON"),
          },
        ],
        isActive: isActive("JURY_HORS_ABANDON"),
      },

      {
        text: `Candidatures non recevables ${getCounterText("DOSSIER_FAISABILITE_NON_RECEVABLE_HORS_ABANDON")}`,
        linkProps: {
          href: hrefSideMenu(
            cohorteId,
            "DOSSIER_FAISABILITE_NON_RECEVABLE_HORS_ABANDON",
          ),
        },
        isActive: isActive("DOSSIER_FAISABILITE_NON_RECEVABLE_HORS_ABANDON"),
      },
      {
        text: `Candidatures abandonnées ${getCounterText("ABANDON")}`,
        linkProps: {
          href: hrefSideMenu(cohorteId, "ABANDON"),
        },
        isActive: isActive("ABANDON"),
      },
      {
        text: `Candidatures réorientées ${getCounterText("REORIENTEE")}`,
        linkProps: {
          href: hrefSideMenu(cohorteId, "REORIENTEE"),
        },
        isActive: isActive("REORIENTEE"),
      },
      {
        text: `Candidatures supprimées ${getCounterText("ARCHIVE_HORS_ABANDON_HORS_REORIENTATION")}`,
        linkProps: {
          href: hrefSideMenu(
            cohorteId,
            "ARCHIVE_HORS_ABANDON_HORS_REORIENTATION",
          ),
        },
        isActive: isActive("ARCHIVE_HORS_ABANDON_HORS_REORIENTATION"),
      },
      {
        text: `Demandes de financement envoyées ${getCounterText("DEMANDE_FINANCEMENT_ENVOYEE")}`,
        linkProps: {
          href: hrefSideMenu(cohorteId, "DEMANDE_FINANCEMENT_ENVOYEE"),
        },
        isActive: isActive("DEMANDE_FINANCEMENT_ENVOYEE"),
      },
      {
        text: `Demandes de paiement envoyées ${getCounterText("DEMANDE_PAIEMENT_ENVOYEE")}`,
        linkProps: {
          href: hrefSideMenu(cohorteId, "DEMANDE_PAIEMENT_ENVOYEE"),
        },
        isActive: isActive("DEMANDE_PAIEMENT_ENVOYEE"),
      },
      {
        text: `Demandes de paiement à envoyer ${getCounterText("DEMANDE_PAIEMENT_A_ENVOYER")}`,
        linkProps: {
          href: hrefSideMenu(cohorteId, "DEMANDE_PAIEMENT_A_ENVOYER"),
        },
        isActive: isActive("DEMANDE_PAIEMENT_A_ENVOYER"),
      },
    ];
  };

  return (
    <nav
      role="navigation"
      aria-label="Menu latéral"
      className="flex flex-col gap-4 md:w-[320px]"
    >
      <SideMenu
        className="flex-shrink-0 flex-grow-0 md:basis-[400px]"
        align="left"
        burgerMenuButtonText="Candidatures"
        items={cohortes.map((cohorte) => {
          const isActive = cohorte.id === cohorteIdFilter;
          return {
            text: cohorte.nom,
            linkProps: {
              href: isActive
                ? "/vae-collectives"
                : hrefSideMenu(cohorte.id, "ACTIVE_HORS_ABANDON"),
            },
            items: getCohorteItems(cohorte.id),
            expandedByDefault: isActive,
          };
        })}
      />
    </nav>
  );
};
