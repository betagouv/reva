import {
  CandidacyStatusStep,
  DossierDeValidationStatus,
  FeasibilityStatus,
  Prisma,
} from "@prisma/client";

import { processPaginationInfo } from "@/modules/shared/list/pagination";
import { getWhereClauseFromSearchFilter } from "@/modules/shared/search/search";
import { prismaClient } from "@/prisma/client";

import {
  GetCandidaciesForCertificationAuthorityInput,
  JuryStatusFilter,
} from "../candidacy.types";
import { candidacySearchWord } from "../utils/candidacy.helper";
import { getWhereClauseFromStatusFilterForCertificationAuthority } from "../utils/getWhereClauseFromStatusFilterForCertificationAuthority.helper";

const CANDIDACY_STATUS_TO_INCLUDE: CandidacyStatusStep[] = [
  CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
  CandidacyStatusStep.DOSSIER_FAISABILITE_COMPLET,
  CandidacyStatusStep.DOSSIER_FAISABILITE_INCOMPLET,
  CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
  CandidacyStatusStep.DOSSIER_FAISABILITE_NON_RECEVABLE,
  CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
  CandidacyStatusStep.DOSSIER_DE_VALIDATION_SIGNALE,
];

const FEASIBILITY_DECISION_BY_STATUS: Partial<
  Record<CandidacyStatusStep, FeasibilityStatus>
> = {
  [CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE]: FeasibilityStatus.PENDING,
  [CandidacyStatusStep.DOSSIER_FAISABILITE_COMPLET]: FeasibilityStatus.COMPLETE,
  [CandidacyStatusStep.DOSSIER_FAISABILITE_INCOMPLET]:
    FeasibilityStatus.INCOMPLETE,
  [CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE]:
    FeasibilityStatus.ADMISSIBLE,
  [CandidacyStatusStep.DOSSIER_FAISABILITE_NON_RECEVABLE]:
    FeasibilityStatus.REJECTED,
};

const VALIDATION_DECISION_BY_STATUS: Partial<
  Record<CandidacyStatusStep, DossierDeValidationStatus[] | null>
> = {
  [CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE]: null,
  [CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE]: [
    DossierDeValidationStatus.PENDING,
    DossierDeValidationStatus.COMPLETE,
  ],
  [CandidacyStatusStep.DOSSIER_DE_VALIDATION_SIGNALE]: [
    DossierDeValidationStatus.INCOMPLETE,
  ],
};

