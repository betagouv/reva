import {
  Account,
  Candidacy,
  CertificationAuthorityLocalAccount,
  CertificationAuthorityStructure,
  CertificationRegistryManager,
} from "@prisma/client";
import mercurius from "mercurius";

import {
  FunctionalCodeError,
  FunctionalError,
} from "@/modules/shared/error/functionalError";
import { logger } from "@/modules/shared/logger/logger";

import { buildCandidacyAuditLogUserInfo } from "../candidacy-log/features/logCandidacyAuditEvent";
import { hasRole } from "../shared/security/middlewares";
import {
  isAdmin,
  isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate,
  isAdminOrCertificationAuthority,
  isAdminOrCertificationAuthorityLocalAccountManagerOrCertificationAuthorityLocalAccountOwner,
  isAdminOrCertificationAuthorityLocalAccountOwner,
  isAdminOrCertificationAuthorityOwner,
  isAdminOrCertificationRegistryManagerOfCertificationOrIsCertificationAuthorityStructureMember,
  isAdminOrIsCertificationAuthorityAccountOrLocalAccountStructureMember,
  isAdminOrIsCertificationAuthorityStructureMember,
  isAdminOrIsCertificationAuthorityStructureRegistryManagerMember,
  isAdminOrManager,
  isAnyone,
  isRegistryManager,
} from "../shared/security/presets";
import { withPolicies } from "../shared/security/withPolicies";

import {
  CertificationAuthority,
  CreateCertificationAuthorityLocalAccountInput,
  UpdateCertificationAuthorityLocalAccountGeneralInformationInput,
} from "./certification-authority.types";
import { certificationAuthorityAcceptCgu } from "./features/certificationAuthorityAcceptCgu";
import { createCertificationAuthority } from "./features/createCertificationAuthority";
import { createCertificationAuthorityLocalAccount } from "./features/createCertificationAuthorityLocalAccount";
import { createCertificationAuthorityStructure } from "./features/createCertificationAuthorityStructure";
import { createCertificationRegistryManager } from "./features/createCertificationRegistryManager";
import { deleteCertificationAuthorityLocalAccount } from "./features/deleteCertificationAuthorityLocalAccount";
import { getCandidacyCertificationAuthorityLocalAccounts } from "./features/getCandidacyCertificationAuthorityLocalAccounts";
import { getCertificationAuthorities } from "./features/getCertificationAuthorities";
import { getCertificationAuthoritiesByCertificationId } from "./features/getCertificationAuthoritiesByCertificationId";
import { getCertificationAuthoritiesByStructureId } from "./features/getCertificationAuthoritiesByStructureId";
import { getCertificationAuthoritiesToTransferCandidacy } from "./features/getCertificationAuthoritiesToTransferCandidacy";
import { getCertificationAuthorityById } from "./features/getCertificationAuthority";
import { getCertificationAuthorityByCandidacyId } from "./features/getCertificationAuthorityByCandidacyId";
import { getCertificationAuthorityLocalAccountByAccountId } from "./features/getCertificationAuthorityLocalAccountByAccountId";
import { getCertificationAuthorityLocalAccountByCertificationAuthorityId } from "./features/getCertificationAuthorityLocalAccountByCertificationAuthorityId";
import { getCertificationAuthorityLocalAccountById } from "./features/getCertificationAuthorityLocalAccountById";
import { getCertificationAuthorityLocalAccountsToTransferCandidacy } from "./features/getCertificationAuthorityLocalAccountsToTransferCandidacy";
import { getCertificationAuthorityRegions } from "./features/getCertificationAuthorityRegions";
import { getCertificationAuthorityStructureById } from "./features/getCertificationAuthorityStructureById";
import { getCertificationAuthorityStructures } from "./features/getCertificationAuthorityStructures";
import { getCertificationAuthorityStructuresByCertificationAuthorityId } from "./features/getCertificationAuthorityStructuresByCertificationAuthorityId";
import { getCertificationRegistryManagerByAccountId } from "./features/getCertificationRegistryManagerByAccountId";
import { getCertificationRegistryManagerByStructureId } from "./features/getCertificationRegistryManagerByStructureId";
import { getCertificationsAndParcoursByCertificationAuthorityId } from "./features/getCertificationsAndParcoursByCertificationAuthorityId";
import { getCertificationsByCertificationAuthorityId } from "./features/getCertificationsByCertificationAuthorityId";
import { getCertificationsByCertificationStructureId } from "./features/getCertificationsByCertificationStructureId";
import { getDepartmentsByCertificationAuthorityId } from "./features/getDepartmentsByCertificationAuthorityId";
import { getHumanAccountByCertificationAuthorityId } from "./features/getHumanAccountByCertificationAuthorityId";
import { getHumanAccountByCertificationAuthorityLocalAccountId } from "./features/getHumanAccountByCertificationAuthorityLocalAccountId";
import { getLastProfessionalCguCertificateur } from "./features/getLastProfessionalCguCertificateur";
import { getMetabaseIframeUrl } from "./features/getMetabaseIframeUrl";
import { getMetabaseIframeUrlForRegistryManager } from "./features/getMetabaseIframeUrlForRegistryManager";
import { getPaginatedCertifications } from "./features/getPaginatedCertifications";
import { getParcoursForCertificationAndCertificationAuthority } from "./features/getParcoursForCertificationAndCertificationAuthority";
import { isCandidacyCertificationAuthorityUpdatable } from "./features/isCandidacyCertificationAuthorityUpdatable";
import { searchCertificationAuthoritiesAndLocalAccounts } from "./features/searchCertificationAuthoritiesAndLocalAccounts";
import { transferCandidacyToAnotherCertificationAuthority } from "./features/transferCandidacyToAnotherCertificationAuthority";
import { transferCandidacyToCertificationAuthorityLocalAccount } from "./features/transferCandidacyToCertificationAuthorityLocalAccount";
import { updateCertificationAuthorityById } from "./features/updateCertificationAuthority";
import { updateCertificationAuthorityCertifications } from "./features/updateCertificationAuthorityCertifications";
import { updateCertificationAuthorityDepartments } from "./features/updateCertificationAuthorityDepartments";
import { updateCertificationAuthorityDepartmentsAndCertifications } from "./features/updateCertificationAuthorityDepartmentsAndCertifications";
import { updateCertificationAuthorityLocalAccountCertifications } from "./features/updateCertificationAuthorityLocalAccountCertifications";
import { updateCertificationAuthorityLocalAccountDepartments } from "./features/updateCertificationAuthorityLocalAccountDepartments";
import { updateCertificationAuthorityLocalAccountGeneralInformation } from "./features/updateCertificationAuthorityLocalAccountGeneralInformation";
import { updateCertificationAuthorityStructure } from "./features/updateCertificationAuthorityStructure";
import { updateCertificationAuthorityStructureCertifications } from "./features/updateCertificationAuthorityStructureCertifications";
import { updateCertificationRegistryManager } from "./features/updateCertificationRegistryManager";
import { updateParcoursForCertificationAndCertificationAuthority } from "./features/updateParcoursForCertificationAndCertificationAuthority";

