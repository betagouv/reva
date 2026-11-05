import { getFileNameAndUrl } from "@/modules/shared/file/getFileNameAndUrl";
import { hasRole } from "@/modules/shared/security/middlewares";
import {
  isAdmin,
  isAdminOrCertificationRegistryManagerOfCertification,
  isAnyone,
} from "@/modules/shared/security/presets";
import { withPolicies } from "@/modules/shared/security/withPolicies";
import { prismaClient } from "@/prisma/client";

import { addCertification } from "./features/addCertification";
import { createCertificationCompetenceBloc } from "./features/createCertificationCompetenceBloc";
import { deleteCertificationCompetenceBloc } from "./features/deleteCertificationCompetenceBloc";
import {
  findEtablissement,
  findEtablissementDiffusible,
  findKbis,
  findQualiopiStatus,
} from "./features/entreprise";
import { getAdditionalDocumentsFilaNamesAndUrlsByCertificationAdditionalInfoId } from "./features/getAdditionalDocumentsFilaNamesAndUrlsByCertificationAdditionalInfoId";
import { getAdditionalInfoByCertificationId } from "./features/getAdditionalInfoByCertificationId";
import { getCandidacyFinancingMethods } from "./features/getCandidacyFinancingMethods";
import { getCertificationById } from "./features/getCertificationById";
import { getCertificationCompetenceBlocById } from "./features/getCertificationCompetenceBlocById";
import { getCertificationCompetencesByBlocId } from "./features/getCertificationCompetencesByBlocId";
import { getCertificationPrerequisitesByCertificationId } from "./features/getCertificationPrerequisitesByCertificationId";
import { getCertifications } from "./features/getCertifications";
import { getCompetenceBlocsByCertificationId } from "./features/getCompetenceBlocsByCertificationId";
import { getConventionsCollectivesByCertificationId } from "./features/getConventionsCollectivesByCertificationId";
import { getCountOfChildrenByParentCode } from "./features/getCountOfChildrenByParentCode";
import { getDegreeByLevel } from "./features/getDegreeByLevel";
import { getDegrees } from "./features/getDegrees";
import { getDepartments } from "./features/getDepartments";
import { getDomainsByCertificationId } from "./features/getDomainsByCertificationId";
import { getDomainsByFormacodes } from "./features/getDomainsByFormacodes";
import { getDropOutReasons } from "./features/getDropOutReasons";
import { getAvailableFormacodes } from "./features/getFormacodes";
import { getFormacodesByCertificationId } from "./features/getFormacodesByCertificationId";
import { getGoals } from "./features/getGoals";
import { getParcoursCertificationByCertificationId } from "./features/getParcoursCertificationByCertificationId";
import { getRegionById } from "./features/getRegionById";
import { getRegions } from "./features/getRegions";
import { getReorientationReasons } from "./features/getReorientationReasons";
import { getVulnerabilityIndicators } from "./features/getVulnerabilityIndicators";
import { isAapAvailableForCertificationId } from "./features/isAapAvailableForCertificationId";
import { replaceCertification } from "./features/replaceCertification";
import { resetCompetenceBlocsByCertificationId } from "./features/resetCompetenceBlocsByCertificationId";
import { searchCertificationsForAdmin } from "./features/searchCertificationsForAdmin";
import { searchCertificationsForCandidate } from "./features/searchCertificationsForCandidate";
import { searchCertificationsV2ForRegistryManager } from "./features/searchCertificationsV2ForRegistryManager";
import { sendCertificationToRegistryManager } from "./features/sendCertificationToRegistryManager";
import { updateCertificationAdditionalInfo } from "./features/updateCertificationAdditionalInfo";
import { updateCertificationCompetenceBloc } from "./features/updateCertificationCompetenceBloc";
import { updateCertificationDescription } from "./features/updateCertificationDescription";
import { updateCertificationPrerequisites } from "./features/updateCertificationPrerequisites";
import { updateCertificationStructureAndCertificationAuthorities } from "./features/updateCertificationStructureAndCertificationAuthorities";
import { updateCompetenceBlocsByCertificationId } from "./features/updateCompetenceBlocsByCertificationId";
import { validateCertification } from "./features/validateCertification";
import {
  CreateCompetenceBlocInput,
  ReplaceCertificationInput,
  ResetCompetenceBlocsByCertificationIdInput,
  SendCertificationToRegistryManagerInput,
  UpdateCertificationAdditionalInfoInput,
  UpdateCertificationDescriptionInput,
  UpdateCertificationPrerequisitesInput,
  UpdateCertificationStructureAndCertificationAuthoritiesInput,
  UpdateCompetenceBlocInput,
  UpdateCompetenceBlocsInput,
  ValidateCertificationInput,
} from "./referential.types";
import { RNCPCertification, RNCPReferential } from "./rncp/referential";

