import {
  MaisonMereAAPLegalInformationDocumentsDecisionEnum,
  Organism,
  StatutValidationInformationsJuridiquesMaisonMereAAP,
} from "@prisma/client";
import mercurius from "mercurius";

import {
  FunctionalCodeError,
  FunctionalError,
} from "@/modules/shared/error/functionalError";
import { logger } from "@/modules/shared/logger/logger";
import { NOT_AUTHORIZED } from "@/modules/shared/security/messages";
import { hasRole } from "@/modules/shared/security/middlewares";
import { isAdmin, isAnyone } from "@/modules/shared/security/presets";
import { withPolicies } from "@/modules/shared/security/withPolicies";

import {
  buildAAPAuditLogUserInfoFromContext,
  logAAPAuditEvent,
} from "../aap-log/features/logAAPAuditEvent";
import { getAccountById } from "../account/features/getAccount";
import { getOrganismsByAccountId } from "../certification-authority/features/getOrganismsByAccountId";
import { getConventionCollectiveById } from "../referential/features/getConventionCollectiveById";
import { getDegreeById } from "../referential/features/getDegreeByid";

import {
  sendLegalInformationDocumentsApprovalEmail,
  sendLegalInformationDocumentsUpdateNeededEmail,
  sendLegalInformationNonConformityEmail,
  sendLegalInformationTotalUpdateRequestEmail,
} from "./emails/sendLegalInformationDocumentsDecisionEmail";
import { acceptCgu } from "./features/acceptCgu";
import { adminCreateMaisonMereAAPLegalInformationValidationDecision } from "./features/adminCreateMaisonMereAAPLegalInformationValidationDecision";
import { adminUpdateLegalInformationValidationStatus } from "./features/adminUpdateMaisonMereAAP";
import { buildLegalInformationAapComment } from "./features/buildLegalInformationAapComment";
import { createLieuAccueilInfo } from "./features/createLieuAccueilInfo";
import { createOrganismAccount } from "./features/createOrganismAccount";
import { createOrUpdateOnSiteOrganismGeneralInformation } from "./features/createOrUpdateOnSiteOrganismGeneralInformation";
import { createOrUpdateRemoteOrganismGeneralInformation } from "./features/createOrUpdateRemoteOrganismGeneralInformation";
import { deleteLieuAccueil } from "./features/deleteLieuAccueil";
import { deleteOldMaisonMereAAPLegalInformationDocuments } from "./features/deleteOldMaisonMereAAPLegalInformationDocuments";
import { disableCompteCollaborateur } from "./features/disableCompteCollaborateur";
import { findOrganismOnDegreeByOrganismId } from "./features/findOrganismOnDegreeByOrganismId";
import { getAccountsByOrganismId } from "./features/getAccountsByOrganismId";
import { getCompteCollaborateurById } from "./features/getCompteCollaborateurById";
import { getComptesCollaborateursByMaisonMereAAPId } from "./features/getComptesCollaborateursByMaisonMereAAPId";
import { getLastProfessionalCgu } from "./features/getLastProfessionalCgu";
import { getMaisonMereAAPByGestionnaireAccountIdOrCollaborateurAccountId } from "./features/getMaisonMereAAPByGestionnaireAccountIdOrCollaborateurAccountId";
import { getMaisonMereAAPById } from "./features/getMaisonMereAAPId";
import { getMaisonMereAAPLegalInformationDocumentFileNameUrlAndMimeType } from "./features/getMaisonMereAAPLegalInformationDocumentFileNameUrlAndMimeType";
import { getMaisonMereAAPLegalInformationDocuments } from "./features/getMaisonMereAAPLegalInformationDocuments";
import { getMaisonMereAAPLegalInformationDocumentsDecisionsByMaisonMereAAPIdAndDecision } from "./features/getMaisonMereAAPLegalInformationDocumentsDecisionsByMaisonMereAAPIdAndDecision";
import { getMaisonMereAAPOnConventionCollectives } from "./features/getMaisonMereAAPOnConventionCollectives";
import { getMaisonMereAAPs } from "./features/getMaisonMereAAPs";
import { getMetabaseIframeUrl } from "./features/getMetabaseIframeUrl";
import { getOrganismById } from "./features/getOrganism";
import { getOrganismCcnsByOrganismId } from "./features/getOrganismCcnsByOrganismId";
import { getOrganismCertificationsByOrganismId } from "./features/getOrganismCertificationsByOrganismId";
import { getOrganismFormacodesByOrganismId } from "./features/getOrganismFormacodesByOrganismId";
import { getOrganismsByMaisonAAPId } from "./features/getOrganismsByMaisonAAPId";
import { getPaginatedComptesCollaborateursByMaisonMereAAPId } from "./features/getPaginatedComptesCollaborateursByMaisonMereAAPId";
import { getPaginatedOrganismsByMaisonMereAAPId } from "./features/getPaginatedOrganismsByMaisonMereAAPId";
import { getRemoteZonesByOrganismId } from "./features/getRemoteZonesByOrganismId";
import { isCompanySiretAlreadyUsed } from "./features/isCompanySiretAlreadyUsed";
import { isOrganismAttachedToCertifications } from "./features/isOrganismAttachedToCertifications";
import { isOrganismVisibleInCandidateSearchResults } from "./features/isOrganismVisibleInCandidateSearchResults";
import { isPendingGestionnaireEmailAlreadyUsed } from "./features/isPendingGestionnaireEmailAlreadyUsed";
import { organismHasCandidacies } from "./features/organismHasCandidacies";
import { searchOrganisms } from "./features/searchOrganisms";
import { updateFermePourAbsenceOuConges } from "./features/updateFermePourAbsenceOuConges";
import { updateMaisonMereAAPFinancingMethods } from "./features/updateMaisonMereAAPFinancingMethods";
import { updateMaisonMereAccountSetup } from "./features/updateMaisonMereAccountSetup";
import { updateMaisonMereIsSignalized } from "./features/updateMaisonMereIsSignalized";
import { updateMaisonMereLegalInformation } from "./features/updateMaisonMereLegalInformation";
import { updateMaisonMereOrganismsIsActive } from "./features/updateMaisonMereOrganismsIsActive";
import { updateOrganismAccount } from "./features/updateOrganismAccount";
import { updateOrganismDegreesAndFormacodes } from "./features/updateOrganismDegreesAndFormacodes";
import { updateOrganismDisponiblePourVaeCollective } from "./features/updateOrganismDisponiblePourVaeCollective";
import { updatePositionnementCollaborateur } from "./features/updatePositionnementCollaborateur";
import {
  CreateLieuAccueilInfoInput,
  CreateOrganismAccountInput,
  OrganismInformationsCommerciales,
  UpdatePositionnementCollaborateurInput,
  RemoteZone,
  UpdateMaisonMereAAPLegalValidationInput,
  UpdateMaisonMereLegalInformationInput,
  UpdateOrganimsAccountInput,
} from "./organism.types";
import { isGestionnaireOfMaisonMereAAP } from "./security/isGestionnaireOfMaisonMereAAP.security";
import { isOwnerOrCanManageOrganism } from "./security/isOwnerOrCanManageOrganism.security";
import {
  isAdminOrGestionnaireOfMaisonMereAAP,
  isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganism,
  isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganismByIdArg,
  isAdminOrGestionnaireOfMaisonMereAAPOrOwnerOfAccount,
  isAdminOrGestionnaireOrSousCompteOfCommanditaireVaeCollective,
} from "./security/presets";

