import { jwtDecode } from "jwt-decode";

import { useKeycloakContext } from "@/components/auth/keycloakContext";

import { UserRole } from "./types";

export const useAuth = () => {
  const { accessToken } = useKeycloakContext();

  let isAdmin,
    isVAECollectiveManager,
    isSousCompteVaeCollective = false;

  let roles: UserRole[] = [];

  if (accessToken) {
    const decodedToken = jwtDecode<{
      resource_access?: { "reva-vae-collective"?: { roles: string[] } };
    }>(accessToken);

    roles = (decodedToken?.resource_access?.["reva-vae-collective"]?.roles ||
      []) as UserRole[];
    isAdmin = roles.includes("admin");
    isVAECollectiveManager = roles.includes("manage_vae_collective");
    isSousCompteVaeCollective = roles.includes("sous_compte_vae_collective");
  }

  return {
    roles,
    isAdmin,
    isVAECollectiveManager,
    isSousCompteVaeCollective,
  };
};