const unsafeResolvers = {
  Account: {
    certificationRegistryManager: (parent: Account) =>
      getCertificationRegistryManagerByAccountId({
        accountId: parent.id,
      }),
    certificationAuthorityLocalAccount: (parent: Account) =>
      getCertificationAuthorityLocalAccountByAccountId({
        accountId: parent.id,
      }),
  },
  Candidacy: {
    certificationAuthorityLocalAccounts: ({ id: candidacyId }: Candidacy) =>
      getCandidacyCertificationAuthorityLocalAccounts({ candidacyId }),
    certificationAuthority: ({ id: candidacyId }: Candidacy) =>
      getCertificationAuthorityByCandidacyId({ candidacyId }),
    isCandidacyCertificationAuthorityUpdatable: ({
      id: candidacyId,
    }: Candidacy) =>
      isCandidacyCertificationAuthorityUpdatable({ candidacyId }),
  },
  CertificationAuthority: {
    departments: (parent: CertificationAuthority) =>
      getDepartmentsByCertificationAuthorityId({
        certificationAuthorityId: parent.id,
      }),
    regions: (parent: CertificationAuthority) =>
      getCertificationAuthorityRegions(parent.id),
    certifications: (parent: CertificationAuthority) =>
      getCertificationsByCertificationAuthorityId({
        certificationAuthorityId: parent.id,
      }),
    certificationAuthorityStructures: ({
      id: certificationAuthorityId,
    }: CertificationAuthority) =>
      getCertificationAuthorityStructuresByCertificationAuthorityId({
        certificationAuthorityId,
      }),
    account: (parent: CertificationAuthority) =>
      getHumanAccountByCertificationAuthorityId({
        certificationAuthorityId: parent.id,
      }),
    certificationAuthorityLocalAccounts: (
      parent: CertificationAuthority,
      {
        departmentIdFilter,
        certificationIdFilter,
      }: {
        departmentIdFilter?: string;
        certificationIdFilter?: string;
      },
    ) =>
      getCertificationAuthorityLocalAccountByCertificationAuthorityId({
        certificationAuthorityId: parent.id,
        departmentId: departmentIdFilter,
        certificationId: certificationIdFilter,
      }),
    metabaseDashboardIframeUrl: async (parent: CertificationAuthority) =>
      getMetabaseIframeUrl(parent),
    certificationsAndParcours: (
      parent: CertificationAuthority,
      params: {
        offset?: number;
        limit?: number;
        searchText?: string;
      },
    ) =>
      getCertificationsAndParcoursByCertificationAuthorityId({
        certificationAuthorityId: parent.id,
        ...params,
      }),
  },

  CertificationAuthorityLocalAccount: {
    certificationAuthority: (parent: CertificationAuthorityLocalAccount) =>
      getCertificationAuthorityById({
        id: parent.certificationAuthorityId,
      }),
    account: (parent: CertificationAuthorityLocalAccount) =>
      getHumanAccountByCertificationAuthorityLocalAccountId({
        certificationAuthorityLocalAccountId: parent.id,
      }),
    paginatedCertifications: (
      parent: CertificationAuthorityLocalAccount,
      params: {
        limit?: number;
        offset?: number;
        searchText?: string;
      },
    ) =>
      getPaginatedCertifications({
        localAccountId: parent.id,
        ...params,
      }),
  },
  Certification: {
    certificationAuthorities: ({
      id: certificationId,
    }: CertificationAuthority) =>
      getCertificationAuthoritiesByCertificationId({
        certificationId,
      }),
    certificationAuthorityStructure: ({
      certificationAuthorityStructureId,
    }: {
      certificationAuthorityStructureId?: string;
    }) =>
      certificationAuthorityStructureId
        ? getCertificationAuthorityStructureById({
            certificationAuthorityStructureId:
              certificationAuthorityStructureId,
          })
        : null,
  },
  CertificationAuthorityStructure: {
    certifications: ({ id: certificationStructureId }: { id: string }) =>
      getCertificationsByCertificationStructureId({ certificationStructureId }),
    certificationAuthorities: ({
      id: certificationStructureId,
    }: {
      id: string;
    }) => getCertificationAuthoritiesByStructureId(certificationStructureId),
    certificationRegistryManager: ({
      id: certificationStructureId,
    }: {
      id: string;
    }) =>
      getCertificationRegistryManagerByStructureId(certificationStructureId),
    cgu: async ({
      cguVersion,
      cguAcceptedAt,
    }: {
      cguVersion: number;
      cguAcceptedAt?: Date;
    }) => {
      return {
        version: cguVersion,
        acceptedAt: cguAcceptedAt,
        isLatestVersion:
          (await getLastProfessionalCguCertificateur())?.version == cguVersion,
      };
    },
    metabaseDashboardIframeUrlForRegistryManager: async (
      parent: CertificationAuthorityStructure,
      _params: unknown,
      context: GraphqlContext,
    ) =>
      getMetabaseIframeUrlForRegistryManager(
        parent,
        context.auth.userInfo?.sub || "",
      ),
  },
  CertificationRegistryManager: {
    certificationAuthorityStructure: (parent: CertificationRegistryManager) =>
      getCertificationAuthorityStructureById({
        certificationAuthorityStructureId:
          parent.certificationAuthorityStructureId,
      }),
  },

  Mutation: {
    certification_authority_updateCertificationAuthority: async (
      _parent: unknown,
      params: {
        certificationAuthorityId: string;
        certificationAuthorityData: {
          label: string;
          accountFirstname: string;
          accountLastname: string;
          accountEmail: string;
          contactFullName: string | null;
          contactEmail: string | null;
          contactPhone: string | null;
          isGlobalContact: boolean;
          websiteUrl: string | null;
        };
      },
      context: GraphqlContext,
    ) => {
      try {
        if (context.auth.userInfo?.sub == undefined) {
          throw new FunctionalError(
            FunctionalCodeError.TECHNICAL_ERROR,
            "Not authorized",
          );
        }

        return updateCertificationAuthorityById({
          ...params,
          userRoles: context.auth.userInfo?.realm_access?.roles || [],
        });
      } catch (e) {
        logger.error(e);
        throw new mercurius.ErrorWithProps((e as Error).message, e as Error);
      }
    },

    certification_authority_createCertificationAuthorityLocalAccount: async (
      _parent: unknown,
      params: {
        input: CreateCertificationAuthorityLocalAccountInput;
      },
    ) =>
      createCertificationAuthorityLocalAccount({
        ...params.input,
      }),

    certification_authority_createCertificationAuthority: async (
      _parent: unknown,
      params: {
        input: {
          accountFirstname: string;
          accountLastname: string;
          accountEmail: string;
          label: string;
          certificationAuthorityStructureId: string;
          certificationIds: string[];
        };
      },
    ) =>
      createCertificationAuthority({
        ...params.input,
      }),

    certification_authority_updateCertificationAuthorityLocalAccountGeneralInformation:
      async (
        _parent: unknown,
        params: {
          input: UpdateCertificationAuthorityLocalAccountGeneralInformationInput;
        },
        context: GraphqlContext,
      ) =>
        updateCertificationAuthorityLocalAccountGeneralInformation({
          input: params.input,
          userRoles: context.auth.userInfo?.realm_access?.roles || [],
        }),
    certification_authority_updateCertificationAuthorityDepartmentsAndCertifications:
      async (
        _parent: unknown,
        params: {
          input: {
            certificationAuthorityId: string;
            departmentIds: string[];
            certificationIds: string[];
          };
        },
      ) =>
        updateCertificationAuthorityDepartmentsAndCertifications(params.input),

    certification_authority_updateCertificationAuthorityCertifications: async (
      _parent: unknown,
      params: {
        certificationAuthorityId: string;
        certificationIds: string[];
      },
    ) => updateCertificationAuthorityCertifications(params),

    certification_authority_updateCertificationAuthorityDepartments: async (
      _parent: unknown,
      params: {
        certificationAuthorityId: string;
        departmentIds: string[];
      },
    ) => updateCertificationAuthorityDepartments(params),

    certification_authority_deleteCertificationAuthorityLocalAccount: async (
      _parent: unknown,
      params: {
        certificationAuthorityLocalAccountId: string;
      },
    ) =>
      deleteCertificationAuthorityLocalAccount({
        certificationAuthorityLocalAccountId:
          params.certificationAuthorityLocalAccountId,
      }),

    certification_authority_updateCertificationAuthorityLocalAccountDepartments:
      async (
        _parent: unknown,
        params: {
          certificationAuthorityLocalAccountId: string;
          departmentIds: string[];
        },
      ) => updateCertificationAuthorityLocalAccountDepartments(params),

    certification_authority_updateCertificationAuthorityLocalAccountCertifications:
      async (
        _parent: unknown,
        params: {
          certificationAuthorityLocalAccountId: string;
          certificationIds: string[];
        },
      ) => updateCertificationAuthorityLocalAccountCertifications(params),

    certification_authority_transferCandidacyToAnotherCertificationAuthority:
      async (
        _parent: unknown,
        params: {
          candidacyId: string;
          certificationAuthorityId: string;
          transferReason: string;
        },
        context: GraphqlContext,
      ) =>
        transferCandidacyToAnotherCertificationAuthority({
          ...params,
          userInfo: buildCandidacyAuditLogUserInfo(context),
        }),

    certification_authority_transferCandidacyToCertificationAuthorityLocalAccount:
      async (
        _parent: unknown,
        params: {
          candidacyId: string;
          certificationAuthorityLocalAccountId: string;
          transferReason: string;
        },
        context: GraphqlContext,
      ) => {
        await transferCandidacyToCertificationAuthorityLocalAccount({
          ...params,
          userInfo: buildCandidacyAuditLogUserInfo(context),
        });

        return true;
      },

    certification_authority_updateCertificationAuthorityStructure: async (
      _parent: unknown,
      params: {
        certificationAuthorityStructureId: string;
        certificationAuthorityStructureLabel: string;
      },
    ) => updateCertificationAuthorityStructure(params),
    certification_authority_updateCertificationAuthorityStructureCertifications:
      async (
        _parent: unknown,
        params: {
          certificationAuthorityStructureId: string;
          certificationIds: string[];
        },
      ) => updateCertificationAuthorityStructureCertifications(params),

    certification_authority_createCertificationRegistryManager: async (
      _parent: unknown,
      params: {
        input: {
          certificationAuthorityStructureId: string;
          accountFirstname: string;
          accountLastname: string;
          accountEmail: string;
        };
      },
    ) => {
      return createCertificationRegistryManager(params.input);
    },
    certification_authority_updateCertificationRegistryManager: async (
      _parent: unknown,
      params: {
        input: {
          certificationRegistryManagerId: string;
          accountFirstname: string;
          accountLastname: string;
          accountEmail: string;
        };
      },
    ) => {
      return updateCertificationRegistryManager(params.input);
    },
    certification_authority_acceptCgu: async (
      _parent: unknown,
      _params: unknown,
      context: GraphqlContext,
    ) =>
      certificationAuthorityAcceptCgu({
        keycloakId: context.auth.userInfo?.sub || "",
        roles: context.auth.userInfo?.realm_access?.roles || [],
      }),
    certification_authority_createCertificationAuthorityStructure: async (
      _parent: unknown,
      params: {
        label: string;
      },
    ) => createCertificationAuthorityStructure(params.label),

    certification_authority_updateParcoursForCertificationAndCertificationAuthority:
      async (
        _parent: unknown,
        params: {
          certificationId: string;
          certificationAuthorityId: string;
          parcoursCertificationIds: string[];
        },
      ) => updateParcoursForCertificationAndCertificationAuthority(params),
  },
  Query: {
    certification_authority_getCertificationAuthority: async (
      _parent: unknown,
      params: {
        id: string;
      },
      context: GraphqlContext,
    ) => {
      try {
        if (context.auth.userInfo?.sub == undefined) {
          throw new FunctionalError(
            FunctionalCodeError.TECHNICAL_ERROR,
            "Not authorized",
          );
        }

        return getCertificationAuthorityById(params);
      } catch (e) {
        logger.error(e);
        throw new mercurius.ErrorWithProps((e as Error).message, e as Error);
      }
    },
    certification_authority_getCertificationAuthorities: (
      _parent: unknown,
      params: {
        limit?: number;
        offset?: number;
        searchFilter?: string;
      },
    ) => getCertificationAuthorities(params),

    certification_authority_searchCertificationAuthoritiesAndLocalAccounts: (
      _parent: unknown,
      params: {
        limit?: number;
        offset?: number;
        searchFilter?: string;
      },
    ) => searchCertificationAuthoritiesAndLocalAccounts(params),

    certification_authority_getCertificationAuthorityLocalAccount: (
      _parent: unknown,
      params: {
        id: string;
      },
    ) =>
      getCertificationAuthorityLocalAccountById({
        certificationAuthorityLocalAccountId: params.id,
      }),

    certification_authority_getCertificationAuthoritiesToTransferCandidacy: (
      _parent: unknown,
      params: {
        candidacyId: string;
        offset?: number;
        limit?: number;
        searchFilter?: string;
      },
    ) => getCertificationAuthoritiesToTransferCandidacy(params),

    certification_authority_getCertificationAuthorityLocalAccountsToTransferCandidacy:
      (
        _parent: unknown,
        params: {
          candidacyId: string;
          offset?: number;
          limit?: number;
          searchFilter?: string;
        },
        context: GraphqlContext,
      ) =>
        getCertificationAuthorityLocalAccountsToTransferCandidacy({
          ...params,
          keycloakId: context.auth.userInfo?.sub,
        }),

    certification_authority_getCertificationAuthorityStructures: (
      _parent: unknown,
      params: {
        limit?: number;
        offset?: number;
        searchFilter?: string;
      },
    ) => getCertificationAuthorityStructures(params),

    certification_authority_getCertificationAuthorityStructure: (
      _parent: unknown,
      {
        id,
      }: {
        id: string;
      },
    ) =>
      getCertificationAuthorityStructureById({
        certificationAuthorityStructureId: id,
      }),

    certification_authority_getParcoursForCertificationAndCertificationAuthority:
      (
        _parent: unknown,
        params: {
          certificationId: string;
          certificationAuthorityId: string;
        },
      ) => getParcoursForCertificationAndCertificationAuthority(params),
  },
};

