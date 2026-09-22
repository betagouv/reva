import { hasPermission } from "@/components/auth/actions";
import { getActiveFeatures } from "@/helpers/get-actives-features";

import { PrivateHeaderClient } from "./PrivateHeaderClient";

export async function PrivateHeader() {
  const { isFeatureActive } = await getActiveFeatures();
  const isMetabaseDashboardActive = isFeatureActive(
    "SHOW_METABASE_DASHBOARD_VAE_COLLECTIVE",
  );

  const isVaeCollectiveAccountsFeatureActive = isFeatureActive(
    "VAE_COLLECTIVE_ACCOUNTS",
  );

  // Comme getActiveFeatures, on tolère l'échec de cet appel : le header est rendu
  // sur toutes les pages privées, pas seulement celles d'un commanditaire.
  let canViewStatistiques = false;
  try {
    canViewStatistiques = await hasPermission({
      permission: "VOIR_STATISTIQUES",
    });
  } catch (error) {
    console.error("Failed to fetch user permissions:", error);
  }

  const showMetabaseDashboard =
    isMetabaseDashboardActive && canViewStatistiques;

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

  return (
    <PrivateHeaderClient
      showMetabaseDashboard={showMetabaseDashboard}
      showAccountsPage={showAccountsPage}
    />
  );
}
