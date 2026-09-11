import {
  CandidacyStatusStep,
  DossierDeValidationStatus,
  EndAccompagnementStatus,
  FeasibilityStatus,
  Prisma,
} from "@prisma/client";

import { processPaginationInfo } from "@/modules/shared/list/pagination";
import { getWhereClauseFromSearchFilter } from "@/modules/shared/search/search";
import { getCohortesVaeCollectivesForConnectedAap } from "@/modules/vae-collective/features/getCohortesVaeCollectivesForConnectedAap";
import { prismaClient } from "@/prisma/client";

import {
  DossierDeValidationStatusFilter,
  FeasibilityStatusFilter,
  GetCandidaciesForAAPInput,
  GetCandidaciesForCertificationAuthorityInput,
  JuryStatusFilter,
  FundingStatusFilter,
  ArchiveStatusFilter,
  AccompagnementStatusFilter,
  TypeAccompagnementStatusFilter,
} from "../candidacy.types";
import { candidacySearchWord } from "../utils/candidacy.helper";

const ALLOWED_CANDIDACY_STATUS_FOR_NON_ADMIN_USERS: CandidacyStatusStep[] = [
  CandidacyStatusStep.VALIDATION,
  CandidacyStatusStep.PRISE_EN_CHARGE,
];

const ALLOWED_CANDIDACY_STATUS_FOR_ADMIN_USERS: CandidacyStatusStep[] = [
  CandidacyStatusStep.PROJET,
  CandidacyStatusStep.VALIDATION,
  CandidacyStatusStep.PRISE_EN_CHARGE,
];

const ALLOWED_TRAINING_STATUS: CandidacyStatusStep[] = [
  CandidacyStatusStep.PARCOURS_ENVOYE,
  CandidacyStatusStep.PARCOURS_CONFIRME,
];