export const getCandidaciesForCertificationAuthority = async ({
  context,
  offset = 0,
  limit = 10000,
  statusFilter,
  searchFilter,
  sortByFilter,
  feasibilityStatuses,
  validationStatuses,
  juryStatuses,
  juryResults,
  includeDropouts = false,
  cohorteVaeCollectiveId,
  certificationAuthorityId,
  certificationAuthorityLocalAccountId,
}: GetCandidaciesForCertificationAuthorityInput & {
  context: GraphqlContext;
}) => {
  const isAdmin = context.auth.hasRole("admin");

  const certificationAuthorityInfo =
    await resolveCertificationAuthorityInfo(context);

  // Non-admin users must have a certification authority
  if (!isAdmin && !certificationAuthorityInfo.certificationAuthorityId) {
    return {
      rows: [],
      info: processPaginationInfo({
        totalRows: 0,
        limit,
        offset,
      }),
    };
  }

  const andClauses: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[] = [
    { candidacy: { status: { in: CANDIDACY_STATUS_TO_INCLUDE } } },
  ];

  const feasibilityFilters = buildFeasibilityFilter(feasibilityStatuses);
  if (feasibilityFilters) {
    andClauses.push({ feasibility: feasibilityFilters });
  }

  const validationFilter = buildValidationFilter(validationStatuses);

  const isValidationStatusesContainNull = validationStatuses?.find(
    (status) => status === CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE,
  );

  if (validationFilter && isValidationStatusesContainNull) {
    andClauses.push({
      OR: [
        { dossierDeValidation: validationFilter },
        {
          feasibility: { decision: FeasibilityStatus.ADMISSIBLE },
          dossierDeValidationId: null,
        },
      ],
    });
  } else if (validationFilter) {
    andClauses.push({ dossierDeValidation: validationFilter });
  } else if (isValidationStatusesContainNull) {
    andClauses.push({
      feasibility: { decision: FeasibilityStatus.ADMISSIBLE },
      dossierDeValidationId: null,
    });
  }

  // certificationAuthorityId filter
  const selectedCertificationAuthorityId = isAdmin
    ? certificationAuthorityId
    : certificationAuthorityInfo.certificationAuthorityId;

  if (selectedCertificationAuthorityId) {
    andClauses.push({
      feasibility: {
        certificationAuthorityId: selectedCertificationAuthorityId,
      },
    });
  }

  // For local accounts, only include candidacies explicitly linked to them
  let selectedCertificationAuthorityLocalAccountId: string | undefined;

  if (isAdmin) {
    selectedCertificationAuthorityLocalAccountId =
      certificationAuthorityLocalAccountId;
  } else if (
    certificationAuthorityInfo.certificationAuthorityId &&
    certificationAuthorityLocalAccountId
  ) {
    // Check if the local account is linked to the certification authority
    const certificationAuthorityLocalAccount =
      await prismaClient.certificationAuthorityLocalAccount.findUnique({
        where: {
          id: certificationAuthorityLocalAccountId,
          certificationAuthorityId:
            certificationAuthorityInfo.certificationAuthorityId,
        },
      });

    // If the local account is linked to the certification authority, use it
    if (certificationAuthorityLocalAccount) {
      selectedCertificationAuthorityLocalAccountId =
        certificationAuthorityLocalAccount.id;
    }
  } else {
    selectedCertificationAuthorityLocalAccountId =
      certificationAuthorityInfo.certificationAuthorityLocalAccountId;
  }

  if (selectedCertificationAuthorityLocalAccountId) {
    andClauses.push({
      candidacy: {
        certificationAuthorityLocalAccountOnCandidacy: {
          some: {
            certificationAuthorityLocalAccountId:
              selectedCertificationAuthorityLocalAccountId,
          },
        },
      },
    });
  }

  // Status filter
  addClause(andClauses, {
    candidacy: {
      ...getWhereClauseFromStatusFilterForCertificationAuthority(
        statusFilter,
        includeDropouts,
      ),
    },
  });

  // Search filter
  addClause(andClauses, {
    candidacy: {
      ...getWhereClauseFromSearchFilter(candidacySearchWord, searchFilter),
    },
  });

  // Cohorte filter
  if (cohorteVaeCollectiveId) {
    andClauses.push({ candidacy: { cohorteVaeCollectiveId } });
  }

  // Dropout filter
  if (!includeDropouts && !statusFilter) {
    andClauses.push({ candidacy: { candidacyDropOut: null } });
  }

  // Jury status filter
  addClause(andClauses, buildJuryStatusClause(juryStatuses));

  // Jury result filter
  addClause(andClauses, buildJuryResultClause(juryResults));

  if (
    (sortByFilter === "JURY_PROGRAMME_DESC" ||
      sortByFilter === "JURY_PROGRAMME_ASC") &&
    !juryStatuses?.includes(JuryStatusFilter.TO_SCHEDULE)
  ) {
    andClauses.push({ jury: { isNot: null } });
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
  sortByFilter: GetCandidaciesForCertificationAuthorityInput["sortByFilter"] = "DOSSIER_DE_FAISABILITE_ENVOYE_DESC",
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

const resolveCertificationAuthorityInfo = async (
  context: GraphqlContext,
): Promise<{
  certificationAuthorityId: string | undefined;
  certificationAuthorityLocalAccountId: string | undefined;
}> => {
  if (
    !context.auth.hasRole("manage_feasibility") ||
    !context.auth.userInfo?.sub
  ) {
    return {
      certificationAuthorityId: undefined,
      certificationAuthorityLocalAccountId: undefined,
    };
  }

  try {
    const account = await prismaClient.account.findUnique({
      where: {
        keycloakId: context.auth.userInfo.sub,
      },
      select: {
        id: true,
        certificationAuthorityId: true,
        certificationAuthorityLocalAccountOnAccount: {
          select: {
            certificationAuthorityLocalAccount: {
              select: {
                id: true,
                certificationAuthorityId: true,
              },
            },
          },
        },
      },
    });

    if (!account) {
      return {
        certificationAuthorityId: undefined,
        certificationAuthorityLocalAccountId: undefined,
      };
    }

    // Certification Authority admin account
    if (account.certificationAuthorityId) {
      return {
        certificationAuthorityId: account.certificationAuthorityId,
        certificationAuthorityLocalAccountId: undefined,
      };
    }

    // Certification Authority local account
    const certificationAuthorityLocalAccount =
      account.certificationAuthorityLocalAccountOnAccount
        ?.certificationAuthorityLocalAccount;
    if (certificationAuthorityLocalAccount?.certificationAuthorityId) {
      return {
        certificationAuthorityId:
          certificationAuthorityLocalAccount.certificationAuthorityId,
        certificationAuthorityLocalAccountId:
          certificationAuthorityLocalAccount.id,
      };
    }

    return {
      certificationAuthorityId: undefined,
      certificationAuthorityLocalAccountId: undefined,
    };
  } catch (_error) {
    return {
      certificationAuthorityId: undefined,
      certificationAuthorityLocalAccountId: undefined,
    };
  }
};

const addClause = (
  clauses: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[],
  clause?: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput,
) => {
  if (clause && Object.keys(clause).length > 0) {
    clauses.push(clause);
  }
};

const buildFeasibilityFilter = (
  statuses: CandidacyStatusStep[] | undefined,
):
  | Prisma.CandidacyWithLastActiveDfDvJuryWhereInput["feasibility"]
  | undefined => {
  const filters: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput["feasibility"] =
    {};

  const decisions = (statuses ?? [])
    .map((status) => FEASIBILITY_DECISION_BY_STATUS[status])
    .filter((decision): decision is FeasibilityStatus => Boolean(decision));

  if (decisions.length > 0) {
    filters.decision = { in: decisions };
  }

  return Object.keys(filters).length > 0 ? filters : undefined;
};

const buildValidationFilter = (
  statuses: CandidacyStatusStep[] | undefined,
):
  | Prisma.CandidacyWithLastActiveDfDvJuryWhereInput["dossierDeValidation"]
  | undefined => {
  if (
    !statuses ||
    statuses.length === 0 ||
    (statuses.length === 1 &&
      statuses[0] === CandidacyStatusStep.DOSSIER_FAISABILITE_RECEVABLE)
  ) {
    return undefined;
  }

  const filters: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput["dossierDeValidation"] =
    {};

  const decisions = (statuses ?? [])
    .map((status) => VALIDATION_DECISION_BY_STATUS[status])
    .flat()
    .filter((decision): decision is DossierDeValidationStatus =>
      Boolean(decision),
    );

  if (decisions.length > 0) {
    filters.decision = { in: decisions };
  }

  return Object.keys(filters).length > 0 ? filters : undefined;
};

const buildJuryStatusClause = (
  juryStatuses: GetCandidaciesForCertificationAuthorityInput["juryStatuses"],
): Prisma.CandidacyWithLastActiveDfDvJuryWhereInput | undefined => {
  if (!juryStatuses || juryStatuses.length === 0) {
    return undefined;
  }

  const clauses: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[] = [];

  juryStatuses.forEach((juryStatus) => {
    if (juryStatus === "TO_SCHEDULE") {
      clauses.push({
        candidacy: {
          status: CandidacyStatusStep.DOSSIER_DE_VALIDATION_ENVOYE,
        },
        jury: null,
      });
    } else if (juryStatus === "SCHEDULED") {
      clauses.push({
        jury: {
          dateOfSession: { gt: new Date() },
        },
      });
    }
  });

  return clauses.length > 0 ? { OR: clauses } : undefined;
};

const buildJuryResultClause = (
  juryResults: GetCandidaciesForCertificationAuthorityInput["juryResults"],
): Prisma.CandidacyWithLastActiveDfDvJuryWhereInput | undefined => {
  if (!juryResults || juryResults.length === 0) {
    return undefined;
  }

  const hasAwaitingResult = (juryResults as string[]).includes(
    "AWAITING_RESULT",
  );
  const actualResults = juryResults.filter(
    (result) => (result as string) !== "AWAITING_RESULT",
  );

  const clauses: Prisma.CandidacyWithLastActiveDfDvJuryWhereInput[] = [];

  if (actualResults.length > 0) {
    clauses.push({
      jury: {
        result: { in: actualResults },
      },
    });
  }

  if (hasAwaitingResult) {
    clauses.push({
      jury: {
        dateOfSession: { lte: new Date() },
        result: null,
      },
    });
  }

  return clauses.length > 0 ? { OR: clauses } : undefined;
};
