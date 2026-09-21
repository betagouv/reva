declare type KeyCloakUserRole =
  | "admin"
  | "manage_candidacy"
  | "manage_feasibility"
  | "gestion_maison_mere_aap"
  | "manage_certification_authority_local_account"
  | "manage_certification_registry"
  | "manage_vae_collective"
  | "candidate"
  | "sous_compte_vae_collective";

declare type KeyCloakGroup =
  | "admin"
  | "organism"
  | "certification_authority"
  | "gestionnaire_maison_mere_aap"
  | "certification_authority_local_account"
  | "certification_registry_manager"
  | "commanditaire_vae_collective"
  | "sous_compte_vae_collective";