const unsafeReferentialResolvers = {
  Candidacy: {
    hasMoreThanOneCertificationAvailable: async ({
      id: candidacyId,
    }: {
      id: string;
    }) => {
      const { info } = await searchCertificationsForCandidate({
        candidacyId,
      });
      return info.totalRows > 1;
    },
  },
  Certification: {
    codeRncp: ({ rncpId, codeRncp }: { rncpId: string; codeRncp: string }) =>
      codeRncp || rncpId,
    typeDiplome: ({ rncpTypeDiplome }: { rncpTypeDiplome: string }) =>
      rncpTypeDiplome,
    degree: ({ level }: { level: number }) => getDegreeByLevel({ level }),
    conventionsCollectives: ({ id: certificationId }: { id: string }) =>
      getConventionsCollectivesByCertificationId({ certificationId }),
    competenceBlocs: async (
      {
        id: certificationId,
      }: {
        id: string;
        rncpId: string;
      },
      _payload: unknown,
    ) => getCompetenceBlocsByCertificationId({ certificationId }),
    domains: ({ id: certificationId }: { id: string }) =>
      getDomainsByCertificationId({ certificationId }),
    prerequisites: ({ id: certificationId }: { id: string }) =>
      getCertificationPrerequisitesByCertificationId({ certificationId }),
    additionalInfo: ({ id: certificationId }: { id: string }) =>
      getAdditionalInfoByCertificationId({ certificationId }),
    isAapAvailable: ({ id: certificationId }: { id: string }) =>
      isAapAvailableForCertificationId({ certificationId }),
    parcours: (
      { id: certificationId }: { id: string },
      {
        offset,
        limit,
        searchFilter,
        certificationAuthorityIdFilter,
      }: {
        offset?: number;
        limit?: number;
        searchFilter?: string;
        certificationAuthorityIdFilter?: string;
      },
    ) =>
      getParcoursCertificationByCertificationId({
        certificationId,
        searchFilter,
        certificationAuthorityIdFilter,
        offset,
        limit,
      }),
    formacodes: ({ id: certificationId }: { id: string }) =>
      getFormacodesByCertificationId({ certificationId }),
  },
  CertificationAdditionalInfo: {
    dossierDeValidationTemplate: async ({
      dossierDeValidationTemplateFileId,
    }: {
      dossierDeValidationTemplateFileId: string;
    }) => {
      const file = await getFileNameAndUrl({
        fileId: dossierDeValidationTemplateFileId,
      });
      if (!file?.url) {
        return null;
      }

      return file;
    },
    additionalDocuments: ({
      id: certificationAdditionalInfoId,
    }: {
      id: string;
    }) =>
      getAdditionalDocumentsFilaNamesAndUrlsByCertificationAdditionalInfoId({
        certificationAdditionalInfoId,
      }),
  },
  FCCertification: {
    DOMAINS: ({
      FORMACODES,
    }: {
      FORMACODES: RNCPCertification["FORMACODES"];
    }) => getDomainsByFormacodes({ FORMACODES }),
  },
  CertificationCompetenceBloc: {
    competences: ({ id: certificationCompetenceBlocId }: { id: string }) =>
      getCertificationCompetencesByBlocId({ certificationCompetenceBlocId }),
    certification: ({ certificationId }: { certificationId: string }) =>
      getCertificationById({ certificationId }),
  },
  Department: {
    region: ({ regionId }: { regionId: string }) =>
      getRegionById({ id: regionId }),
  },
  EtablissementDiffusible: {
    qualiopiStatus: ({ siret }: { siret: string }) =>
      findQualiopiStatus({ siret }),
  },
  Etablissement: {
    qualiopiStatus: ({ siret }: { siret: string }) =>
      findQualiopiStatus({ siret }),
    kbis: ({ siret }: { siret: string }) => findKbis({ siret }),
  },
  Formacode: {
    countOfChildren: ({ parentCode }: { parentCode: string }) =>
      getCountOfChildrenByParentCode({ parentCode }),
  },
  Query: {
    getReferential: async (_: any, _payload: any) => {
      const goals = await getGoals();

      return {
        goals: goals,
      };
    },
    searchCertificationsForCandidate: async (
      _: any,
      payload: {
        offset?: number;
        limit?: number;
        organismId?: string;
        searchText?: string;
        candidacyId?: string;
        cohorteVaeCollectiveIdFilter?: string;
      },
    ) => searchCertificationsForCandidate(payload),
    searchCertificationsForAdmin: (_: any, payload: any) =>
      searchCertificationsForAdmin({
        offset: payload.offset,
        limit: payload.limit,
        searchText: payload.searchText,
        status: payload.status,
        visible: payload.visible,
        certificationAuthorityIdFilter: payload.certificationAuthorityIdFilter,
        certificationAuthorityStructureIdFilter:
          payload.certificationAuthorityStructureIdFilter,
        certificationAuthorityLocalAccountIdFilter:
          payload.certificationAuthorityLocalAccountIdFilter,
      }),
    searchCertificationsV2ForRegistryManager: (
      _: any,
      payload: any,
      context: GraphqlContext,
    ) =>
      searchCertificationsV2ForRegistryManager({
        userKeycloakId: context.auth.userInfo?.sub || "",
        offset: payload.offset,
        limit: payload.limit,
        searchText: payload.searchText,
        status: payload.status,
        visible: payload.visible,
      }),
    getCertification: (
      _: unknown,
      { certificationId }: { certificationId: string },
    ) => getCertificationById({ certificationId }),
    getRegions,
    getDepartments: (
      _: unknown,
      { elligibleVAE }: { elligibleVAE?: boolean },
    ) => getDepartments({ elligibleVAE }),
    getDegrees,
    getVulnerabilityIndicators,
    getDropOutReasons,
    getReorientationReasons,
    getConventionCollectives: () =>
      prismaClient.conventionCollective.findMany(),
    getFCCertification: (_: unknown, { rncp }: { rncp: string }) =>
      RNCPReferential.getInstance().findOneByRncp(rncp),
    getCountries: () =>
      prismaClient.country.findMany({
        orderBy: {
          label: "asc",
        },
      }),
    getEtablissement: (_: unknown, { siret }: { siret: string }) =>
      findEtablissementDiffusible({ siret }),
    getEtablissementAsAdmin: (_: unknown, { siret }: { siret: string }) =>
      findEtablissement({ siret }),
    getFormacodes: () => getAvailableFormacodes(),
    getCertifications: (
      _: any,
      payload: {
        active?: boolean;
        filters?: {
          domaines?: string[];
          branches?: string[];
          levels?: number[];
        };
      },
    ) => getCertifications(payload.active, payload.filters),
    getCandidacyFinancingMethods,
    getCertificationCompetenceBloc: (
      _: unknown,
      {
        certificationCompetenceBlocId,
      }: {
        certificationCompetenceBlocId: string;
      },
    ) => getCertificationCompetenceBlocById({ certificationCompetenceBlocId }),
  },
  Mutation: {
    referential_updateCompetenceBlocsByCertificationId: (
      _parent: unknown,
      { input }: { input: UpdateCompetenceBlocsInput },
    ) => updateCompetenceBlocsByCertificationId(input),
    referential_createCertificationCompetenceBloc: (
      _parent: unknown,
      { input }: { input: CreateCompetenceBlocInput },
    ) => createCertificationCompetenceBloc(input),
    referential_updateCertificationCompetenceBloc: (
      _parent: unknown,
      { input }: { input: UpdateCompetenceBlocInput },
    ) => updateCertificationCompetenceBloc(input),
    referential_deleteCertificationCompetenceBloc: (
      _parent: unknown,
      {
        certificationId,
        certificationCompetenceBlocId,
      }: { certificationId: string; certificationCompetenceBlocId: string },
    ) =>
      deleteCertificationCompetenceBloc({
        certificationId,
        certificationCompetenceBlocId,
      }),
    referential_addCertification: (
      _parent: unknown,
      { input }: { input: { codeRncp: string } },
    ) => addCertification(input),
    referential_replaceCertification: (
      _parent: unknown,
      { input }: { input: ReplaceCertificationInput },
    ) => replaceCertification(input),
    referential_updateCertificationStructureAndCertificationAuthorities: (
      _parent: unknown,
      {
        input,
      }: {
        input: UpdateCertificationStructureAndCertificationAuthoritiesInput;
      },
    ) => updateCertificationStructureAndCertificationAuthorities(input),
    referential_sendCertificationToRegistryManager: (
      _parent: unknown,
      { input }: { input: SendCertificationToRegistryManagerInput },
    ) => sendCertificationToRegistryManager(input),
    referential_resetCompetenceBlocsByCertificationId: (
      _parent: unknown,
      { input }: { input: ResetCompetenceBlocsByCertificationIdInput },
    ) => resetCompetenceBlocsByCertificationId(input),
    referential_updateCertificationPrerequisites: (
      _parent: unknown,
      { input }: { input: UpdateCertificationPrerequisitesInput },
    ) => updateCertificationPrerequisites(input),
    referential_updateCertificationDescription: (
      _parent: unknown,
      { input }: { input: UpdateCertificationDescriptionInput },
    ) => updateCertificationDescription(input),
    referential_validateCertification: (
      _parent: unknown,
      { input }: { input: ValidateCertificationInput },
    ) => validateCertification(input),
    referential_updateCertificationAdditionalInfo: (
      _parent: unknown,
      { input }: { input: UpdateCertificationAdditionalInfoInput },
    ) => updateCertificationAdditionalInfo(input),
  },
};