export const getCandidaciesForAAP = async ({
  context,
  offset = 0,
  limit = 10000,
  searchFilter,
  sortByFilter,
  activeCandidacies,
  candidacyStatuses,
  typeAccompagnementStatuses,
  trainingStatuses,
  feasibilityStatuses,
  dossierDeValidationStatuses,
  juryStatuses,
  juryResults,
  fundingStatuses,
  archiveStatuses,
  accompagnementStatuses,
  cohorteVaeCollectiveIds,
  maisonMereAAPId,
}: GetCandidaciesForAAPInput & {
  context: GraphqlContext;
}) => {
  const isAdmin = context.auth.hasRole("admin");
  const keycloakId = context.auth.userInfo?.sub;

  // Get candidacies
  const andClauses: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[] = [
    {
      candidacy: {
        candidateId: { not: null },
      },
    },
  ];

  // Active candidacies filter
  if (activeCandidacies) {
    const activeCandidaciesWhereInput: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[] =
      [];

    activeCandidaciesWhereInput.push({
      candidacy: {
        status: {
          notIn: [CandidacyStatusStep.ARCHIVE],
        },
        candidacyDropOut: null,
        endAccompagnementStatus: {
          notIn: [
            EndAccompagnementStatus.CONFIRMED_BY_CANDIDATE,
            EndAccompagnementStatus.CONFIRMED_BY_ADMIN,
          ],
        },
      },
    });

    andClauses.push({ AND: activeCandidaciesWhereInput });
  }

  // Filters for non-admin users
  if (!isAdmin && keycloakId) {
    andClauses.push({
      candidacy: {
        status: {
          notIn: [CandidacyStatusStep.PROJET],
        },
        organism: {
          OR: [
            {
              organismOnAccounts: {
                some: {
                  account: {
                    keycloakId: keycloakId,
                  },
                },
              },
            },
            {
              maisonMereAAP: {
                gestionnaire: {
                  keycloakId: keycloakId,
                },
              },
            },
          ],
        },
      },
    });
  }

  // Filters for admin users with maisonMereAAPId
  if (isAdmin && maisonMereAAPId) {
    const maisonMereAAP = await prismaClient.maisonMereAAP.findUnique({
      where: { id: maisonMereAAPId },
      select: {
        gestionnaire: {
          select: {
            keycloakId: true,
          },
        },
      },
    });

    if (maisonMereAAP?.gestionnaire.keycloakId) {
      andClauses.push({
        candidacy: {
          organism: {
            maisonMereAAP: {
              gestionnaire: {
                keycloakId: maisonMereAAP?.gestionnaire.keycloakId,
              },
            },
          },
        },
      });
    }
  }

  // Search filter
  if (searchFilter) {
    andClauses.push({
      candidacy: {
        ...getWhereClauseFromSearchFilter(candidacySearchWord, searchFilter),
      },
    });
  }

  // Candidacy status filter
  if (candidacyStatuses && candidacyStatuses.length > 0) {
    const allowedCandidacyStatuses = isAdmin
      ? ALLOWED_CANDIDACY_STATUS_FOR_ADMIN_USERS
      : ALLOWED_CANDIDACY_STATUS_FOR_NON_ADMIN_USERS;

    for (const status of candidacyStatuses) {
      if (!allowedCandidacyStatuses.includes(status)) {
        throw new Error(`Le filtre candidacy: '${status}' n'est pas autorisé`);
      }
    }

    andClauses.push({
      candidacy: {
        status: {
          in: candidacyStatuses,
        },
      },
    });
  }

  if (
    isAdmin &&
    typeAccompagnementStatuses &&
    typeAccompagnementStatuses.length > 0
  ) {
    const typeAccompagnementWhereInput: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[] =
      [];

    const filteredTypeAccompagnementStatuses =
      typeAccompagnementStatuses.filter(
        (status) => status !== TypeAccompagnementStatusFilter.VAE_COLLECTIVE,
      );

    if (filteredTypeAccompagnementStatuses.length > 0) {
      typeAccompagnementWhereInput.push({
        candidacy: {
          typeAccompagnement: {
            in: filteredTypeAccompagnementStatuses,
          },
        },
      });
    }

    if (
      typeAccompagnementStatuses.includes(
        TypeAccompagnementStatusFilter.VAE_COLLECTIVE,
      )
    ) {
      typeAccompagnementWhereInput.push({
        candidacy: {
          cohorteVaeCollectiveId: {
            not: null,
          },
        },
      });
    }

    andClauses.push({ OR: typeAccompagnementWhereInput });
  }

  // Training status filter
  if (trainingStatuses && trainingStatuses.length > 0) {
    const allowedTrainingStatuses = ALLOWED_TRAINING_STATUS;

    for (const status of trainingStatuses) {
      if (!allowedTrainingStatuses.includes(status)) {
        throw new Error(`Le filtre training: '${status}' n'est pas autorisé`);
      }
    }

    andClauses.push({
      candidacy: {
        status: {
          in: trainingStatuses,
        },
      },
    });
  }

  // Feasibility status filter
  if (feasibilityStatuses && feasibilityStatuses.length > 0) {
    const feasibilityWhereInput: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[] =
      [];

    if (
      feasibilityStatuses.includes(FeasibilityStatusFilter.ENVOYE_AU_CANDIDAT)
    ) {
      feasibilityWhereInput.push({
        OR: [
          {
            feasibility: {
              decision: FeasibilityStatus.DRAFT,
              dematerializedFeasibilityFile: {
                sentToCandidateAt: { not: null },
                candidateConfirmationAt: null,
                swornStatementFileId: null,
              },
            },
          },
          {
            feasibility: {
              decision: FeasibilityStatus.INCOMPLETE,
            },
            incompleteDffIsSentToCandidate: true,
          },
        ],
      });
    }

    if (
      feasibilityStatuses.includes(
        FeasibilityStatusFilter.PARTIELLEMENT_VALIDE_PAR_LE_CANDIDAT,
      )
    ) {
      feasibilityWhereInput.push({
        OR: [
          {
            feasibility: {
              decision: FeasibilityStatus.DRAFT,
              dematerializedFeasibilityFile: {
                candidateConfirmationAt: { not: null },
                swornStatementFileId: null,
              },
            },
          },
          {
            feasibility: {
              decision: FeasibilityStatus.INCOMPLETE,
            },
            incompleteDffIsPartiallyConfirmedByCandidate: true,
          },
        ],
      });
    }

    if (
      feasibilityStatuses.includes(
        FeasibilityStatusFilter.VALIDE_PAR_LE_CANDIDAT,
      )
    ) {
      feasibilityWhereInput.push({
        OR: [
          {
            feasibility: {
              decision: FeasibilityStatus.DRAFT,
              dematerializedFeasibilityFile: {
                candidateConfirmationAt: { not: null },
                swornStatementFileId: { not: null },
              },
            },
          },
          {
            feasibility: {
              decision: FeasibilityStatus.INCOMPLETE,
            },
            incompleteDffIsConfirmedByCandidate: true,
          },
        ],
      });
    }

    if (
      feasibilityStatuses.includes(
        FeasibilityStatusFilter.ENVOYE_AU_CERTIFICATEUR,
      )
    ) {
      feasibilityWhereInput.push({
        candidacy: {
          status: {
            in: [
              CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
              CandidacyStatusStep.DOSSIER_FAISABILITE_COMPLET,
            ],
          },
        },
      });
    }

    if (feasibilityStatuses.includes(FeasibilityStatusFilter.INCOMPLET)) {
      feasibilityWhereInput.push({
        feasibility: {
          decision: "INCOMPLETE",
        },
        incompleteDffIsSentToCandidate: false,
        incompleteDffIsConfirmedByCandidate: false,
        incompleteDffIsPartiallyConfirmedByCandidate: false,
      });
    }

    if (feasibilityStatuses.includes(FeasibilityStatusFilter.RECEVABLE)) {
      feasibilityWhereInput.push({
        feasibility: {
          decision: "ADMISSIBLE",
        },
      });
    }

    andClauses.push({
      OR: feasibilityWhereInput,
    });
  }

  // Dossier de validation status filter
  if (dossierDeValidationStatuses && dossierDeValidationStatuses.length > 0) {
    const dossierDeValidationWhereInput: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[] =
      [];

    if (
      dossierDeValidationStatuses.includes(
        DossierDeValidationStatusFilter.TRANSMETTRE,
      )
    ) {
      dossierDeValidationWhereInput.push({
        feasibility: {
          decision: "ADMISSIBLE",
        },
        dossierDeValidation: null,
      });
    }
    if (
      dossierDeValidationStatuses.includes(
        DossierDeValidationStatusFilter.ENVOYE,
      )
    ) {
      dossierDeValidationWhereInput.push({
        dossierDeValidation: {
          OR: [
            {
              decision: "PENDING",
            },
            {
              decision: "COMPLETE",
            },
          ],
        },
      });
    }
    if (
      dossierDeValidationStatuses.includes(
        DossierDeValidationStatusFilter.SIGNALE,
      )
    ) {
      dossierDeValidationWhereInput.push({
        dossierDeValidation: {
          decision: "INCOMPLETE",
        },
      });
    }

    andClauses.push({
      OR: dossierDeValidationWhereInput,
    });
  }

  // Jury status filter
  if (juryStatuses && juryStatuses.length > 0) {
    const juryStatusesWhereInput: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[] =
      [];

    if (juryStatuses.includes(JuryStatusFilter.TO_SCHEDULE)) {
      juryStatusesWhereInput.push({
        dossierDeValidation: {
          decision: {
            in: [
              DossierDeValidationStatus.PENDING,
              DossierDeValidationStatus.COMPLETE,
            ],
          },
        },
        jury: null,
      });
    }
    if (juryStatuses.includes(JuryStatusFilter.SCHEDULED)) {
      juryStatusesWhereInput.push({
        jury: {
          dateOfSession: { gt: new Date() },
        },
      });
    }
    if (juryStatuses.includes(JuryStatusFilter.PASSED)) {
      juryStatusesWhereInput.push({
        jury: {
          dateOfSession: { lt: new Date() },
        },
      });
    }

    andClauses.push({ OR: juryStatusesWhereInput });
  }

  // Jury result filter
  if (juryResults && juryResults.length > 0) {
    const juryResultsWhereInput: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[] =
      [];

    const filteredResults = juryResults.filter(
      (result) => result !== "AWAITING_RESULT",
    );
    if (filteredResults.length > 0) {
      juryResultsWhereInput.push({
        jury: {
          result: { in: filteredResults },
        },
      });
    }

    const hasAwaitingResult = juryResults.includes("AWAITING_RESULT");
    if (hasAwaitingResult) {
      juryResultsWhereInput.push({
        jury: {
          dateOfSession: { lte: new Date() },
          result: null,
        },
      });
    }

    andClauses.push({ OR: juryResultsWhereInput });
  }

  // Funding status filter
  if (fundingStatuses && fundingStatuses.length > 0) {
    const fundingStatusesWhereInput: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[] =
      [];

    if (fundingStatuses.includes(FundingStatusFilter.FVAE_FINANCEMENT)) {
      fundingStatusesWhereInput.push({
        candidacy: {
          financeModule: "unifvae",
        },
      });
    }

    if (
      fundingStatuses.includes(
        FundingStatusFilter.FVAE_DEMANDE_PAIEMENT_A_ENVOYER,
      )
    ) {
      fundingStatusesWhereInput.push({
        candidacy: {
          financeModule: "unifvae",
          fundingRequestUnifvae: { isNot: null },
        },
      });
    }

    if (
      fundingStatuses.includes(
        FundingStatusFilter.FVAE_DEMANDE_PAIEMENT_ENVOYEE,
      )
    ) {
      fundingStatusesWhereInput.push({
        candidacy: {
          financeModule: "unifvae",
          paymentRequestUnifvae: { confirmedAt: { not: null } },
        },
      });
    }

    andClauses.push({ OR: fundingStatusesWhereInput });
  }

  // Archive status filter
  if (archiveStatuses && archiveStatuses.length > 0) {
    const archiveStatusesWhereInput: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[] =
      [];

    if (archiveStatuses.includes(ArchiveStatusFilter.NON_RECEVABLE)) {
      archiveStatusesWhereInput.push({
        feasibility: {
          decision: FeasibilityStatus.REJECTED,
        },
      });
    }

    if (archiveStatuses.includes(ArchiveStatusFilter.ARCHIVE)) {
      archiveStatusesWhereInput.push({
        OR: [
          {
            candidacy: {
              status: CandidacyStatusStep.ARCHIVE,
            },
          },
          {
            candidacy: {
              candidacyDropOut: {
                isNot: null,
              },
            },
          },
        ],
      });
    }

    andClauses.push({ OR: archiveStatusesWhereInput });
  }

  // Accompagnement status filter
  if (accompagnementStatuses && accompagnementStatuses.length > 0) {
    const accompagnementStatusesWhereInput: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[] =
      [];

    if (accompagnementStatuses.includes(AccompagnementStatusFilter.EN_COURS)) {
      accompagnementStatusesWhereInput.push({
        candidacy: {
          endAccompagnementStatus: {
            in: [
              EndAccompagnementStatus.NOT_REQUESTED,
              EndAccompagnementStatus.PENDING,
            ],
          },
        },
      });
    }

    if (accompagnementStatuses.includes(AccompagnementStatusFilter.TERMINE)) {
      accompagnementStatusesWhereInput.push({
        candidacy: {
          endAccompagnementStatus: {
            in: [
              EndAccompagnementStatus.CONFIRMED_BY_CANDIDATE,
              EndAccompagnementStatus.CONFIRMED_BY_ADMIN,
            ],
          },
        },
      });
    }

    andClauses.push({ OR: accompagnementStatusesWhereInput });
  }

  // Cohorte vae collective filter
  if (cohorteVaeCollectiveIds && cohorteVaeCollectiveIds.length > 0) {
    if (isAdmin) {
      andClauses.push({
        candidacy: {
          cohorteVaeCollectiveId: { in: cohorteVaeCollectiveIds },
        },
      });
    }

    if (!isAdmin && keycloakId) {
      // On récupère les cohortes de vae collectives associées à l'aap connecté
      const cohortesForAAP = await getCohortesVaeCollectivesForConnectedAap({
        userKeycloakId: keycloakId,
        userRoles: context.auth.userInfo?.realm_access?.roles || [],
      });

      // On filtre les cohortes de vae collectives pour ne garder que celles qui sont associées à l'aap connecté
      const filteredCohorteVaeCollectiveIds = cohorteVaeCollectiveIds.filter(
        (id) => cohortesForAAP.some((cohorte) => cohorte.id === id),
      );

      // On ajoute le filtre pour ne garder que les candidatures associées aux cohortes de vae collectives filtrées
      andClauses.push({
        candidacy: {
          cohorteVaeCollectiveId: {
            in: filteredCohorteVaeCollectiveIds,
          },
        },
      });
    }
  }

  const whereClause: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput =
    andClauses.length === 1 ? andClauses[0] : { AND: andClauses };

  const totalRows = await prismaClient.candidacyWithLastActiveDfDvJury.count({
    where: whereClause,
  });

  const orderByClause = getOrderByClauseFromSortByFilter(sortByFilter);

  const candidacies =
    await prismaClient.candidacyWithLastActiveDfDvJury.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip: offset,
      take: limit,
      include: {
        candidacy: true,
      },
    });

  return {
    rows: candidacies.map(({ candidacy }) => candidacy),
    info: processPaginationInfo({
      totalRows,
      limit,
      offset,
    }),
  };
};

