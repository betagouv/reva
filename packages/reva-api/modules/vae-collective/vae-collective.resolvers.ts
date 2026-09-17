import { RoleVaeCollective } from "@prisma/client";

import {
  isAdmin,
  isAdminOrGestionnaireOfCommanditaireVaeCollective,
  isAnyone,
} from "@/modules/shared/security/presets";
import { withPolicies } from "@/modules/shared/security/withPolicies";

import { getAccountById } from "../account/features/getAccount";
import { getOrganismById } from "../organism/features/getOrganism";
import { getCertificationById } from "../referential/features/getCertificationById";

import { canSousCompteCreateCohorteVaeCollective } from "./features/canSousCompteCreateCohorteVaeCollective";
import { createCohorteVaeCollective } from "./features/createCohorteVaeCollective";
import { createCommanditaireVaeCollective } from "./features/createCommanditaireVaeCollective";
import { createSousCompteVaeCollective } from "./features/createSousCompteVaeCollective";
import { deleteCohorteVAECollective } from "./features/deleteCohorteVAECollective";
import { getCertificationCohortesByCohorteId } from "./features/getCertificationCohortesByCohorteId";
import { getCohortesVaeCollectivesByCommanditaireVaeCollectiveId } from "./features/getCohortesVaeCollectivesByCommanditaireVaeCollectiveId";
import { getCohortesVaeCollectivesForConnectedAap } from "./features/getCohortesVaeCollectivesForConnectedAap";
import { getCohortesVaeCollectivesForConnectedCertificationAuthorityOrLocalAccount } from "./features/getCohortesVaeCollectivesForConnectedCertificationAuthorityOrLocalAccount";
import { getCohorteVAECollectiveByCodeInscription } from "./features/getCohorteVAECollectiveByCodeInscription";
import { getCohorteVAECollectiveById } from "./features/getCohorteVAECollectiveById";
import { getCommanditaireVaeCollectiveById } from "./features/getCommanditaireVaeCollectiveById";
import { getCommanditaireVaeCollectiveForAccountId } from "./features/getCommanditaireVaeCollectiveForAccountId";
import { getCommanditaireVaeCollectives } from "./features/getCommanditaireVaeCollectives";
import { getMetabaseDashboardIframeUrlVaeCollective } from "./features/getMetabaseDashboardIframeUrlVaeCollective";
import { getRolesSpecificToSousCompteAndCohorteVaeCollective } from "./features/getRolesSpecificToSousCompteAndCohorteVaeCollective";
import { getSousComptesByCommanditaireVaeCollectiveId } from "./features/getSousComptesByCommanditaireVaeCollectiveId";
import { getSousCompteVaeCollectiveById } from "./features/getSousCompteVaeCollectiveById";
import { getUserPermissions } from "./features/getUserPermissions";
import { publishCohorteVAECollective } from "./features/publishCohorteVAECollective";
import { updateCohorteVAECollectiveCertification } from "./features/updateCohorteVAECollectiveCertification";
import { updateCohorteVAECollectiveOrganism } from "./features/updateCohorteVAECollectiveOrganism";
import { updateNomCohorteVaeCollective } from "./features/updateNomCohorteVaeCollective";
import { updateRolesSpecificToCohorteOfSousCompteVaeCollective } from "./features/updateRolesSpecificToCohorteOfSousCompteVaeCollective";
import { updateSousCompteVaeCollective } from "./features/updateSousCompteVaeCollective";
import { hasVaeCollectivePermission } from "./security/hasVaeCollectivePermission";

