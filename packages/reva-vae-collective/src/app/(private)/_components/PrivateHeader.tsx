import { hasPermission, isUserInRole } from "@/components/auth/actions";
import { getActiveFeatures } from "@/helpers/get-actives-features";

import { PrivateHeaderClient } from "./PrivateHeaderClient";

export async function PrivateHeader() {
  const { isFeatureActive } = await getActiveFeatures();

  const isSousCompteVaeCollective = await isUserInRole(
    "sous_compte_vae_collective",
  );

  const isMetabaseDashboardActive = isFeatureActive(
    "SHOW_METABASE_DASHBOARD_VAE_COLLECTIVE",
  );

  const isVaeCollectiveAccountsFeatureActive = isFeatureActive(
    "VAE_COLLECTIVE_ACCOUNTS",
  );

  // Comme getActiveFeatures, on tolère l'échec de cet appel : le header est rendu
  // sur toutes les pages privées, pas seulement celles d'un commanditaire.
  let canViewCommanditaireStatistiques = false;
  try {
    canViewCommanditaireStatistiques = await hasPermission({
      permission: "VOIR_STATISTIQUES_COMMANDITAIRE",
    });
  } catch (error) {
    console.error("Failed to fetch user permissions:", error);
  }

  let canViewSousCompteStatistiques = false;
  try {
    canViewSousCompteStatistiques = await hasPermission({
      permission: "VOIR_STATISTIQUES_SOUS_COMPTE",
    });
  } catch (error) {
    console.error("Failed to fetch user permissions:", error);
  }

  const showCommanditaireDashboard =
    isMetabaseDashboardActive && canViewCommanditaireStatistiques;
  const showSousCompteDashboard =
    isMetabaseDashboardActive && canViewSousCompteStatistiques;

  // Comme getActiveFeatures, on tolère l'échec de cet appel : le header est rendu
  // sur toutes les pages privées, pas seulement celles d'un commanditaire.
  let canAccessAccountsPage = false;
  try {
    canAccessAccountsPage = await hasPermission({
      permission: "VOIR_LISTE_SOUS_COMPTES",
    });
  } catch (error) {
    console.error("Failed to fetch user permissions:", error);
  }

  const showAccountsPage =
    isVaeCollectiveAccountsFeatureActive && canAccessAccountsPage;

  const showParametersPage = isSousCompteVaeCollective;

  return (
    <PrivateHeaderClient
      showCommanditaireDashboard={showCommanditaireDashboard}
      showSousCompteDashboard={showSousCompteDashboard}
      showAccountsPage={showAccountsPage}
      showParametersPage={showParametersPage}
    />
  );
}
