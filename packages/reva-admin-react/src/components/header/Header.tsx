"use client";
import { Header as DsfrHeader } from "@codegouvfr/react-dsfr/Header";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/auth";
import { useKeycloakContext } from "@/components/auth/keycloakContext";
import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { WEBSITE_BASE_URL } from "@/config/config";

import { graphql } from "@/graphql/generated";

import { useFeatureflipping } from "../feature-flipping/featureFlipping";

const getCertificationAuthorityForHeaderQuery = graphql(`
  query getCertificationAuthorityForHeader {
    account_getAccountForConnectedUser {
      certificationAuthority {
        id
        metabaseDashboardIframeUrl
      }
    }
  }
`);

const getCertificationAuthorityLocalAccountForHeaderQuery = graphql(`
  query getCertificationAuthorityLocalAccountForHeader {
    account_getAccountForConnectedUser {
      certificationAuthorityLocalAccount {
        certificationAuthority {
          id
        }
      }
    }
  }
`);

const getCertificationAuthorityStructureForHeaderQuery = graphql(`
  query getCertificationAuthorityStructureForHeader {
    account_getAccountForConnectedUser {
      certificationRegistryManager {
        id
        certificationAuthorityStructure {
          id
          metabaseDashboardIframeUrlForRegistryManager
        }
      }
    }
  }
`);

const getCohortesVaeCollectivesForConnectedAapQuery = graphql(`
  query getCohortesVaeCollectivesForConnectedAapForHeaderComponent {
    cohortesVaeCollectivesForConnectedAap {
      id
    }
  }
`);

const PATHS = {
  AAP_HELP: "/help",
  AGENCIES_SETTINGS: "/agencies-settings-v3",
  CANDIDACIES: "/candidacies",
  CERTIFICATEUR_HELP: "/certification-authorities/help",
  CERTIFICATION_AUTHORITIES_SETTINGS: (id: string) =>
    `/certification-authorities/${id}/settings`,
  CERTIFICATION_AUTHORITIES_SETTINGS_LOCAL: (id: string) =>
    `/certification-authorities/${id}/settings/local-account`,
  CERTIFICATION_AUTHORITY_STRUCTURES: "/certification-authority-structures",
  CERTIFICATIONS: "/certifications",
  MAISON_MERE_AAP: "/maison-mere-aap",
  PORTEURS_DE_PROJET_VAE_COLLECTIVE: "/porteurs-de-projet-vae-collective",
  RESPONSABLE_CERTIFICATIONS: "/responsable-certifications/certifications",
  STATISTIQUES: "/dashboard",
  STATISTIQUES_AAP: "/dashboard-aap",
  SUBSCRIPTIONS: "/subscriptions/pending",
  VAE_COLLECTIVES: "/vae-collectives",
  CERTIFICATEUR_CANDIDACIES_ANNUAIRE: "/candidacies/annuaire",
} as const;

const LABELS = {
  AAP: "AAP",
  ADMIN_CERTIFICATION_AUTHORITY_CANDIDACIES: "Certificateurs / Candidatures",
  ANNUAIRES: "Annuaires",
  CANDIDACIES: "Candidatures",
  CERTIFICATION_AUTHORITY: "Certificateur",
  CERTIFICATIONS: "Certifications",
  GESTION_CERTIFICATIONS: "Gestion des certifications",
  HELP: "Aide",
  HELP_PAGES: "Pages d'aide",
  PARAMETRES: "Paramètres",
  PORTEURS_DE_PROJET_VAE_COLLECTIVE: "Porteurs de projet VAE collective",
  STATISTIQUES: "Statistiques",
  STRUCTURES_ACCOMPAGNATRICES: "Structures accompagnatrices",
  STRUCTURES_CERTIFICATRICES: "Structures certificatrices",
  VAE_COLLECTIVES: "VAE collectives",
  VERIFICATIONS: "Vérifications",
} as const;

const createTab = ({
  text,
  href,
  isActive,
  additionalProps = {},
}: {
  text: string;
  href: string;
  isActive: boolean;
  additionalProps?: Record<string, unknown>;
}) => ({
  text,
  linkProps: { href, target: "_self", ...additionalProps },
  isActive,
});

const isAAPCandidaciesPath = (pathname: string) => {
  const exclusionPattern =
    /\/candidacies\/(?!(annuaire|.*\/candidacy-drop-out)\/).*/;
  const subPathPattern =
    /\/candidacies\/.*\/(feasibility\/)|(dossier-de-validation\/)|(jury\/)|(transfer.*\/)|(candidacy-drop-out\/)|(logs-certificateur\/)/;

  return !!pathname.match(exclusionPattern) && !pathname.match(subPathPattern);
};