const unsafeResolvers = {
  Account: {
    commanditaireVaeCollective: async ({ id: accountId }: { id: string }) =>
      getCommanditaireVaeCollectiveForAccountId({
        accountId,
      }),
  },
  CohorteVaeCollective: {
    commanditaireVaeCollective: async ({
      commanditaireVaeCollectiveId,
    }: {
      commanditaireVaeCollectiveId: string;
    }) => getCommanditaireVaeCollectiveById({ commanditaireVaeCollectiveId }),
    certificationCohorteVaeCollectives: async ({
      id: cohorteVaeCollectiveId,
    }: {
      id: string;
    }) =>
      getCertificationCohortesByCohorteId({
        cohorteVaeCollectiveId,
      }),
    organism: async ({ organismId }: { organismId: string }) =>
      getOrganismById({ organismId }),
  },
  CertificationCohorteVaeCollective: {
    certification: async ({ certificationId }: { certificationId: string }) =>
      getCertificationById({ certificationId }),
  },
  SousCompteVaeCollective: {
    account: async ({ accountId }: { accountId: string }) =>
      getAccountById({ id: accountId }),
    canCreateCohorteVaeCollective: async ({
      id: sousCompteVaeCollectiveId,
    }: {
      id: string;
    }) =>
      canSousCompteCreateCohorteVaeCollective({ sousCompteVaeCollectiveId }),
    rolesSpecificToCohorte: async (
      {
        id: sousCompteVaeCollectiveId,
      }: {
        id: string;
      },
      {
        cohorteVaeCollectiveId,
      }: {
        cohorteVaeCollectiveId: string;
      },
    ) =>
      getRolesSpecificToSousCompteAndCohorteVaeCollective({
        sousCompteVaeCollectiveId,
        cohorteVaeCollectiveId,
      }),
  },
  Candidacy: {
    cohorteVaeCollective: async ({
      cohorteVaeCollectiveId,
    }: {
      cohorteVaeCollectiveId?: string;
    }) => getCohorteVAECollectiveById({ cohorteVaeCollectiveId }),
  },
  CommanditaireVaeCollective: {
    cohorteVaeCollectives: async (
      {
        id: commanditaireVaeCollectiveId,
      }: {
        id: string;
      },
      { offset, limit }: { offset: number; limit: number },
    ) =>
      getCohortesVaeCollectivesByCommanditaireVaeCollectiveId({
        commanditaireVaeCollectiveId,
        offset,
        limit,
      }),
    metabaseDashboardIframeUrl: async ({
      id: commanditaireVaeCollectiveId,
    }: {
      id: string;
    }) =>
      getMetabaseDashboardIframeUrlVaeCollective({
        commanditaireVaeCollectiveId,
      }),
    sousComptes: async (
      { id: commanditaireVaeCollectiveId }: { id: string },
      {
        offset,
        limit,
        searchFilter,
      }: { offset: number; limit: number; searchFilter?: string },
    ) =>
      getSousComptesByCommanditaireVaeCollectiveId({
        commanditaireVaeCollectiveId,
        offset,
        limit,
        searchFilter,
      }),
  },
  Query: {
    vaeCollective_getCommanditaireVaeCollective: async (
      _parent: unknown,
      {
        commanditaireVaeCollectiveId,
      }: { commanditaireVaeCollectiveId: string },
    ) => getCommanditaireVaeCollectiveById({ commanditaireVaeCollectiveId }),
    cohorteVaeCollective: async (
      _parent: unknown,
      { codeInscription }: { codeInscription: string },
    ) =>
      getCohorteVAECollectiveByCodeInscription({
        codeInscription,
      }),
    cohortesVaeCollectivesForConnectedAap: async (
      _parent: unknown,
      _args: unknown,
      context: GraphqlContext,
    ) =>
      getCohortesVaeCollectivesForConnectedAap({
        userKeycloakId: context.auth.userInfo?.sub || "",
        userRoles: context.auth.userInfo?.realm_access?.roles || [],
      }),
    cohortesVaeCollectivesForConnectedCertificationAuthorityOrLocalAccount:
      async (_parent: unknown, _args: unknown, context: GraphqlContext) =>
        getCohortesVaeCollectivesForConnectedCertificationAuthorityOrLocalAccount(
          {
            userKeycloakId: context.auth.userInfo?.sub || "",
            userRoles: context.auth.userInfo?.realm_access?.roles || [],
          },
        ),
    vaeCollective_getCohorteVaeCollectiveById: async (
      _parent: unknown,
      { cohorteVaeCollectiveId }: { cohorteVaeCollectiveId: string },
    ) => getCohorteVAECollectiveById({ cohorteVaeCollectiveId }),
    vaeCollective_commanditaireVaeCollectives: async (
      _parent: unknown,
      {
        offset,
        limit,
        searchFilter,
      }: { offset?: number; limit?: number; searchFilter?: string },
    ) => getCommanditaireVaeCollectives({ offset, limit, searchFilter }),
    vaeCollective_getUserPermissions: async (
      _parent: unknown,
      _args: unknown,
      context: GraphqlContext,
    ) =>
      getUserPermissions({
        userKeycloakId: context.auth.userInfo?.sub || "",
        userKeycloakRoles: context.auth.userInfo?.realm_access?.roles || [],
      }),
    vaeCollective_getSousCompteVaeCollective: async (
      _parent: unknown,
      {
        sousCompteVaeCollectiveId,
      }: {
        sousCompteVaeCollectiveId: string;
      },
    ) =>
      getSousCompteVaeCollectiveById({
        sousCompteVaeCollectiveId,
      }),
  },
  Mutation: {
    vaeCollective_createCohorteVaeCollective: async (
      _parent: unknown,
      {
        commanditaireVaeCollectiveId,
        nomCohorteVaeCollective,
      }: {
        commanditaireVaeCollectiveId: string;
        nomCohorteVaeCollective: string;
      },
    ) =>
      createCohorteVaeCollective({
        commanditaireVaeCollectiveId,
        nomCohorteVaeCollective,
      }),
    vaeCollective_updateNomCohorteVaeCollective: async (
      _parent: unknown,
      {
        cohorteVaeCollectiveId,
        nomCohorteVaeCollective,
      }: {
        cohorteVaeCollectiveId: string;
        nomCohorteVaeCollective: string;
      },
    ) =>
      updateNomCohorteVaeCollective({
        cohorteVaeCollectiveId,
        nomCohorteVaeCollective,
      }),
    vaeCollective_deleteCohorteVaeCollective: async (
      _parent: unknown,
      { cohorteVaeCollectiveId }: { cohorteVaeCollectiveId: string },
    ) => deleteCohorteVAECollective({ cohorteVaeCollectiveId }),
    vaeCollective_updateCohorteVAECollectiveCertification: async (
      _parent: unknown,
      {
        cohorteVaeCollectiveId,
        certificationIds,
      }: { cohorteVaeCollectiveId: string; certificationIds: string[] },
    ) =>
      updateCohorteVAECollectiveCertification({
        cohorteVaeCollectiveId,
        certificationIds,
      }),
    vaeCollective_updateCohorteVAECollectiveOrganism: async (
      _parent: unknown,
      {
        cohorteVaeCollectiveId,
        organismId,
      }: { cohorteVaeCollectiveId: string; organismId: string },
    ) =>
      updateCohorteVAECollectiveOrganism({
        cohorteVaeCollectiveId,
        organismId,
      }),
    vaeCollective_publishCohorteVAECollective: async (
      _parent: unknown,
      { cohorteVaeCollectiveId }: { cohorteVaeCollectiveId: string },
    ) => publishCohorteVAECollective({ cohorteVaeCollectiveId }),
    vaeCollective_createCommanditaireVaeCollective: async (
      _parent: unknown,
      {
        raisonSociale,
        gestionnaireEmail,
        gestionnaireFirstname,
        gestionnaireLastname,
      }: {
        raisonSociale: string;
        gestionnaireEmail: string;
        gestionnaireFirstname: string;
        gestionnaireLastname: string;
      },
    ) =>
      createCommanditaireVaeCollective({
        raisonSociale,
        gestionnaireEmail,
        gestionnaireFirstname,
        gestionnaireLastname,
      }),
    vaeCollective_createSousCompteVaeCollective: async (
      _parent: unknown,
      {
        commanditaireVaeCollectiveId,
        accountFirstname,
        accountLastname,
        accountEmail,
        canCreateCohorteVaeCollective,
      }: {
        commanditaireVaeCollectiveId: string;
        accountFirstname: string;
        accountLastname: string;
        accountEmail: string;
        canCreateCohorteVaeCollective: boolean;
      },
    ) =>
      createSousCompteVaeCollective({
        commanditaireVaeCollectiveId,
        accountFirstname,
        accountLastname,
        accountEmail,
        canCreateCohorteVaeCollective,
      }),
    vaeCollective_updateSousCompteVaeCollective: async (
      _parent: unknown,
      {
        sousCompteVaeCollectiveId,
        canCreateCohorteVaeCollective,
      }: {
        commanditaireVaeCollectiveId: string;
        sousCompteVaeCollectiveId: string;
        canCreateCohorteVaeCollective: boolean;
      },
    ) =>
      updateSousCompteVaeCollective({
        sousCompteVaeCollectiveId,
        canCreateCohorteVaeCollective,
      }),
    vaeCollective_updateRolesSpecificToCohorteOfSousCompteVaeCollective: async (
      _parent: unknown,
      {
        commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId,
        sousComptesIdsAndRoles,
      }: {
        commanditaireVaeCollectiveId: string;
        cohorteVaeCollectiveId: string;
        sousComptesIdsAndRoles: {
          sousCompteVaeCollectiveId: string;
          roles: RoleVaeCollective[];
        }[];
      },
    ) =>
      updateRolesSpecificToCohorteOfSousCompteVaeCollective({
        commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId,
        sousComptesIdsAndRoles,
      }),
  },
};

