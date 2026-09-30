import { hasRole, whenHasRole } from "@/modules/shared/security/middlewares";
import { whenHasRoleButNotOthers } from "@/modules/shared/security/middlewares/whenHasRoleButNotOthers";

import { isOwnerOfAccount } from "../../account/security/isOwnerOfAccount.security";

import { isGestionnaireOfMaisonMereAAP } from "./isGestionnaireOfMaisonMereAAP.security";
import { isGestionnaireOfMaisonMereAAPOfOrganismByDataArg } from "./isGestionnaireOfMaisonMereAAPOfOrganismByDataArg";
import { isGestionnaireOfMaisonMereAAPOfOrganismByIdArg } from "./isGestionnaireOfMaisonMereAAPOfOrganismByIdArg";
import { isOwnerOfOrganism } from "./isOwnerOfOrganism";
import { isOwnerOfOrganismByDataArg } from "./isOwnerOfOrganismByDataArg";
import { isOwnerOfOrganismByIdArg } from "./isOwnerOfOrganismByIdArg";

// Règles d'accès composées propres au module organism. Un seul consommateur
// (`organism.resolvers.ts`) : elles ne sont pas promues dans `shared/presets`.

export const isAdminOrGestionnaireOfMaisonMereAAP = [
  hasRole(["admin", "gestion_maison_mere_aap"]),
  whenHasRole("gestion_maison_mere_aap", isGestionnaireOfMaisonMereAAP),
];

export const isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganism = [
  hasRole(["admin", "gestion_maison_mere_aap", "manage_candidacy"]),
  whenHasRole("gestion_maison_mere_aap", isGestionnaireOfMaisonMereAAP),
  whenHasRoleButNotOthers(
    "manage_candidacy",
    ["admin", "gestion_maison_mere_aap"],
    isOwnerOfOrganism,
  ),
];

export const isAdminOrGestionnaireOrSousCompteOfCommanditaireVaeCollective = [
  hasRole(["admin", "manage_vae_collective", "sous_compte_vae_collective"]),
];

// Pour `organism_getOrganism(id:)`. Reproduit les branches de l'inline qu'il remplace : l'admin
// passe ; le gestionnaire doit l'être de la maison mère de l'organisme ; un `manage_candidacy`
// qui n'est ni admin ni gestionnaire doit être rattaché à l'organisme ; tout autre rôle est
// refusé.
export const isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganismByIdArg =
  [
    hasRole(["admin", "gestion_maison_mere_aap", "manage_candidacy"]),
    whenHasRole(
      "gestion_maison_mere_aap",
      isGestionnaireOfMaisonMereAAPOfOrganismByIdArg,
    ),
    whenHasRoleButNotOthers(
      "manage_candidacy",
      ["admin", "gestion_maison_mere_aap"],
      isOwnerOfOrganismByIdArg,
    ),
  ];

// Pour les mutations recevant `data: { organismId }` (ex. `organism_updateOrganismDegreesAndFormacodes`) :
// `isGestionnaireOfMaisonMereAAP` y chercherait un `maisonMereAAPId` absent et refuserait le
// gestionnaire, on résout donc la maison mère à partir de l'organisme ciblé.
export const isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganismByDataArg =
  [
    hasRole(["admin", "gestion_maison_mere_aap", "manage_candidacy"]),
    whenHasRole(
      "gestion_maison_mere_aap",
      isGestionnaireOfMaisonMereAAPOfOrganismByDataArg,
    ),
    whenHasRoleButNotOthers(
      "manage_candidacy",
      ["admin", "gestion_maison_mere_aap"],
      isOwnerOfOrganismByDataArg,
    ),
  ];

export const isAdminOrGestionnaireOfMaisonMereAAPOrOwnerOfAccount = [
  hasRole(["admin", "gestion_maison_mere_aap", "manage_candidacy"]),
  whenHasRole("gestion_maison_mere_aap", isGestionnaireOfMaisonMereAAP),
  whenHasRoleButNotOthers(
    "manage_candidacy",
    ["admin", "gestion_maison_mere_aap"],
    isOwnerOfAccount,
  ),
];