const unsafeResolvers = {
  Account: {
    maisonMereAAP: ({ id: accountId }: { id: string }) =>
      getMaisonMereAAPByGestionnaireAccountIdOrCollaborateurAccountId({
        accountId,
      }),
    organisms: ({ id: accountId }: { id: string }) =>
      getOrganismsByAccountId({ accountId }),
  },
  Organism: {
    maisonMereAAP: (organism: Organism) => {
      if (!organism.maisonMereAAPId) {
        return null;
      }
      return getMaisonMereAAPById({
        id: organism.maisonMereAAPId,
      });
    },
    managedDegrees: (organism: Organism) =>
      findOrganismOnDegreeByOrganismId({ organismId: organism.id }),
    accounts: ({ id: organismId }: Organism) =>
      getAccountsByOrganismId({
        organismId,
      }),
    formacodes: ({ id: organismId }: Organism) =>
      getOrganismFormacodesByOrganismId({
        organismId,
      }),
    conventionCollectives: ({ id: organismId }: Organism) =>
      getOrganismCcnsByOrganismId({
        organismId,
      }),
    certifications: async ({ id: organismId }: Organism) =>
      getOrganismCertificationsByOrganismId({
        organismId,
      }),
    remoteZones: async ({ id: organismId }: Organism) =>
      (
        await getRemoteZonesByOrganismId({
          organismId,
        })
      ).map((r) => r.remoteZone),
    isVisibleInCandidateSearchResults: async ({ id: organismId }: Organism) =>
      await isOrganismVisibleInCandidateSearchResults({
        organismId,
      }),
    isMaisonMereMCFCompatible: async ({ maisonMereAAPId }: Organism) =>
      (
        await getMaisonMereAAPById({
          id: maisonMereAAPId || "",
        })
      )?.isMCFCompatible,
    hasCandidacies: async ({ id: organismId }: Organism) =>
      organismHasCandidacies({ organismId }),
  },
  OrganismOnDegree: {
    degree: (organismOnDegree: { degreeId: string }) =>
      getDegreeById({ degreeId: organismOnDegree.degreeId }),
  },
  MaisonMereAAP: {
    maisonMereAAPOnConventionCollectives: ({ id }: { id: string }) =>
      getMaisonMereAAPOnConventionCollectives({ maisonMereAAPId: id }),
    organisms: ({ id: maisonMereAAPId }: { id: string }) =>
      getOrganismsByMaisonAAPId({ maisonMereAAPId }),
    paginatedOrganisms: (
      { id: maisonMereAAPId }: { id: string },
      {
        offset,
        limit,
        searchFilter,
        collaborateurAccountIdFilter,
      }: {
        offset: number;
        limit: number;
        searchFilter?: string;
        collaborateurAccountIdFilter?: string;
      },
    ) =>
      getPaginatedOrganismsByMaisonMereAAPId({
        maisonMereAAPId,
        searchFilter,
        collaborateurAccountIdFilter,
        offset,
        limit,
      }),
    gestionnaire: ({
      gestionnaireAccountId,
    }: {
      gestionnaireAccountId: string;
    }) => getAccountById({ id: gestionnaireAccountId }),
    comptesCollaborateurs: ({ id: maisonMereAAPId }: { id: string }) =>
      getComptesCollaborateursByMaisonMereAAPId({ maisonMereAAPId }),
    paginatedComptesCollaborateurs: (
      { id: maisonMereAAPId }: { id: string },
      {
        offset,
        limit,
        searchFilter,
      }: {
        offset: number;
        limit: number;
        searchFilter?: string;
      },
    ) =>
      getPaginatedComptesCollaborateursByMaisonMereAAPId({
        maisonMereAAPId,
        searchFilter,
        offset,
        limit,
      }),
    legalInformationDocumentsDecisions: (
      { id }: { id: string },
      {
        input,
      }: {
        input?: {
          decision?: MaisonMereAAPLegalInformationDocumentsDecisionEnum;
        };
      },
    ) =>
      getMaisonMereAAPLegalInformationDocumentsDecisionsByMaisonMereAAPIdAndDecision(
        {
          maisonMereAAPId: id,
          decision: input?.decision,
        },
      ),
    legalInformationDocuments: ({ id: maisonMereAAPId }: { id: string }) =>
      getMaisonMereAAPLegalInformationDocuments({
        maisonMereAAPId,
      }),
    cgu: async ({
      cguVersion,
      cguAcceptedAt,
    }: {
      cguVersion: number;
      cguAcceptedAt?: Date;
    }) => ({
      version: cguVersion,
      acceptedAt: cguAcceptedAt,
      isLatestVersion: (await getLastProfessionalCgu())?.version == cguVersion,
    }),
    metabaseDashboardIframeUrl: async (
      {
        id: maisonMereAAPId,
      }: {
        id: string;
      },
      _params: unknown,
    ) => getMetabaseIframeUrl(maisonMereAAPId),
  },
  MaisonMereAAPLegalInformationDocuments: {
    siretAlreadyUsed: async ({
      maisonMereAAPId,
      siret,
    }: {
      maisonMereAAPId: string;
      siret: string | null;
    }) =>
      !!siret &&
      isCompanySiretAlreadyUsed({
        companySiret: siret,
        excludedMaisonMereAAPId: maisonMereAAPId,
      }),
    gestionnaireEmailAlreadyUsed: async ({
      maisonMereAAPId,
      gestionnaireEmail,
    }: {
      maisonMereAAPId: string;
      gestionnaireEmail: string | null;
    }) =>
      !!gestionnaireEmail &&
      isPendingGestionnaireEmailAlreadyUsed({
        maisonMereAAPId,
        gestionnaireEmail,
      }),
    attestationURSSAFFile: async (
      { maisonMereAAPId }: { maisonMereAAPId: string },
      _: unknown,
    ) =>
      getMaisonMereAAPLegalInformationDocumentFileNameUrlAndMimeType({
        maisonMereAAPId,
        fileType: "attestationURSSAFFile",
      }),
    justificatifIdentiteDirigeantFile: async (
      {
        maisonMereAAPId,
      }: {
        maisonMereAAPId: string;
      },
      _: unknown,
    ) =>
      getMaisonMereAAPLegalInformationDocumentFileNameUrlAndMimeType({
        maisonMereAAPId,
        fileType: "justificatifIdentiteDirigeantFile",
      }),
    lettreDeDelegationFile: async (
      {
        maisonMereAAPId,
      }: {
        maisonMereAAPId: string;
      },
      _: unknown,
    ) =>
      getMaisonMereAAPLegalInformationDocumentFileNameUrlAndMimeType({
        maisonMereAAPId,
        fileType: "lettreDeDelegationFile",
      }),
    justificatifIdentiteDelegataireFile: async (
      {
        maisonMereAAPId,
      }: {
        maisonMereAAPId: string;
      },
      _: unknown,
    ) =>
      getMaisonMereAAPLegalInformationDocumentFileNameUrlAndMimeType({
        maisonMereAAPId,
        fileType: "justificatifIdentiteDelegataireFile",
      }),
  },
  MaisonMereAAPOnConventionCollective: {
    ccn: ({ ccnId }: { ccnId: string }) =>
      getConventionCollectiveById({ ccnId }),
  },
  Mutation: {
    organism_createOrUpdateRemoteOrganismGeneralInformation: async (
      _parent: unknown,
      params: {
        organismId: string;
        informationsCommerciales: {
          nomPublic: string | null;
          telephone: string | null;
          siteInternet: string | null;
          emailContact: string | null;
        };
        remoteZones: RemoteZone[];
      },
      context: GraphqlContext,
    ) =>
      createOrUpdateRemoteOrganismGeneralInformation({
        ...params,
        userInfo: buildAAPAuditLogUserInfoFromContext(context),
      }),

    organism_createOrUpdateOnSiteOrganismGeneralInformation: async (
      _parent: unknown,
      params: {
        organismId: string;
        informationsCommerciales: OrganismInformationsCommerciales;
      },
      context: GraphqlContext,
    ) =>
      createOrUpdateOnSiteOrganismGeneralInformation({
        ...params,
        userInfo: buildAAPAuditLogUserInfoFromContext(context),
      }),

    organism_updateFermePourAbsenceOuConges: async (
      _parent: unknown,
      {
        organismId,
        fermePourAbsenceOuConges,
      }: {
        organismId: string;
        fermePourAbsenceOuConges: boolean;
      },
      context: GraphqlContext,
    ) =>
      updateFermePourAbsenceOuConges({
        organismId,
        fermePourAbsenceOuConges,
        userInfo: buildAAPAuditLogUserInfoFromContext(context),
      }),
    organism_updateDisponiblePourVaeCollective: async (
      _parent: unknown,
      {
        organismId,
        disponiblePourVaeCollective,
      }: {
        organismId: string;
        disponiblePourVaeCollective: boolean;
      },
    ) =>
      updateOrganismDisponiblePourVaeCollective({
        organismId,
        disponiblePourVaeCollective,
      }),
    organism_createLieuAccueilInfo: async (
      _parent: unknown,
      {
        data,
      }: {
        data: CreateLieuAccueilInfoInput;
      },
      context: GraphqlContext,
    ) => {
      if (context.auth.userInfo?.sub == undefined) {
        throw new FunctionalError(
          FunctionalCodeError.TECHNICAL_ERROR,
          "Not authorized",
        );
      }

      return createLieuAccueilInfo({
        params: data,
        keycloakId: context.auth.userInfo.sub,
        userInfo: buildAAPAuditLogUserInfoFromContext(context),
      });
    },

    organism_acceptCgu: async (
      _parent: unknown,
      _: any,
      context: GraphqlContext,
    ) =>
      acceptCgu({
        hasRole: context.auth.hasRole,
        keycloakId: context.auth.userInfo?.sub || "",
      }),
    organism_updateOrganismDegreesAndFormacodes: async (
      _parent: unknown,
      params: {
        data: {
          organismId: string;
          degreeIds: string[];
          formacodeIds: string[];
          conventionCollectiveIds: string[];
        };
      },
      context: GraphqlContext,
    ) =>
      updateOrganismDegreesAndFormacodes({
        organismId: params.data.organismId,
        degreeIds: params.data.degreeIds,
        formacodeIds: params.data.formacodeIds,
        conventionCollectiveIds: params.data.conventionCollectiveIds,
        userInfo: buildAAPAuditLogUserInfoFromContext(context),
      }),
    organism_createAccount: async (
      _parent: unknown,
      {
        data,
      }: {
        data: CreateOrganismAccountInput;
      },
      context: GraphqlContext,
    ) =>
      createOrganismAccount({
        ...data,
        userInfo: buildAAPAuditLogUserInfoFromContext(context),
      }),
    organism_updateOrganismAccount: async (
      _parent: unknown,
      {
        data,
      }: {
        data: UpdateOrganimsAccountInput;
      },
      context: GraphqlContext,
    ) =>
      updateOrganismAccount({
        ...data,
        userInfo: buildAAPAuditLogUserInfoFromContext(context),
      }),
    organism_updateLegalInformationValidationDecision: async (
      _parent: unknown,
      params: {
        data: UpdateMaisonMereAAPLegalValidationInput;
      },
      context: GraphqlContext,
    ) => {
      if (context.auth.userInfo?.sub == undefined) {
        throw new Error(NOT_AUTHORIZED);
      }

      // Lue avant toute écriture: la validation supprime la demande en cours.
      const pendingRequest = await getMaisonMereAAPLegalInformationDocuments({
        maisonMereAAPId: params.data.maisonMereAAPId,
      });

      // Demande absente (parcours historique): comportement d'origine.
      const isSelfServiceRefusal =
        params.data.decision === "DEMANDE_DE_PRECISION" &&
        pendingRequest?.isTotalUpdate === false;

      const statutValidationInformationsJuridiquesMaisonMereAAP =
        params.data.decision === "VALIDE" || isSelfServiceRefusal
          ? "A_JOUR"
          : "A_METTRE_A_JOUR";

      const userInfo = buildAAPAuditLogUserInfoFromContext(context);
      const nonConformityMotives = params.data.nonConformityMotives ?? [];

      // L'application des valeurs en attente peut échouer (SIRET ou email déjà
      // utilisé): on ne trace la décision qu'une fois le statut appliqué.
      const maisonMereAAP = await adminUpdateLegalInformationValidationStatus({
        maisonMereAAPId: params.data.maisonMereAAPId,
        maisonMereAAPData: {
          statutValidationInformationsJuridiquesMaisonMereAAP,
        },
        userInfo,
        isValidated: params.data.decision === "VALIDE",
      });

      const decision =
        await adminCreateMaisonMereAAPLegalInformationValidationDecision(
          params.data.maisonMereAAPId,
          {
            decision: params.data.decision,
            internalComment: params.data.internalComment ?? "",
            aapComment: buildLegalInformationAapComment({
              nonConformityMotives,
              freeComment: params.data.aapComment ?? "",
            }),
            aapUpdatedDocumentsAt: params.data.aapUpdatedDocumentsAt,
          },
        );

      // Aucune re-soumission n'est attendue: sans suppression, les pièces
      // d'identité resteraient stockées indéfiniment.
      if (isSelfServiceRefusal) {
        await deleteOldMaisonMereAAPLegalInformationDocuments({
          maisonMereAAPId: params.data.maisonMereAAPId,
        });
      }

      // Jamais invisible sans que la demande soit tracée: c'est elle qui l'explique.
      if (
        params.data.decision === "DEMANDE_DE_MISE_A_JOUR_TOTALE" &&
        params.data.makeInvisible
      ) {
        await updateMaisonMereOrganismsIsActive({
          maisonMereAAPId: params.data.maisonMereAAPId,
          isActive: false,
          userInfo,
        });
      }

      const managerName = `${maisonMereAAP.gestionnaire.firstname} ${maisonMereAAP.gestionnaire.lastname}`;

      if (params.data.decision === "DEMANDE_DE_MISE_A_JOUR_TOTALE") {
        await sendLegalInformationTotalUpdateRequestEmail({
          email: maisonMereAAP.gestionnaire.email,
          structureName: maisonMereAAP.raisonSociale,
        });
      } else if (params.data.decision === "DEMANDE_DE_PRECISION") {
        // Sans motif, la demande vient du parcours historique: courriel inchangé.
        if (nonConformityMotives.length) {
          await sendLegalInformationNonConformityEmail({
            email: maisonMereAAP.gestionnaire.email,
            nonConformityMotives,
            comment: params.data.aapComment ?? "",
          });
        } else {
          await sendLegalInformationDocumentsUpdateNeededEmail({
            email: maisonMereAAP.gestionnaire.email,
            managerName,
            aapComment: decision.aapComment,
          });
        }
      } else if (params.data.decision === "VALIDE") {
        await sendLegalInformationDocumentsApprovalEmail({
          email: maisonMereAAP.gestionnaire.email,
          managerName,
        });
      }

      // Tracé en dernier: un échec d'écriture du journal ne doit empêcher ni
      // l'invisibilisation ni les courriels.
      await logAAPAuditEvent({
        eventType: "MAISON_MERE_LEGAL_INFORMATION_DECISION_TAKEN",
        maisonMereAAPId: params.data.maisonMereAAPId,
        userInfo,
        details: {
          decision: params.data.decision,
          internalComment: params.data.internalComment ?? undefined,
        },
      });

      return decision;
    },
    organism_updateMaisonMereAccountSetup: async (
      _parent: unknown,
      params: {
        data: {
          maisonMereAAPId: string;
          showAccountSetup: boolean;
        };
      },
    ) => updateMaisonMereAccountSetup(params.data),
    organism_updateMaisonMereOrganismsIsActive: async (
      _parent: unknown,
      params: {
        data: {
          maisonMereAAPId: string;
          isActive: boolean;
        };
      },
      context: GraphqlContext,
    ) =>
      updateMaisonMereOrganismsIsActive({
        ...params.data,
        userInfo: buildAAPAuditLogUserInfoFromContext(context),
      }),
    organism_updateMaisonMereIsSignalized: async (
      _parent: unknown,
      params: {
        data: {
          maisonMereAAPId: string;
          isSignalized: boolean;
        };
      },
      context: GraphqlContext,
    ) =>
      updateMaisonMereIsSignalized({
        ...params.data,
        userInfo: buildAAPAuditLogUserInfoFromContext(context),
      }),
    organism_updateMaisonMereLegalInformation: async (
      _parent: unknown,
      params: {
        data: UpdateMaisonMereLegalInformationInput;
      },
      context: GraphqlContext,
    ) =>
      updateMaisonMereLegalInformation({
        ...params.data,
        userInfo: buildAAPAuditLogUserInfoFromContext(context),
      }),
    organism_updateMaisonMereAAPFinancingMethods: async (
      _parent: unknown,
      params: { maisonMereAAPId: string; isMCFCompatible: boolean },
      context: GraphqlContext,
    ) =>
      updateMaisonMereAAPFinancingMethods({
        ...params,
        userInfo: buildAAPAuditLogUserInfoFromContext(context),
      }),
    organism_updatePositionnementCollaborateur: async (
      _parent: unknown,
      params: {
        positionnement: UpdatePositionnementCollaborateurInput;
      },
    ) =>
      updatePositionnementCollaborateur({
        ...params.positionnement,
      }),

    organism_disableCompteCollaborateur: async (
      _parent: unknown,
      params: { maisonMereAAPId: string; accountId: string },
    ) => disableCompteCollaborateur(params),
    organism_deleteLieuAccueil: async (
      _parent: unknown,
      params: { maisonMereAAPId: string; organismId: string },
      context: GraphqlContext,
    ) =>
      deleteLieuAccueil({
        ...params,
        userInfo: buildAAPAuditLogUserInfoFromContext(context),
      }),
  },
  Query: {
    organism_getOrganism: async (
      _parent: unknown,
      params: {
        id: string;
      },
    ) => {
      try {
        // Renvoie null si l'id est inconnu. L'autorisation est portée par la policy.
        return await getOrganismById({ organismId: params.id });
      } catch (e) {
        logger.error(e);
        throw new mercurius.ErrorWithProps((e as Error).message, e as Error);
      }
    },
    organism_getMaisonMereAAPs: async (
      _parent: unknown,
      params: {
        limit?: number;
        offset?: number;
        searchFilter?: string;
        legalValidationStatus?: StatutValidationInformationsJuridiquesMaisonMereAAP;
      },
    ) => getMaisonMereAAPs(params),
    organism_getMaisonMereAAPById: async (
      _parent: unknown,
      params: {
        maisonMereAAPId: string;
      },
    ) => getMaisonMereAAPById({ id: params.maisonMereAAPId }),
    organism_searchOrganisms: async (
      _parent: unknown,
      params: {
        offset?: number;
        limit?: number;
        certificationIds?: string[];
        searchText?: string;
        disponiblePourVaeCollective?: boolean;
      },
    ) => searchOrganisms(params),
    organism_getCompteCollaborateurById: async (
      _parent: unknown,
      params: {
        accountId: string;
      },
    ) => getCompteCollaborateurById({ accountId: params.accountId }),
    organism_isOrganismAttachedToCertifications: async (
      _parent: unknown,
      params: {
        organismId: string;
        certificationIds: string[];
      },
    ) =>
      isOrganismAttachedToCertifications({
        organismId: params.organismId,
        certificationIds: params.certificationIds,
      }),
  },
};