export const vaeCollectiveResolvers = withPolicies(unsafeResolvers, {
  Account: {
    // Uniquement résolu à partir du compte de l'utilisateur connecté.
    commanditaireVaeCollective: isAnyone,
  },
  CohorteVaeCollective: {
    // CohorteVaeCollective.commanditaireVaeCollective est consultable anonymement via
    // la query publique `cohorteVaeCollective(codeInscription)` (raisonSociale affichée
    // lors de l'inscription candidat). Les champs imbriqués de CommanditaireVaeCollective
    // (cohorteVaeCollectives, metabaseDashboardIframeUrl) restent quant à eux protégés
    // individuellement, voir le bloc CommanditaireVaeCollective plus bas.
    commanditaireVaeCollective: isAnyone,
    certificationCohorteVaeCollectives:
      isAdminOrGestionnaireOfCommanditaireVaeCollective,
    organism: isAnyone,
  },
  CertificationCohorteVaeCollective: {
    // Uniquement accessible via certificationCohorteVaeCollectives, déjà protégé ci-dessus.
    certification: isAnyone,
  },
  SousCompteVaeCollective: {
    // Uniquement accessible via CommanditaireVaeCollective.sousComptes, déjà protégé ci-dessous.
    account: isAnyone,
    // Uniquement accessible via CommanditaireVaeCollective.sousComptes, déjà protégé ci-dessous.
    canCreateCohorteVaeCollective: isAnyone,
    // Uniquement accessible via CommanditaireVaeCollective.sousComptes, déjà protégé ci-dessous.
    rolesSpecificToCohorte: isAnyone,
  },
  Candidacy: {
    // Champ d'une candidature déjà protégée par la policy de son parent.
    cohorteVaeCollective: isAnyone,
  },
  CommanditaireVaeCollective: {
    cohorteVaeCollectives: hasVaeCollectivePermission("VOIR_LISTE_COHORTES"),
    metabaseDashboardIframeUrl: hasVaeCollectivePermission("VOIR_STATISTIQUES"),
    sousComptes: hasVaeCollectivePermission("VOIR_LISTE_SOUS_COMPTES"),
  },
  Query: {
    vaeCollective_getCommanditaireVaeCollective:
      isAdminOrGestionnaireOfCommanditaireVaeCollective,
    cohorteVaeCollective: isAnyone,
    // La sécurité est gérée dans la feature (filtre par rapport au rôle de l'utilisateur)
    cohortesVaeCollectivesForConnectedAap: isAnyone,
    // La sécurité est gérée dans la feature (filtre par rapport au rôle de l'utilisateur)
    cohortesVaeCollectivesForConnectedCertificationAuthorityOrLocalAccount:
      isAnyone,
    vaeCollective_getCohorteVaeCollectiveById:
      hasVaeCollectivePermission("VOIR_COHORTE"),
    vaeCollective_commanditaireVaeCollectives: isAdmin,
    vaeCollective_getUserPermissions: isAnyone,
    vaeCollective_getSousCompteVaeCollective:
      hasVaeCollectivePermission("VOIR_SOUS_COMPTE"),
  },
  Mutation: {
    vaeCollective_createCohorteVaeCollective:
      hasVaeCollectivePermission("CREER_COHORTE"),
    vaeCollective_updateNomCohorteVaeCollective:
      hasVaeCollectivePermission("MODIFIER_COHORTE"),
    vaeCollective_deleteCohorteVaeCollective:
      hasVaeCollectivePermission("SUPPRIMER_COHORTE"),
    vaeCollective_updateCohorteVAECollectiveCertification:
      hasVaeCollectivePermission("MODIFIER_COHORTE"),
    vaeCollective_updateCohorteVAECollectiveOrganism:
      hasVaeCollectivePermission("MODIFIER_COHORTE"),
    vaeCollective_publishCohorteVAECollective:
      hasVaeCollectivePermission("MODIFIER_COHORTE"),
    vaeCollective_createCommanditaireVaeCollective: isAdmin,
    vaeCollective_createSousCompteVaeCollective:
      hasVaeCollectivePermission("CREER_SOUS_COMPTE"),
    vaeCollective_updateSousCompteVaeCollective: hasVaeCollectivePermission(
      "MODIFIER_SOUS_COMPTE",
    ),
    vaeCollective_updateRolesSpecificToCohorteOfSousCompteVaeCollective:
      hasVaeCollectivePermission("MODIFIER_DROITS_ACCES_COHORTE"),
  },
});
