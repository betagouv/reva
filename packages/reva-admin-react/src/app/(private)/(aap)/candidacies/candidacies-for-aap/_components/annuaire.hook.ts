import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";

import { graphql } from "@/graphql/generated";
import {
  CandidacySortByFilter,
  CandidacyStatusStep,
  FeasibilityStatusFilter,
  DossierDeValidationStatusFilter,
  JuryStatusFilter,
  JuryResultFilter,
  FundingStatusFilter,
  ArchiveStatusFilter,
  AccompagnementStatusFilter,
  TypeAccompagnementStatusFilter,
} from "@/graphql/generated/graphql";

export interface AnnuaireFilters {
  activeCandidacies: boolean;
  candidacyStatuses: CandidacyStatusStep[];
  typeAccompagnementStatuses: TypeAccompagnementStatusFilter[];
  trainingStatuses: CandidacyStatusStep[];
  feasibilityStatuses: FeasibilityStatusFilter[];
  dossierDeValidationStatuses: DossierDeValidationStatusFilter[];
  juryStatuses: JuryStatusFilter[];
  juryResults: JuryResultFilter[];
  fundingStatuses: FundingStatusFilter[];
  archiveStatuses: ArchiveStatusFilter[];
  accompagnementStatuses: AccompagnementStatusFilter[];
  cohorteVaeCollectiveIds: string[];
}

const getCohortesForAAP = graphql(`
  query getCohortesForAAP {
    cohortesVaeCollectivesForConnectedAap {
      id
      nom
      organism {
        maisonMereAAP {
          id
        }
      }
    }
  }
`);

const getCandidaciesForAAP = graphql(`
  query getCandidaciesForAAP(
    $offset: Int
    $searchFilter: String
    $sortByFilter: CandidacySortByFilter
    $activeCandidacies: Boolean
    $candidacyStatuses: [CandidacyStatusStep!]
    $typeAccompagnementStatuses: [TypeAccompagnementStatusFilter!]
    $trainingStatuses: [CandidacyStatusStep!]
    $feasibilityStatuses: [FeasibilityStatusFilter!]
    $dossierDeValidationStatuses: [DossierDeValidationStatusFilter!]
    $juryStatuses: [JuryStatusFilter!]
    $juryResults: [JuryResultFilter!]
    $fundingStatuses: [FundingStatusFilter!]
    $archiveStatuses: [ArchiveStatusFilter!]
    $accompagnementStatuses: [AccompagnementStatusFilter!]
    $cohorteVaeCollectiveIds: [ID!]
    $maisonMereAAPId: ID
  ) {
    candidacy_getCandidaciesForAAP(
      offset: $offset
      limit: 10
      searchFilter: $searchFilter
      sortByFilter: $sortByFilter
      activeCandidacies: $activeCandidacies
      candidacyStatuses: $candidacyStatuses
      typeAccompagnementStatuses: $typeAccompagnementStatuses
      trainingStatuses: $trainingStatuses
      feasibilityStatuses: $feasibilityStatuses
      dossierDeValidationStatuses: $dossierDeValidationStatuses
      juryStatuses: $juryStatuses
      juryResults: $juryResults
      fundingStatuses: $fundingStatuses
      archiveStatuses: $archiveStatuses
      accompagnementStatuses: $accompagnementStatuses
      cohorteVaeCollectiveIds: $cohorteVaeCollectiveIds
      maisonMereAAPId: $maisonMereAAPId
    ) {
      rows {
        id
        typeAccompagnement
        endAccompagnementStatus
        endAccompagnementDate
        candidate {
          firstname
          lastname
          givenName
          firstname2
          firstname3
          middleNames
          department {
            code
            label
          }
        }
        cohorteVaeCollective {
          nom
          commanditaireVaeCollective {
            raisonSociale
          }
        }
        feasibility {
          decision
          decisionSentAt
          feasibilityFileSentAt
          dematerializedFeasibilityFile {
            sentToCandidateAt
            candidateConfirmationAt
            isReadyToBeSentToCertificationAuthority
            isReadyToBeSentToCandidate
            swornStatementFileId
          }
        }
        activeDossierDeValidation {
          dossierDeValidationSentAt
        }
        readyForJuryEstimatedAt
        jury {
          dateOfSession
          result
        }
        certification {
          label
          codeRncp
        }
        organism {
          label
          nomPublic
          modaliteAccompagnement
        }
        candidacyDropOut {
          createdAt
        }
        status
        candidacyStatuses {
          status
          createdAt
        }
      }
      info {
        totalRows
        totalPages
        currentPage
      }
    }
  }
`);