export const certificationAuthorityResolvers = withPolicies(unsafeResolvers, {
  Query: {
    certification_authority_getCertificationAuthority: isAdminOrManager,
    certification_authority_getCertificationAuthorities: isAdmin,
    certification_authority_getCertificationAuthorityStructures: isAdmin,
    certification_authority_getCertificationAuthorityStructure: isAdmin,
    certification_authority_searchCertificationAuthoritiesAndLocalAccounts:
      isAdmin,
    certification_authority_getCertificationAuthorityLocalAccount:
      isAdminOrCertificationAuthorityLocalAccountOwner,
    certification_authority_getCertificationAuthoritiesToTransferCandidacy:
      isAdminOrCertificationAuthority,
    certification_authority_getCertificationAuthorityLocalAccountsToTransferCandidacy:
      isAdminOrCertificationAuthority,
    certification_authority_getParcoursForCertificationAndCertificationAuthority:
      isAdminOrCertificationAuthorityOwner,
  },
  CertificationAuthority: {
    certificationAuthorityStructures:
      isAdminOrIsCertificationAuthorityAccountOrLocalAccountStructureMember,
    account: isAdminOrCertificationAuthorityOwner,
    certificationsAndParcours: isAdminOrCertificationAuthorityOwner,
    departments: isAnyone,
    regions: isAnyone,
    certifications: isAnyone,
    certificationAuthorityLocalAccounts: isAdminOrCertificationAuthorityOwner,
    metabaseDashboardIframeUrl: isAdminOrCertificationAuthorityOwner,
  },
  Account: {
    certificationAuthorityLocalAccount: isAnyone,
    certificationRegistryManager: isAnyone,
  },
  Candidacy: {
    certificationAuthority:
      isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate,
    certificationAuthorityLocalAccounts:
      isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate,
    isCandidacyCertificationAuthorityUpdatable:
      isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate,
  },
  Certification: {
    certificationAuthorityStructure: isAnyone,
    certificationAuthorities: isAnyone,
  },
  CertificationAuthorityStructure: {
    certificationAuthorities: isAdminOrIsCertificationAuthorityStructureMember,
    certificationRegistryManager:
      isAdminOrIsCertificationAuthorityAccountOrLocalAccountStructureMember,
    certifications:
      isAdminOrCertificationRegistryManagerOfCertificationOrIsCertificationAuthorityStructureMember,
    cgu: isAnyone,
    metabaseDashboardIframeUrlForRegistryManager: isRegistryManager,
  },
  CertificationRegistryManager: {
    certificationAuthorityStructure:
      isAdminOrIsCertificationAuthorityStructureRegistryManagerMember,
  },
  Mutation: {
    certification_authority_updateCertificationAuthority:
      isAdminOrCertificationAuthorityOwner,
    certification_authority_updateCertificationAuthorityDepartmentsAndCertifications:
      isAdmin,
    certification_authority_createCertificationAuthorityLocalAccount:
      isAdminOrCertificationAuthorityOwner,
    certification_authority_updateCertificationAuthorityLocalAccountGeneralInformation:
      isAdminOrCertificationAuthorityLocalAccountManagerOrCertificationAuthorityLocalAccountOwner,
    certification_authority_updateCertificationAuthorityLocalAccountDepartments:
      isAdminOrCertificationAuthorityLocalAccountOwner,
    certification_authority_deleteCertificationAuthorityLocalAccount:
      isAdminOrCertificationAuthorityLocalAccountOwner,
    certification_authority_updateCertificationAuthorityLocalAccountCertifications:
      isAdminOrCertificationAuthorityLocalAccountOwner,
    certification_authority_transferCandidacyToAnotherCertificationAuthority:
      isAdminOrCertificationAuthority,
    certification_authority_transferCandidacyToCertificationAuthorityLocalAccount:
      isAdminOrCertificationAuthority,
    certification_authority_createCertificationRegistryManager: isAdmin,
    certification_authority_updateCertificationRegistryManager: isAdmin,
    certification_authority_updateCertificationAuthorityStructure: isAdmin,
    certification_authority_updateCertificationAuthorityStructureCertifications:
      isAdmin,
    certification_authority_updateCertificationAuthorityCertifications: isAdmin,
    certification_authority_createCertificationAuthority: isAdmin,
    certification_authority_updateCertificationAuthorityDepartments: isAdmin,
    certification_authority_acceptCgu: [
      hasRole([
        "manage_certification_registry",
        "manage_certification_authority_local_account",
      ]),
    ],
    certification_authority_createCertificationAuthorityStructure: isAdmin,
    certification_authority_updateParcoursForCertificationAndCertificationAuthority:
      isAdminOrCertificationAuthorityOwner,
  },
  CertificationAuthorityLocalAccount: {
    certificationAuthority:
      isAdminOrIsCertificationAuthorityAccountOrLocalAccountStructureMember,
    account:
      isAdminOrIsCertificationAuthorityAccountOrLocalAccountStructureMember,
    paginatedCertifications: isAdminOrCertificationAuthority,
  },
});
