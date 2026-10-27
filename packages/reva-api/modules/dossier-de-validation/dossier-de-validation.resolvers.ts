import {
  isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate,
  isAdminOrCertificationAuthority,
} from "@/modules/shared/security/presets";
import { withPolicies } from "@/modules/shared/security/withPolicies";

import { getCandidacy } from "../candidacy/features/getCandidacy";

import { getActiveDossierDeValidationByCandidacyId } from "./features/getActiveDossierDeValidationByCandidacyId";
import { getActiveDossierDeValidationCountByCategory } from "./features/getActiveDossierDeValidationCountByCategory";
import { getActiveDossiersDeValidation } from "./features/getActiveDossiersDeValidation";
import { getAmenagementSpecifiqueByDossierDeValidationId } from "./features/getAmenagementSpecifiqueByDossierDeValidationId";
import { getDossierDeValidationById } from "./features/getDossierDeValidationById";
import { getDossierDeValidationFilesNamesAndUrls } from "./features/getDossierDeValidationFilesNamesAndUrls";
import { getDossierDeValidationHistory } from "./features/getDossierDeValidationHistory";
import { getDossierDeValidationOtherFilesNamesAndUrls } from "./features/getDossierDeValidationOtherFilesNamesAndUrls";
import { getHistoryDossierDeValidationByCandidacyId } from "./features/getHistoryDossierDeValidationByCandidacyId";
import { markDossierDeValidationAsComplete } from "./features/markDossierDeValidationAsComplete";
import { markDossierDeValidationAsIncomplete } from "./features/markDossierDeValidationAsIncomplete";
import { canManageDossierDeValidation } from "./security/canManageDossierDeValidation";
import { DossierDeValidationStatusFilter } from "./types/dossierDeValidationStatusFilter.type";

const unsafeResolvers = {
  DossierDeValidation: {
    dossierDeValidationFile: async ({
      candidacyId,
      dossierDeValidationFileId,
    }: {
      candidacyId: string;
      dossierDeValidationFileId: string;
    }) =>
      (
        await getDossierDeValidationFilesNamesAndUrls({
          candidacyId,
          fileIds: [dossierDeValidationFileId],
        })
      )?.[0],
    dossierDeValidationOtherFiles: ({
      id,
      candidacyId,
    }: {
      id: string;
      candidacyId: string;
    }) =>
      getDossierDeValidationOtherFilesNamesAndUrls({
        candidacyId,
        dossierDeValidationId: id,
      }),
    history: ({ id, candidacyId }: { id: string; candidacyId: string }) =>
      getDossierDeValidationHistory({
        candidacyId,
        dossierDeValidationId: id,
      }),
    candidacy: ({ candidacyId }: { candidacyId: string }) =>
      getCandidacy({ candidacyId }),
    amenagementSpecifique: ({
      id,
      candidacyId,
    }: {
      id: string;
      candidacyId: string;
    }) =>
      getAmenagementSpecifiqueByDossierDeValidationId({
        dossierDeValidationId: id,
        candidacyId,
      }),
  },
  AmenagementSpecifique: {
    justificationFile: async ({
      candidacyId,
      justificationFileId,
    }: {
      candidacyId: string;
      justificationFileId?: string;
    }) =>
      justificationFileId
        ? (
            await getDossierDeValidationFilesNamesAndUrls({
              candidacyId,
              fileIds: [justificationFileId],
            })
          )?.[0]
        : undefined,
  },
  Candidacy: {
    activeDossierDeValidation: ({ id }: { id: string }) =>
      getActiveDossierDeValidationByCandidacyId({ candidacyId: id }),
    historyDossierDeValidation: ({ id }: { id: string }) =>
      getHistoryDossierDeValidationByCandidacyId({ candidacyId: id }),
  },
  Query: {
    dossierDeValidation_getDossierDeValidationById: (
      _: unknown,
      { dossierDeValidationId }: { dossierDeValidationId: string },
    ) =>
      getDossierDeValidationById({
        dossierDeValidationId: dossierDeValidationId,
      }),
    dossierDeValidation_getDossiersDeValidation: (
      _: unknown,
      args: {
        offset?: number;
        limit?: number;
        category?: DossierDeValidationStatusFilter;
        searchFilter?: string;
        certificationAuthorityId?: string;
        certificationAuthorityLocalAccountId?: string;
      },
      context: GraphqlContext,
    ) =>
      getActiveDossiersDeValidation({
        keycloakId: context.auth.userInfo?.sub || "",
        hasRole: context.auth.hasRole,
        ...args,
      }),
    dossierDeValidation_dossierDeValidationCountByCategory: (
      _: unknown,
      args: {
        searchFilter?: string;
        certificationAuthorityId?: string;
        certificationAuthorityLocalAccountId?: string;
      },
      context: GraphqlContext,
    ) =>
      getActiveDossierDeValidationCountByCategory({
        keycloakId: context.auth.userInfo?.sub || "",
        hasRole: context.auth.hasRole,
        ...args,
      }),
  },
  Mutation: {
    dossierDeValidation_markAsIncomplete: (
      _: unknown,
      {
        dossierDeValidationId,
        decisionComment,
      }: {
        dossierDeValidationId: string;
        decisionComment: string;
      },
      context: GraphqlContext,
    ) =>
      markDossierDeValidationAsIncomplete({
        dossierDeValidationId,
        decisionComment,
        userKeycloakId: context.auth.userInfo?.sub,
        userEmail: context.auth?.userInfo?.email,
        userRoles: context.auth.userInfo?.realm_access?.roles || [],
      }),
    dossierDeValidation_markAsComplete: (
      _: unknown,
      {
        dossierDeValidationId,
        decisionComment,
      }: {
        dossierDeValidationId: string;
        decisionComment: string;
      },
      context: GraphqlContext,
    ) =>
      markDossierDeValidationAsComplete({
        dossierDeValidationId,
        decisionComment,
        userKeycloakId: context.auth.userInfo?.sub,
        userEmail: context.auth?.userInfo?.email,
        userRoles: context.auth.userInfo?.realm_access?.roles || [],
      }),
  },
};

export const dossierDeValidationResolvers = withPolicies(unsafeResolvers, {
  DossierDeValidation: {
    dossierDeValidationFile:
      isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate,
    dossierDeValidationOtherFiles:
      isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate,
    history: isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate,
    candidacy: isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate,
    amenagementSpecifique:
      isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate,
  },
  AmenagementSpecifique: {
    // Le parent renvoyé ci-dessus porte candidacyId, donc le même contrôle d'ownership
    // que les autres pièces du dossier s'applique au justificatif.
    justificationFile: isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate,
  },
  Candidacy: {
    activeDossierDeValidation:
      isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate,
    historyDossierDeValidation:
      isAdminCandidacyCompanionOrFeasibilityManagerOrCandidate,
  },
  Query: {
    dossierDeValidation_getDossierDeValidationById: [
      canManageDossierDeValidation,
    ],
    dossierDeValidation_getDossiersDeValidation:
      isAdminOrCertificationAuthority,
    dossierDeValidation_dossierDeValidationCountByCategory:
      isAdminOrCertificationAuthority,
  },
  Mutation: {
    dossierDeValidation_markAsIncomplete: [canManageDossierDeValidation],
    dossierDeValidation_markAsComplete: [canManageDossierDeValidation],
  },
});