export const useAnnuaire = () => {
  const { graphqlClient } = useGraphQlClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const maisonMereAAPIdParam = searchParams.get("maisonMereAAPId");

  const filters = useMemo<AnnuaireFilters>(() => {
    const activeCandidaciesParam = searchParams.get("activeCandidacies");
    const candidacyParam = searchParams.get("candidacy");
    const typeAccompagnementParam = searchParams.get("typeAccompagnement");
    const trainingParam = searchParams.get("training");
    const feasibilityParam = searchParams.get("feasibility");
    const dossierDeValidationParam = searchParams.get("dossierDeValidation");
    const juryParam = searchParams.get("juryStatuses");
    const juryResultParam = searchParams.get("juryResults");
    const fundingParam = searchParams.get("funding");
    const archiveParam = searchParams.get("archive");
    const accompagnementParam = searchParams.get("accompagnement");
    const cohorteVaeCollectiveIdsParam = searchParams.get(
      "cohorteVaeCollectiveIds",
    );

    return {
      activeCandidacies: activeCandidaciesParam === "true",
      candidacyStatuses: candidacyParam
        ? (candidacyParam.split(",") as CandidacyStatusStep[])
        : [],
      typeAccompagnementStatuses: typeAccompagnementParam
        ? (typeAccompagnementParam.split(
            ",",
          ) as TypeAccompagnementStatusFilter[])
        : [],
      trainingStatuses: trainingParam
        ? (trainingParam.split(",") as CandidacyStatusStep[])
        : [],
      feasibilityStatuses: feasibilityParam
        ? (feasibilityParam.split(",") as FeasibilityStatusFilter[])
        : [],
      dossierDeValidationStatuses: dossierDeValidationParam
        ? (dossierDeValidationParam.split(
            ",",
          ) as DossierDeValidationStatusFilter[])
        : [],
      juryStatuses: juryParam
        ? (juryParam.split(",") as JuryStatusFilter[])
        : [],
      juryResults: juryResultParam
        ? (juryResultParam.split(",") as JuryResultFilter[])
        : [],
      fundingStatuses: fundingParam
        ? (fundingParam.split(",") as FundingStatusFilter[])
        : [],
      archiveStatuses: archiveParam
        ? (archiveParam.split(",") as ArchiveStatusFilter[])
        : [],
      accompagnementStatuses: accompagnementParam
        ? (accompagnementParam.split(",") as AccompagnementStatusFilter[])
        : [],
      cohorteVaeCollectiveIds: cohorteVaeCollectiveIdsParam
        ? (cohorteVaeCollectiveIdsParam.split(",") as string[])
        : [],
    };
  }, [searchParams]);

  const searchFilter = searchParams.get("search") || "";
  const sortByFilter =
    (searchParams.get("sortBy") as CandidacySortByFilter) ||
    "DATE_CREATION_DESC";
  const currentPage = searchParams.get("page")
    ? parseInt(searchParams.get("page") as string)
    : 1;

  const offset = (currentPage - 1) * 10;

  const { data, isLoading } = useQuery({
    queryKey: [
      "candidacy_getCandidaciesForAAP",
      searchFilter,
      sortByFilter,
      currentPage,
      filters.activeCandidacies,
      filters.candidacyStatuses,
      filters.typeAccompagnementStatuses,
      filters.trainingStatuses,
      filters.feasibilityStatuses,
      filters.dossierDeValidationStatuses,
      filters.juryStatuses,
      filters.juryResults,
      filters.fundingStatuses,
      filters.archiveStatuses,
      filters.accompagnementStatuses,
      filters.cohorteVaeCollectiveIds,
      maisonMereAAPIdParam,
    ],
    queryFn: () =>
      graphqlClient.request(getCandidaciesForAAP, {
        offset,
        searchFilter,
        sortByFilter,
        activeCandidacies: filters.activeCandidacies,
        candidacyStatuses:
          filters.candidacyStatuses.length > 0
            ? filters.candidacyStatuses
            : undefined,
        typeAccompagnementStatuses:
          filters.typeAccompagnementStatuses.length > 0
            ? filters.typeAccompagnementStatuses
            : undefined,
        trainingStatuses:
          filters.trainingStatuses.length > 0
            ? filters.trainingStatuses
            : undefined,
        feasibilityStatuses:
          filters.feasibilityStatuses.length > 0
            ? filters.feasibilityStatuses
            : undefined,
        dossierDeValidationStatuses:
          filters.dossierDeValidationStatuses.length > 0
            ? filters.dossierDeValidationStatuses
            : undefined,
        juryStatuses:
          filters.juryStatuses.length > 0 ? filters.juryStatuses : undefined,
        juryResults:
          filters.juryResults.length > 0 ? filters.juryResults : undefined,
        fundingStatuses:
          filters.fundingStatuses.length > 0
            ? filters.fundingStatuses
            : undefined,
        archiveStatuses:
          filters.archiveStatuses.length > 0
            ? filters.archiveStatuses
            : undefined,
        accompagnementStatuses:
          filters.accompagnementStatuses.length > 0
            ? filters.accompagnementStatuses
            : undefined,
        cohorteVaeCollectiveIds:
          filters.cohorteVaeCollectiveIds.length > 0
            ? filters.cohorteVaeCollectiveIds
            : undefined,
        maisonMereAAPId: maisonMereAAPIdParam,
      }),
  });

  const { data: cohortesData } = useQuery({
    queryKey: ["getCohortesForAAP"],
    queryFn: () => graphqlClient.request(getCohortesForAAP),
  });

  const cohortes = useMemo(() => {
    const cohortes = cohortesData?.cohortesVaeCollectivesForConnectedAap || [];
    if (maisonMereAAPIdParam) {
      return cohortes.filter(
        (cohorte) =>
          cohorte.organism?.maisonMereAAP?.id === maisonMereAAPIdParam,
      );
    }
    return cohortes;
  }, [cohortesData, maisonMereAAPIdParam]);

  const updateFilters = useCallback(
    (newFilters: Partial<AnnuaireFilters>) => {
      const queryParams = new URLSearchParams(searchParams);
      queryParams.set("page", "1");

      if (newFilters.activeCandidacies !== undefined) {
        if (newFilters.activeCandidacies) {
          queryParams.set("activeCandidacies", "true");
        } else {
          queryParams.delete("activeCandidacies");
        }
      }

      if (newFilters.candidacyStatuses !== undefined) {
        if (newFilters.candidacyStatuses.length > 0) {
          queryParams.set("candidacy", newFilters.candidacyStatuses.join(","));
        } else {
          queryParams.delete("candidacy");
        }
      }

      if (newFilters.typeAccompagnementStatuses !== undefined) {
        if (newFilters.typeAccompagnementStatuses.length > 0) {
          queryParams.set(
            "typeAccompagnement",
            newFilters.typeAccompagnementStatuses.join(","),
          );
        } else {
          queryParams.delete("typeAccompagnement");
        }
      }

      if (newFilters.trainingStatuses !== undefined) {
        if (newFilters.trainingStatuses.length > 0) {
          queryParams.set("training", newFilters.trainingStatuses.join(","));
        } else {
          queryParams.delete("training");
        }
      }

      if (newFilters.feasibilityStatuses !== undefined) {
        if (newFilters.feasibilityStatuses.length > 0) {
          queryParams.set(
            "feasibility",
            newFilters.feasibilityStatuses.join(","),
          );
        } else {
          queryParams.delete("feasibility");
        }
      }

      if (newFilters.dossierDeValidationStatuses !== undefined) {
        if (newFilters.dossierDeValidationStatuses.length > 0) {
          queryParams.set(
            "dossierDeValidation",
            newFilters.dossierDeValidationStatuses.join(","),
          );
        } else {
          queryParams.delete("dossierDeValidation");
        }
      }

      if (newFilters.juryStatuses !== undefined) {
        if (newFilters.juryStatuses.length > 0) {
          queryParams.set("juryStatuses", newFilters.juryStatuses.join(","));
        } else {
          queryParams.delete("juryStatuses");
        }
      }

      if (newFilters.juryResults !== undefined) {
        if (newFilters.juryResults.length > 0) {
          queryParams.set("juryResults", newFilters.juryResults.join(","));
        } else {
          queryParams.delete("juryResults");
        }
      }

      if (newFilters.fundingStatuses !== undefined) {
        if (newFilters.fundingStatuses.length > 0) {
          queryParams.set("funding", newFilters.fundingStatuses.join(","));
        } else {
          queryParams.delete("funding");
        }
      }

      if (newFilters.archiveStatuses !== undefined) {
        if (newFilters.archiveStatuses.length > 0) {
          queryParams.set("archive", newFilters.archiveStatuses.join(","));
        } else {
          queryParams.delete("archive");
        }
      }

      if (newFilters.accompagnementStatuses !== undefined) {
        if (newFilters.accompagnementStatuses.length > 0) {
          queryParams.set(
            "accompagnement",
            newFilters.accompagnementStatuses.join(","),
          );
        } else {
          queryParams.delete("accompagnement");
        }
      }

      if (newFilters.cohorteVaeCollectiveIds !== undefined) {
        if (newFilters.cohorteVaeCollectiveIds.length > 0) {
          queryParams.set(
            "cohorteVaeCollectiveIds",
            newFilters.cohorteVaeCollectiveIds.join(","),
          );
        } else {
          queryParams.delete("cohorteVaeCollectiveIds");
        }
      }

      // Force refresh to prevent bug from nextjs navigation
      // Bug occurs when using page is loaded with default filters
      router.refresh();
      router.replace(`./?${queryParams.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const setSearchFilter = useCallback(
    (filter: string) => {
      const queryParams = new URLSearchParams(searchParams);
      if (filter) {
        queryParams.set("page", "1");
        queryParams.set("search", filter);
      } else {
        queryParams.delete("search");
      }

      // Force refresh to prevent bug from nextjs navigation
      // Bug occurs when using page is loaded with default filters
      router.refresh();
      router.replace(`./?${queryParams.toString()}`);
    },
    [router, searchParams],
  );

  const toggleActiveCandidacies = useCallback(
    (active: boolean) => {
      updateFilters({ activeCandidacies: active });
    },
    [updateFilters],
  );

  const toggleCandidacyStatus = useCallback(
    (status: CandidacyStatusStep) => {
      const newStatuses = filters.candidacyStatuses.includes(status)
        ? filters.candidacyStatuses.filter((s) => s !== status)
        : [...filters.candidacyStatuses, status];
      updateFilters({ candidacyStatuses: newStatuses });
    },
    [filters.candidacyStatuses, updateFilters],
  );

  const toggleTypeAccompagnementStatus = useCallback(
    (status: TypeAccompagnementStatusFilter) => {
      const newStatuses = filters.typeAccompagnementStatuses.includes(status)
        ? filters.typeAccompagnementStatuses.filter((s) => s !== status)
        : [...filters.typeAccompagnementStatuses, status];
      updateFilters({ typeAccompagnementStatuses: newStatuses });
    },
    [filters.typeAccompagnementStatuses, updateFilters],
  );

  const toggleTrainingStatus = useCallback(
    (status: CandidacyStatusStep) => {
      const newStatuses = filters.trainingStatuses.includes(status)
        ? filters.trainingStatuses.filter((s) => s !== status)
        : [...filters.trainingStatuses, status];
      updateFilters({ trainingStatuses: newStatuses });
    },
    [filters.trainingStatuses, updateFilters],
  );

  const toggleFeasibilityStatus = useCallback(
    (status: FeasibilityStatusFilter) => {
      const newStatuses = filters.feasibilityStatuses.includes(status)
        ? filters.feasibilityStatuses.filter((s) => s !== status)
        : [...filters.feasibilityStatuses, status];
      updateFilters({ feasibilityStatuses: newStatuses });
    },
    [filters.feasibilityStatuses, updateFilters],
  );

  const toggleDossierDeValidationStatus = useCallback(
    (status: DossierDeValidationStatusFilter) => {
      const newStatuses = filters.dossierDeValidationStatuses.includes(status)
        ? filters.dossierDeValidationStatuses.filter((s) => s !== status)
        : [...filters.dossierDeValidationStatuses, status];
      updateFilters({ dossierDeValidationStatuses: newStatuses });
    },
    [filters.dossierDeValidationStatuses, updateFilters],
  );

  const toggleJuryStatus = useCallback(
    (status: JuryStatusFilter) => {
      const newStatuses = filters.juryStatuses.includes(status)
        ? filters.juryStatuses.filter((s) => s !== status)
        : [...filters.juryStatuses, status];
      updateFilters({ juryStatuses: newStatuses });
    },
    [filters.juryStatuses, updateFilters],
  );

  const toggleJuryResults = useCallback(
    (results: JuryResultFilter[]) => {
      const allSelected = results.every((r) => filters.juryResults.includes(r));
      const newResults = allSelected
        ? filters.juryResults.filter((r) => !results.includes(r))
        : [
            ...filters.juryResults,
            ...results.filter((r) => !filters.juryResults.includes(r)),
          ];
      updateFilters({ juryResults: newResults });
    },
    [filters.juryResults, updateFilters],
  );

  const toggleFundingStatus = useCallback(
    (status: FundingStatusFilter) => {
      const newStatuses = filters.fundingStatuses.includes(status)
        ? filters.fundingStatuses.filter((s) => s !== status)
        : [...filters.fundingStatuses, status];
      updateFilters({ fundingStatuses: newStatuses });
    },
    [filters.fundingStatuses, updateFilters],
  );

  const toggleArchiveStatus = useCallback(
    (status: ArchiveStatusFilter) => {
      const newStatuses = filters.archiveStatuses.includes(status)
        ? filters.archiveStatuses.filter((s) => s !== status)
        : [...filters.archiveStatuses, status];
      updateFilters({ archiveStatuses: newStatuses });
    },
    [filters.archiveStatuses, updateFilters],
  );

  const toggleAccompagnementStatus = useCallback(
    (status: AccompagnementStatusFilter) => {
      const newStatuses = filters.accompagnementStatuses.includes(status)
        ? filters.accompagnementStatuses.filter((s) => s !== status)
        : [...filters.accompagnementStatuses, status];
      updateFilters({ accompagnementStatuses: newStatuses });
    },
    [filters.accompagnementStatuses, updateFilters],
  );

  const toggleCohorteVAECollective = useCallback(
    (cohorteVaeCollectiveId: string) => {
      const newCohortes = filters.cohorteVaeCollectiveIds.includes(
        cohorteVaeCollectiveId,
      )
        ? filters.cohorteVaeCollectiveIds.filter(
            (c) => c !== cohorteVaeCollectiveId,
          )
        : [...filters.cohorteVaeCollectiveIds, cohorteVaeCollectiveId];
      updateFilters({ cohorteVaeCollectiveIds: newCohortes });
    },
    [filters.cohorteVaeCollectiveIds, updateFilters],
  );

  const clearFilters = useCallback(() => {
    const queryParams = new URLSearchParams(searchParams);
    queryParams.set("page", "1");

    queryParams.delete("activeCandidacies");
    queryParams.delete("candidacy");
    queryParams.delete("typeAccompagnement");
    queryParams.delete("training");
    queryParams.delete("feasibility");
    queryParams.delete("dossierDeValidation");
    queryParams.delete("juryStatuses");
    queryParams.delete("juryResults");
    queryParams.delete("funding");
    queryParams.delete("archive");
    queryParams.delete("accompagnement");
    queryParams.delete("cohorteVaeCollectiveIds");

    // Force refresh to prevent bug from nextjs navigation
    // Bug occurs when using page is loaded with default filters
    router.refresh();
    router.replace(`./?${queryParams.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const hasActiveFilters = useMemo(
    () =>
      filters.activeCandidacies ||
      filters.candidacyStatuses.length > 0 ||
      filters.typeAccompagnementStatuses.length > 0 ||
      filters.trainingStatuses.length > 0 ||
      filters.feasibilityStatuses.length > 0 ||
      filters.dossierDeValidationStatuses.length > 0 ||
      filters.juryStatuses.length > 0 ||
      filters.juryResults.length > 0 ||
      filters.fundingStatuses.length > 0 ||
      filters.archiveStatuses.length > 0 ||
      filters.accompagnementStatuses.length > 0 ||
      filters.cohorteVaeCollectiveIds.length > 0,
    [
      filters.activeCandidacies,
      filters.candidacyStatuses,
      filters.typeAccompagnementStatuses,
      filters.trainingStatuses,
      filters.feasibilityStatuses,
      filters.dossierDeValidationStatuses,
      filters.juryStatuses,
      filters.juryResults,
      filters.fundingStatuses,
      filters.archiveStatuses,
      filters.accompagnementStatuses,
      filters.cohorteVaeCollectiveIds,
    ],
  );

  return {
    candidacies: data?.candidacy_getCandidaciesForAAP,
    cohortes,
    isLoading,
    filters,
    searchFilter,
    setSearchFilter,
    toggleActiveCandidacies,
    toggleCandidacyStatus,
    toggleTypeAccompagnementStatus,
    toggleTrainingStatus,
    toggleFeasibilityStatus,
    toggleDossierDeValidationStatus,
    toggleJuryStatus,
    toggleJuryResults,
    toggleFundingStatus,
    toggleArchiveStatus,
    toggleAccompagnementStatus,
    toggleCohorteVAECollective,
    clearFilters,
    hasActiveFilters,
    maisonMereAAPId: maisonMereAAPIdParam,
  };
};