const isAAPVaeCollectivesPath = (pathname: string) =>
  !!pathname.match(/^\/vae-collectives/);

const isCertificationAuthorityCandidaciesPath = (pathname: string) => {
  const mainPattern = /\/candidacies\/annuaire/;
  const subPathPattern =
    /\/candidacies\/.*\/(feasibility\/)|(dossier-de-validation\/)|(jury\/)|(transfer.*\/)|(candidacy-drop-out\/)|(logs-certificateur\/)/;

  return !!(pathname.match(mainPattern) || pathname.match(subPathPattern));
};

const getNavigationTabs = ({
  currentPathname,
  isAdmin,
  isOrganism,
  isGestionnaireMaisonMereAAP,
  isCertificationAuthorityLocalAccount,
  isCertificationRegistryManager,
  isAdminCertificationAuthority,
  metabaseDashboardIframeUrl,
  metabaseDashboardIframeUrlForRegistryManager,
  shouldShowAapMetabaseDashboard,
  showAAPVaeCollectivesTab,
  certificationAuthorityId,
}: {
  currentPathname: string;
  isAdmin: boolean;
  isOrganism: boolean;
  isGestionnaireMaisonMereAAP: boolean;
  isCertificationAuthorityLocalAccount: boolean;
  isCertificationRegistryManager: boolean;
  isAdminCertificationAuthority: boolean;
  metabaseDashboardIframeUrl?: string | null;
  metabaseDashboardIframeUrlForRegistryManager?: string | null;
  shouldShowAapMetabaseDashboard?: boolean;
  showAAPVaeCollectivesTab: boolean;
  certificationAuthorityId?: string;
}) => {
  const certificateurCandidaciesPath = PATHS.CERTIFICATEUR_CANDIDACIES_ANNUAIRE;
  const adminTabs = [
    createTab({
      text: LABELS.CANDIDACIES,
      href: PATHS.CANDIDACIES,
      isActive: isAAPCandidaciesPath(currentPathname),
    }),
    createTab({
      text: LABELS.CERTIFICATIONS,
      href: PATHS.CERTIFICATIONS,
      isActive: currentPathname.startsWith(PATHS.CERTIFICATIONS),
    }),
    createTab({
      text: LABELS.VERIFICATIONS,
      href: PATHS.SUBSCRIPTIONS,
      isActive: currentPathname.startsWith(PATHS.SUBSCRIPTIONS),
    }),
    {
      text: LABELS.ANNUAIRES,
      isActive: [
        PATHS.MAISON_MERE_AAP,
        PATHS.CERTIFICATION_AUTHORITY_STRUCTURES,
      ].some((path) => currentPathname.startsWith(path)),
      menuLinks: [
        createTab({
          text: LABELS.STRUCTURES_ACCOMPAGNATRICES,
          href: PATHS.MAISON_MERE_AAP,
          isActive: currentPathname.startsWith(PATHS.MAISON_MERE_AAP),
          additionalProps: { "data-testid": "maison-mere-aap-link" },
        }),
        createTab({
          text: LABELS.STRUCTURES_CERTIFICATRICES,
          href: PATHS.CERTIFICATION_AUTHORITY_STRUCTURES,
          isActive: currentPathname.startsWith(
            PATHS.CERTIFICATION_AUTHORITY_STRUCTURES,
          ),
        }),
        createTab({
          text: LABELS.PORTEURS_DE_PROJET_VAE_COLLECTIVE,
          href: PATHS.PORTEURS_DE_PROJET_VAE_COLLECTIVE,
          isActive: currentPathname.startsWith(
            PATHS.PORTEURS_DE_PROJET_VAE_COLLECTIVE,
          ),
        }),
      ],
    },
    createTab({
      text: LABELS.ADMIN_CERTIFICATION_AUTHORITY_CANDIDACIES,
      href: certificateurCandidaciesPath,
      isActive: isCertificationAuthorityCandidaciesPath(currentPathname),
    }),
    {
      text: LABELS.HELP_PAGES,
      menuLinks: [
        createTab({
          text: LABELS.AAP,
          href: PATHS.AAP_HELP,
          isActive: currentPathname.startsWith(PATHS.AAP_HELP),
        }),
        createTab({
          text: LABELS.CERTIFICATION_AUTHORITY,
          href: PATHS.CERTIFICATEUR_HELP,
          isActive: currentPathname.startsWith(PATHS.CERTIFICATEUR_HELP),
        }),
      ],
    },
  ];

  const aapTabs = [
    createTab({
      text: LABELS.CANDIDACIES,
      href: PATHS.CANDIDACIES,
      isActive: isAAPCandidaciesPath(currentPathname),
    }),
    ...(showAAPVaeCollectivesTab
      ? [
          createTab({
            text: LABELS.VAE_COLLECTIVES,
            href: PATHS.VAE_COLLECTIVES,
            isActive: isAAPVaeCollectivesPath(currentPathname),
          }),
        ]
      : []),
    createTab({
      text: LABELS.PARAMETRES,
      href: PATHS.AGENCIES_SETTINGS,
      isActive: currentPathname.startsWith("/agencies-settings"),
    }),
    createTab({
      text: LABELS.HELP,
      href: PATHS.AAP_HELP,
      isActive: currentPathname.startsWith(PATHS.AAP_HELP),
    }),
    ...(shouldShowAapMetabaseDashboard && isGestionnaireMaisonMereAAP
      ? [
          createTab({
            text: LABELS.STATISTIQUES,
            href: PATHS.STATISTIQUES_AAP,
            isActive: currentPathname.startsWith(PATHS.STATISTIQUES_AAP),
          }),
        ]
      : []),
  ];

  const registryManagerTabs = [
    createTab({
      text: LABELS.GESTION_CERTIFICATIONS,
      href: PATHS.RESPONSABLE_CERTIFICATIONS,
      isActive: currentPathname.startsWith(PATHS.RESPONSABLE_CERTIFICATIONS),
    }),
    createTab({
      text: LABELS.HELP,
      href: PATHS.CERTIFICATEUR_HELP,
      isActive: currentPathname.startsWith(PATHS.CERTIFICATEUR_HELP),
    }),
    ...(metabaseDashboardIframeUrlForRegistryManager
      ? [
          createTab({
            text: LABELS.STATISTIQUES,
            href: PATHS.STATISTIQUES,
            isActive: currentPathname.startsWith(PATHS.STATISTIQUES),
          }),
        ]
      : []),
  ];

  const certificationAuthorityAdminTabs = [
    createTab({
      text: LABELS.CANDIDACIES,
      href: certificateurCandidaciesPath,
      isActive: isCertificationAuthorityCandidaciesPath(currentPathname),
    }),
    createTab({
      text: LABELS.PARAMETRES,
      href: PATHS.CERTIFICATION_AUTHORITIES_SETTINGS(
        certificationAuthorityId ?? "",
      ),
      isActive: currentPathname.includes("/settings"),
    }),
    createTab({
      text: LABELS.HELP,
      href: PATHS.CERTIFICATEUR_HELP,
      isActive: currentPathname.startsWith(PATHS.CERTIFICATEUR_HELP),
    }),
    ...(metabaseDashboardIframeUrl
      ? [
          createTab({
            text: LABELS.STATISTIQUES,
            href: PATHS.STATISTIQUES,
            isActive: currentPathname.startsWith(PATHS.STATISTIQUES),
          }),
        ]
      : []),
  ];

  const certificationAuthorityLocalAccountTabs = [
    createTab({
      text: LABELS.CANDIDACIES,
      href: certificateurCandidaciesPath,
      isActive: isCertificationAuthorityCandidaciesPath(currentPathname),
    }),
    createTab({
      text: LABELS.PARAMETRES,
      href: PATHS.CERTIFICATION_AUTHORITIES_SETTINGS_LOCAL(
        certificationAuthorityId ?? "",
      ),
      isActive: currentPathname.includes("/settings"),
    }),
    createTab({
      text: LABELS.HELP,
      href: PATHS.CERTIFICATEUR_HELP,
      isActive: currentPathname.startsWith(PATHS.CERTIFICATEUR_HELP),
    }),
  ];

  switch (true) {
    case isAdmin:
      return adminTabs;
    case isGestionnaireMaisonMereAAP:
    case isOrganism:
      return aapTabs;
    case isCertificationAuthorityLocalAccount:
      return certificationAuthorityLocalAccountTabs;
    case isCertificationRegistryManager:
      return registryManagerTabs;
    case isAdminCertificationAuthority:
      return certificationAuthorityAdminTabs;
    default:
      return [];
  }
};