export const referentialResolvers = withPolicies(unsafeReferentialResolvers, {
  // Champ d'une candidature déjà protégée par la policy de son parent.
  Candidacy: { hasMoreThanOneCertificationAvailable: isAnyone },
  // Référentiel public : consulté sans connexion par le site vitrine et l'app candidat.
  Certification: {
    codeRncp: isAnyone,
    typeDiplome: isAnyone,
    degree: isAnyone,
    conventionsCollectives: isAnyone,
    competenceBlocs: isAnyone,
    domains: isAnyone,
    prerequisites: isAnyone,
    additionalInfo: isAnyone,
    isAapAvailable: isAnyone,
    parcours: isAnyone,
    formacodes: isAnyone,
  },
  CertificationAdditionalInfo: {
    dossierDeValidationTemplate: isAnyone,
    additionalDocuments: isAnyone,
  },
  FCCertification: { DOMAINS: isAnyone },
  CertificationCompetenceBloc: {
    competences: isAnyone,
    certification: isAnyone,
  },
  Department: { region: isAnyone },
  // Recherche SIRET publique de l'inscription AAP.
  EtablissementDiffusible: { qualiopiStatus: isAnyone },
  // Le type `Etablissement` n'est renvoyé que par des resolvers déjà réservés à l'admin.
  Etablissement: { qualiopiStatus: isAnyone, kbis: isAnyone },
  Formacode: { countOfChildren: isAnyone },
  Query: {
    getReferential: isAnyone,
    searchCertificationsForCandidate: isAnyone,
    searchCertificationsForAdmin: isAdmin,
    searchCertificationsV2ForRegistryManager: [
      hasRole(["admin", "manage_certification_registry"]),
    ],
    getCertification: isAnyone,
    getRegions: isAnyone,
    getDepartments: isAnyone,
    getDegrees: isAnyone,
    getVulnerabilityIndicators: isAnyone,
    getDropOutReasons: isAnyone,
    getReorientationReasons: isAnyone,
    getConventionCollectives: isAnyone,
    getFCCertification: isAnyone,
    getCountries: isAnyone,
    getEtablissement: isAnyone,
    getEtablissementAsAdmin: isAdmin,
    getFormacodes: isAnyone,
    getCertifications: isAnyone,
    getCandidacyFinancingMethods: isAnyone,
    getCertificationCompetenceBloc: isAnyone,
  },
  Mutation: {
    referential_updateCompetenceBlocsByCertificationId: isAdmin,
    referential_createCertificationCompetenceBloc: isAdmin,
    referential_updateCertificationCompetenceBloc:
      isAdminOrCertificationRegistryManagerOfCertification,
    referential_deleteCertificationCompetenceBloc: isAdmin,
    referential_addCertification: isAdmin,
    referential_replaceCertification:
      isAdminOrCertificationRegistryManagerOfCertification,
    referential_updateCertificationStructureAndCertificationAuthorities:
      isAdmin,
    referential_sendCertificationToRegistryManager: isAdmin,
    referential_resetCompetenceBlocsByCertificationId: isAdmin,
    referential_updateCertificationPrerequisites:
      isAdminOrCertificationRegistryManagerOfCertification,
    referential_updateCertificationDescription:
      isAdminOrCertificationRegistryManagerOfCertification,
    referential_validateCertification:
      isAdminOrCertificationRegistryManagerOfCertification,
    referential_updateCertificationAdditionalInfo:
      isAdminOrCertificationRegistryManagerOfCertification,
  },
});
