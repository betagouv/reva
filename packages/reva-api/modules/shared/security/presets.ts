import { accessBy, ALLOW } from "./accessBy";
import {
  allowed,
  hasNotRole,
  hasRole,
  isCandidacyOwner,
  whenHasRole,
  whenHasRoleButNotOthers,
} from "./middlewares";
import { getIsCertificationAuthorityAccountOrLocalAccountStructureMember } from "./middlewares/getIsCertificationAuthorityAccountOrLocalAccountStructureMember.security";
import { getIsCertificationAuthorityStructureMember } from "./middlewares/getIsCertificationAuthorityStructureMember.security";
import { getIsCertificationAuthorityStructureRegistryManagerMember } from "./middlewares/getIsCertificationAuthorityStructureRegistryManagerMember.security";
import { isAppointmentOfCandidacy } from "./middlewares/isAppointmentOfCandidacy";
import { isCandidateOwnerOfCandidacy } from "./middlewares/isCandidateOwnerOfCandidacy.security";
import { isCertificationAuthorityLocalAccountManager } from "./middlewares/isCertificationAuthorityLocalAccountManager";
import { isCertificationAuthorityLocalAccountOwner } from "./middlewares/isCertificationAuthorityLocalAccountOwner";
import { isCertificationAuthorityOwner } from "./middlewares/isCertificationAuthorityOwner";
import { isCertificationRegistryManagerOfCertification } from "./middlewares/isCertificationRegistryManagerOfCertification.security";
import { isExperienceOfCandidacy } from "./middlewares/isExperienceOfCandidacy";
import { isFeasibilityManager } from "./middlewares/isFeasibilityManager";
import { isGestionnaireOfCommanditaireVaeCollective } from "./middlewares/isGestionnaireOfCommanditaireVaeCollective";
import { isGestionnaireOrSousCompteOfCommanditaireVaeCollective } from "./middlewares/isGestionnaireOrSousCompteOfCommanditaireVaeCollective";
import { isUserOwnerOfCandidate } from "./middlewares/isUserOwnerOfCandidate";

export const isAdminOrManager = [hasRole(["admin", "manage_candidacy"])];

export const isAdminOrCandidacyCompanion = [
  hasRole(["admin", "manage_candidacy"]),
  whenHasRole("manage_candidacy", isCandidacyOwner),
];

export const isCandidacyCompanion = [
  hasNotRole(["admin"]),
  hasRole(["manage_candidacy"]),
  whenHasRole("manage_candidacy", isCandidacyOwner),
];

export const isAnyone = [allowed];

export const isAdmin = accessBy({ admin: ALLOW });
export const isAdminOrCertificationAuthorityLocalAccountOwner = [
  hasRole(["admin", "manage_certification_authority_local_account"]),
  whenHasRole(
    "manage_certification_authority_local_account",
    isCertificationAuthorityLocalAccountManager,
  ),
];

export const isAdminOrCertificationAuthorityOwner = [
  hasRole(["admin", "manage_certification_authority_local_account"]),
  whenHasRole(
    "manage_certification_authority_local_account",
    isCertificationAuthorityOwner,
  ),
];

export const isAdminOrCertificationAuthority = [
  hasRole(["admin", "manage_feasibility"]),
];

// Le certificateur ne décide que sur les candidatures de son périmètre (autorité de
// certification du dossier, ou compte local rattaché à la candidature).
export const isAdminOrFeasibilityManager = accessBy({
  admin: ALLOW,
  manage_feasibility: isFeasibilityManager,
});

export const isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate = [
  hasRole(["admin", "manage_candidacy", "manage_feasibility", "candidate"]),
  whenHasRole("manage_candidacy", isCandidacyOwner),
  whenHasRole("manage_feasibility", isFeasibilityManager),
  whenHasRole("candidate", isCandidateOwnerOfCandidacy),
];

export const isAdminOrOwnerOfCandidacy = [
  hasRole(["admin", "candidate"]),
  whenHasRole("candidate", isCandidateOwnerOfCandidacy),
];

export const isAdminOrOwnerOfCandidate = [
  hasRole(["admin", "candidate"]),
  whenHasRole("candidate", isUserOwnerOfCandidate),
];