export const Header = () => {
  const currentPathname = usePathname();
  const {
    isAdmin,
    isOrganism,
    isGestionnaireMaisonMereAAP,
    isAdminCertificationAuthority,
    isCertificationRegistryManager,
    isCertificationAuthorityLocalAccount,
  } = useAuth();
  const { logout } = useKeycloakContext();

  const { isFeatureActive } = useFeatureflipping();

  const shouldShowAapMetabaseDashboard = isFeatureActive(
    "SHOW_METABASE_DASHBOARD_AAP",
  );

  const { graphqlClient } = useGraphQlClient();

  const { data: getCertificationAuthorityForHeader } = useQuery({
    queryKey: ["certificateur", "getCertificationAuthorityForHeader"],
    queryFn: () =>
      graphqlClient.request(getCertificationAuthorityForHeaderQuery),
    enabled: isAdminCertificationAuthority && !isAdmin,
  });

  const { data: getCertificationAuthorityLocalAccountForHeader } = useQuery({
    queryKey: [
      "certificateur",
      "getCertificationAuthorityLocalAccountForHeader",
    ],
    queryFn: () =>
      graphqlClient.request(
        getCertificationAuthorityLocalAccountForHeaderQuery,
      ),
    enabled: isCertificationAuthorityLocalAccount && !isAdmin,
  });

  const { data: getCertificationAuthorityStructureForHeader } = useQuery({
    queryKey: ["certificateur", "getCertificationAuthorityStructureForHeader"],
    queryFn: () =>
      graphqlClient.request(getCertificationAuthorityStructureForHeaderQuery),
    enabled: isCertificationRegistryManager && !isAdmin,
  });

  const metabaseDashboardIframeUrlForRegistryManager =
    getCertificationAuthorityStructureForHeader
      ?.account_getAccountForConnectedUser?.certificationRegistryManager
      ?.certificationAuthorityStructure
      ?.metabaseDashboardIframeUrlForRegistryManager;

  const metabaseDashboardIframeUrl =
    getCertificationAuthorityForHeader?.account_getAccountForConnectedUser
      ?.certificationAuthority?.metabaseDashboardIframeUrl;

  const certificationAuthorityId =
    getCertificationAuthorityForHeader?.account_getAccountForConnectedUser
      ?.certificationAuthority?.id ??
    getCertificationAuthorityLocalAccountForHeader
      ?.account_getAccountForConnectedUser?.certificationAuthorityLocalAccount
      ?.certificationAuthority?.id;

  const { data: getCohortesVaeCollectivesForConnectedAap } = useQuery({
    queryKey: ["aap", "getCohortesVaeCollectivesForConnectedAap"],
    queryFn: () =>
      graphqlClient.request(getCohortesVaeCollectivesForConnectedAapQuery),
    enabled: isOrganism && !isAdmin,
  });

  const showAAPVaeCollectivesTab =
    isOrganism &&
    !isAdmin &&
    !!getCohortesVaeCollectivesForConnectedAap
      ?.cohortesVaeCollectivesForConnectedAap?.length;

  const navigation = getNavigationTabs({
    currentPathname,
    isAdmin,
    isOrganism,
    isGestionnaireMaisonMereAAP,
    isCertificationAuthorityLocalAccount,
    isCertificationRegistryManager,
    isAdminCertificationAuthority,
    metabaseDashboardIframeUrl,
    metabaseDashboardIframeUrlForRegistryManager,
    shouldShowAapMetabaseDashboard,
    showAAPVaeCollectivesTab,
    certificationAuthorityId,
  });

  return (
    <DsfrHeader
      brandTop={
        <>
          république
          <br />
          française
        </>
      }
      homeLinkProps={{
        href: WEBSITE_BASE_URL,
        title: "Accueil - France VAE",
      }}
      operatorLogo={{
        alt: "France VAE",
        imgUrl: "/admin2/fvae_logo.svg",
        orientation: "horizontal",
      }}
      classes={{ operator: "min-w-[128px] min-h-[72px]" }}
      quickAccessItems={[
        {
          buttonProps: {
            onClick: () => logout(),
            className: "!text-sm !px-3 !py-1 !mb-4 !mx-1",
          },
          iconId: "ri-logout-box-r-line",
          text: "Se déconnecter",
        },
      ]}
      navigation={navigation}
      serviceTitle={
        isCertificationRegistryManager
          ? "Espace Responsable des certifications"
          : "Le service public de la VAE"
      }
      serviceTagline="Espace professionnel de la VAE"
    />
  );
};
