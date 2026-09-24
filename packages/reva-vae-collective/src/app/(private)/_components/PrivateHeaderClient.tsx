"use client";
import { Header as DsfrHeader } from "@codegouvfr/react-dsfr/Header";
import { useParams, usePathname } from "next/navigation";
import { ComponentProps } from "react";

import { useKeycloakContext } from "@/components/auth/keycloakContext";

const PATHS = {
  COHORTES: "/cohortes",
  DASHBOARD: "/dashboard",
  ACCOUNTS: "/comptes-utilisateur",
  PARAMETERS: "/parametres",
} as const;

const LABELS = {
  COHORTES: "Cohortes",
  DASHBOARD: "Pilotage",
  ACCOUNTS: "Gestion des comptes",
  PARAMETERS: "Paramètres",
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

export const PrivateHeaderClient = ({
  showMetabaseDashboard,
  showAccountsPage,
  showParametersPage,
}: {
  showMetabaseDashboard: boolean;
  showAccountsPage: boolean;
  showParametersPage: boolean;
}) => {
  const { logout, authenticated } = useKeycloakContext();

  const currentPathname = usePathname();
  const { commanditaireId } = useParams();
  const isCommanditairePath = currentPathname.startsWith(
    `/commanditaires/${commanditaireId}`,
  );

  const showTabs =
    authenticated &&
    (showMetabaseDashboard || showAccountsPage || showParametersPage) &&
    isCommanditairePath;

  const navigation = showTabs
    ? [
        createTab({
          text: LABELS.COHORTES,
          href: `/commanditaires/${commanditaireId}${PATHS.COHORTES}`,
          isActive: currentPathname.includes(PATHS.COHORTES),
        }),
        ...(showMetabaseDashboard
          ? [
              createTab({
                text: LABELS.DASHBOARD,
                href: `/commanditaires/${commanditaireId}${PATHS.DASHBOARD}`,
                isActive: currentPathname.includes(PATHS.DASHBOARD),
              }),
            ]
          : []),
        ...(showAccountsPage
          ? [
              createTab({
                text: LABELS.ACCOUNTS,
                href: `/commanditaires/${commanditaireId}${PATHS.ACCOUNTS}`,
                isActive: currentPathname.includes(PATHS.ACCOUNTS),
              }),
            ]
          : []),
        ...(showParametersPage
          ? [
              createTab({
                text: LABELS.PARAMETERS,
                href: `/commanditaires/${commanditaireId}${PATHS.PARAMETERS}`,
                isActive: currentPathname.includes(PATHS.PARAMETERS),
              }),
            ]
          : []),
      ]
    : [];

  type QuickAccessItem = NonNullable<
    ComponentProps<typeof DsfrHeader>["quickAccessItems"]
  >[number];

  return (
    <DsfrHeader
      brandTop={
        <>
          République
          <br />
          française
        </>
      }
      homeLinkProps={{
        href: "/../",
        title: "Accueil - France VAE",
      }}
      operatorLogo={{
        alt: "France VAE",
        imgUrl: "/vae-collective/images/fvae_logo.svg",
        orientation: "horizontal",
      }}
      quickAccessItems={
        authenticated
          ? ([
              {
                linkProps: {
                  href: "https://francevae.notion.site/Espace-documentaire-2ea100b69ece81bcae20e21a88ef496d",
                  title: "Espace documentaire - France VAE",
                },
                text: "Espace documentaire",
              },
              {
                buttonProps: {
                  onClick: () => logout(),
                  className: "!text-sm !px-3 !py-1 !mb-4 !mx-1",
                },
                text: (
                  <span>
                    Se déconnecter
                    <span className="ml-1.5 ri-logout-box-r-line fr-icon--sm" />
                  </span>
                ),
              },
            ] as QuickAccessItem[])
          : []
      }
      classes={{ operator: "min-w-[128px] min-h-[72px]" }}
      navigation={navigation}
    />
  );
};