export const isOwnerOrCanManageCandidacy = [
  hasRole(["admin", "manage_candidacy", "candidate"]),
  whenHasRole("manage_candidacy", isCandidacyOwner),
  whenHasRole("candidate", isCandidateOwnerOfCandidacy),
];

export const isOwnerOrCanManageAppointment = [
  hasRole(["admin", "manage_candidacy", "candidate"]),
  whenHasRole("manage_candidacy", isCandidacyOwner),
  whenHasRole("candidate", isCandidateOwnerOfCandidacy),
  isAppointmentOfCandidacy,
];

export const isAdminOrCanManageAppointment = [
  hasRole(["admin", "manage_candidacy"]),
  whenHasRole("manage_candidacy", isCandidacyOwner),
  isAppointmentOfCandidacy,
];

export const isOwnerOrCanManageExperienceOfCandidacy = [
  hasRole(["admin", "manage_candidacy", "candidate"]),
  whenHasRole("manage_candidacy", isCandidacyOwner),
  whenHasRole("candidate", isCandidateOwnerOfCandidacy),
  isExperienceOfCandidacy,
];

export const isAdminOrCertificationRegistryManagerOfCertification = [
  hasRole(["admin", "manage_certification_registry"]),
  whenHasRole(
    "manage_certification_registry",
    isCertificationRegistryManagerOfCertification,
  ),
];

export const isAdminOrCertificationRegistryManagerOfCertificationOrIsCertificationAuthorityStructureMember =
  [
    hasRole(["admin", "manage_feasibility", "manage_certification_registry"]),

    whenHasRole(
      "manage_feasibility",
      getIsCertificationAuthorityStructureMember,
    ),
    whenHasRole(
      "manage_certification_registry",
      isCertificationRegistryManagerOfCertification,
    ),
  ];

export const isAdminOrIsCertificationAuthorityAccountOrLocalAccountStructureMember =
  [
    hasRole(["admin", "manage_feasibility"]),
    whenHasRole(
      "manage_feasibility",
      getIsCertificationAuthorityAccountOrLocalAccountStructureMember,
    ),
  ];

export const isAdminOrIsCertificationAuthorityStructureRegistryManagerMember = [
  hasRole(["admin", "manage_certification_registry"]),
  whenHasRole(
    "manage_certification_registry",
    getIsCertificationAuthorityStructureRegistryManagerMember,
  ),
];

export const isAdminOrIsCertificationAuthorityStructureMember = [
  hasRole(["admin", "manage_feasibility", "manage_certification_registry"]),
  whenHasRole("manage_feasibility", getIsCertificationAuthorityStructureMember),
  whenHasRole(
    "manage_certification_registry",
    getIsCertificationAuthorityStructureMember,
  ),
];

export const isAdminOrGestionnaireOfCommanditaireVaeCollective = [
  hasRole(["admin", "manage_vae_collective"]),
  whenHasRole(
    "manage_vae_collective",
    isGestionnaireOfCommanditaireVaeCollective,
  ),
];

export const isAdminOrGestionnaireOrSousCompteOfCommanditaireVaeCollective = [
  hasRole(["admin", "manage_vae_collective", "sous_compte_vae_collective"]),
  whenHasRole(
    "manage_vae_collective",
    isGestionnaireOrSousCompteOfCommanditaireVaeCollective,
  ),
  whenHasRole(
    "sous_compte_vae_collective",
    isGestionnaireOrSousCompteOfCommanditaireVaeCollective,
  ),
];

export const isAdminOrCertificationAuthorityLocalAccountManagerOrCertificationAuthorityLocalAccountOwner =
  [
    hasRole([
      "admin",
      "manage_certification_authority_local_account",
      "manage_feasibility",
    ]),
    whenHasRole(
      "manage_certification_authority_local_account",
      isCertificationAuthorityLocalAccountManager,
    ),
    whenHasRoleButNotOthers(
      "manage_feasibility",
      ["manage_certification_authority_local_account"],
      isCertificationAuthorityLocalAccountOwner,
    ),
  ];

export const isRegistryManager = [hasRole(["manage_certification_registry"])];