export const organismResolvers = withPolicies(unsafeResolvers, {
  Account: {
    // Lu par le layout privé racine (bandeau CGU) pour tous les rôles connectés.
    maisonMereAAP: isAnyone,
    organisms: isAnyone,
  },
  Organism: {
    maisonMereAAP:
      isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganism,
    accounts: isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganism,
    hasCandidacies:
      isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganism,
    // Lu par reva-candidate lors du choix de l'accompagnateur.
    isMaisonMereMCFCompatible: isAnyone,
    // Données non personnelles, lues via des parents déjà protégés.
    managedDegrees: isAnyone,
    formacodes: isAnyone,
    conventionCollectives: isAnyone,
    certifications: isAnyone,
    remoteZones: isAnyone,
    isVisibleInCandidateSearchResults: isAnyone,
  },
  OrganismOnDegree: {
    // Donnée de référentiel.
    degree: isAnyone,
  },
  MaisonMereAAP: {
    organisms: isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganism,
    paginatedOrganisms:
      isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganism,
    gestionnaire:
      isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganism,
    comptesCollaborateurs:
      isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganism,
    paginatedComptesCollaborateurs:
      isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganism,
    legalInformationDocuments: isAdminOrGestionnaireOfMaisonMereAAP,
    legalInformationDocumentsDecisions: isAdminOrGestionnaireOfMaisonMereAAP,
    metabaseDashboardIframeUrl: [isGestionnaireOfMaisonMereAAP],
    // Lu par le layout privé racine (bandeau CGU) pour tous les rôles connectés.
    cgu: isAnyone,
    // Parent déjà protégé, donnée non personnelle.
    maisonMereAAPOnConventionCollectives: isAnyone,
  },
  MaisonMereAAPLegalInformationDocuments: {
    // Conflit avec une autre structure: information réservée à la vérification admin.
    siretAlreadyUsed: isAdmin,
    gestionnaireEmailAlreadyUsed: isAdmin,
    attestationURSSAFFile: isAdminOrGestionnaireOfMaisonMereAAP,
    justificatifIdentiteDirigeantFile: isAdminOrGestionnaireOfMaisonMereAAP,
    lettreDeDelegationFile: isAdminOrGestionnaireOfMaisonMereAAP,
    justificatifIdentiteDelegataireFile: isAdminOrGestionnaireOfMaisonMereAAP,
  },
  MaisonMereAAPOnConventionCollective: {
    // Parent déjà protégé, donnée non personnelle.
    ccn: isAnyone,
  },
  Mutation: {
    organism_createOrUpdateRemoteOrganismGeneralInformation:
      isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganism,
    organism_createOrUpdateOnSiteOrganismGeneralInformation:
      isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganism,
    organism_updateFermePourAbsenceOuConges: [isOwnerOrCanManageOrganism],
    organism_updateDisponiblePourVaeCollective: [isOwnerOrCanManageOrganism],
    organism_acceptCgu: [hasRole(["gestion_maison_mere_aap"])],
    organism_updateMaisonMereAccountSetup: isAdminOrGestionnaireOfMaisonMereAAP,
    organism_createAccount: isAdminOrGestionnaireOfMaisonMereAAP,
    organism_updateMaisonMereIsSignalized: isAdmin,
    organism_updateMaisonMereLegalInformation: isAdmin,
    organism_updateMaisonMereAAPFinancingMethods:
      isAdminOrGestionnaireOfMaisonMereAAP,
    organism_updatePositionnementCollaborateur:
      isAdminOrGestionnaireOfMaisonMereAAP,
    organism_disableCompteCollaborateur: isAdminOrGestionnaireOfMaisonMereAAP,
    organism_deleteLieuAccueil: isAdminOrGestionnaireOfMaisonMereAAP,
    organism_updateOrganismAccount: isAdminOrGestionnaireOfMaisonMereAAP,
    organism_updateOrganismDegreesAndFormacodes: isAnyone,
    organism_updateMaisonMereOrganismsIsActive: isAdmin,
    organism_updateLegalInformationValidationDecision: isAdmin,
    organism_createLieuAccueilInfo: isAnyone,
  },
  Query: {
    organism_getMaisonMereAAPById: isAdminOrGestionnaireOfMaisonMereAAP,
    organism_searchOrganisms:
      isAdminOrGestionnaireOrSousCompteOfCommanditaireVaeCollective,
    organism_getCompteCollaborateurById:
      isAdminOrGestionnaireOfMaisonMereAAPOrOwnerOfAccount,
    organism_getMaisonMereAAPs: isAdmin,
    organism_getOrganism:
      isAdminOrGestionnaireOfMaisonMereAAPOfOrganismOrOwnerOfOrganismByIdArg,
    organism_isOrganismAttachedToCertifications: isAnyone,
  },
});