const getOrderByClauseFromSortByFilter = (
  sortByFilter: GetCandidaciesForCertificationAuthorityInput["sortByFilter"] = "DATE_CREATION_DESC",
):
  | Prisma.CandidacyWithLastActiveDfDvJuryOrderByWithRelationInput
  | Prisma.CandidacyWithLastActiveDfDvJuryOrderByWithRelationInput[]
  | undefined => {
  if (sortByFilter === "DATE_CREATION_DESC") {
    return [{ candidacy: { createdAt: "desc" } }];
  }
  if (sortByFilter === "DATE_CREATION_ASC") {
    return [{ candidacy: { createdAt: "asc" } }];
  }
  if (sortByFilter === "DATE_ENVOI_DESC") {
    return [{ candidacy: { sentAt: "desc" } }];
  }
  if (sortByFilter === "DATE_ENVOI_ASC") {
    return [{ candidacy: { sentAt: "asc" } }];
  }
  if (sortByFilter === "DOSSIER_DE_FAISABILITE_ENVOYE_DESC") {
    return [
      {
        feasibility: { feasibilityFileSentAt: { sort: "desc", nulls: "last" } },
      },
    ];
  }
  if (sortByFilter === "DOSSIER_DE_FAISABILITE_ENVOYE_ASC") {
    return [
      {
        feasibility: { feasibilityFileSentAt: { sort: "asc", nulls: "last" } },
      },
    ];
  }
  if (sortByFilter === "DOSSIER_DE_VALIDATION_ENVOYE_DESC") {
    return [
      {
        dossierDeValidation: {
          dossierDeValidationSentAt: { sort: "desc", nulls: "last" },
        },
      },
    ];
  }
  if (sortByFilter === "DOSSIER_DE_VALIDATION_ENVOYE_ASC") {
    return [
      {
        dossierDeValidation: {
          dossierDeValidationSentAt: { sort: "asc", nulls: "last" },
        },
      },
    ];
  }
  if (sortByFilter === "JURY_PROGRAMME_DESC") {
    return [{ jury: { dateOfSession: "desc" } }];
  }
  if (sortByFilter === "JURY_PROGRAMME_ASC") {
    return [{ jury: { dateOfSession: "asc" } }];
  }

  return undefined;
};
