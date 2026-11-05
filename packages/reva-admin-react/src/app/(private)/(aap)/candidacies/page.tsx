"use client";

import Button from "@codegouvfr/react-dsfr/Button";
import { toDate } from "date-fns";
import {
  redirect,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/auth";
import { CandidacyCard } from "@/components/card/candidacy-card/CandidacyCard";
import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";
import { SearchList } from "@/components/search/search-list/SearchList";

import {
  CandidacyCountByStatus,
  CandidacySortByFilter,
  CandidacyStatusFilter,
} from "@/graphql/generated/types";

import { useCandidacies } from "./_components/candidacies.hook";
import { CandidaciesLayout } from "./_components/CandidaciesLayout";
import { SortByBar } from "./_components/SortByBar";

export default function CandidaciesPage() {
  const { isFeatureActive } = useFeatureflipping();
  const isCandidaciesForAAPEnabled = isFeatureActive("CANDIDACIES_FOR_AAP");

  if (isCandidaciesForAAPEnabled) {
    redirect("/candidacies/candidacies-for-aap");
  }

  const pathname = usePathname();
  const { replace } = useRouter();

  const searchParams = useSearchParams();
  const page = searchParams.get("page");
  const currentPage = page ? Number.parseInt(page) : 1;
  const searchFilter = searchParams.get("search") || "";
  const status = searchParams.get("status");
  const sortByFilter = searchParams.get("sortBy");
  const maisonMereAAPId = searchParams.get("maisonMereAAPId") as
    | string
    | undefined;
  const cohorteVaeCollectiveId = searchParams.get("cohorteVaeCollectiveId") as
    | string
    | undefined;

  const {
    candidaciesByStatusCount,
    candidaciesByStatus,
    cohortesVaeCollectives,
  } = useCandidacies({
    searchFilter,
    statusFilter: (status as CandidacyStatusFilter) ?? "ACTIVE_HORS_ABANDON",
    sortByFilter:
      (sortByFilter as CandidacySortByFilter) ?? "DATE_CREATION_DESC",
    currentPage,
    maisonMereAAPId,
    cohorteVaeCollectiveId,
  });

  const { isAdmin } = useAuth();

  useEffect(() => {
    if (status && sortByFilter && page) {
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    if (!status) {
      nextParams.set("status", "ACTIVE_HORS_ABANDON");
    }
    if (!sortByFilter) {
      nextParams.set("sortBy", "DATE_CREATION_DESC");
    }
    if (!page) {
      nextParams.set("page", "1");
    }
    replace(`${pathname}?${nextParams.toString()}`);
  }, [status, sortByFilter, page, searchParams, pathname, replace]);

  const getPathnameWithoutMaisonMereAAPId = (): string => {
    const currentParams = new URLSearchParams(searchParams);
    currentParams.delete("maisonMereAAPId");
    return `${pathname}?${currentParams.toString()}`;
  };

  return (
    <CandidaciesLayout
      candidaciesByStatusCount={
        candidaciesByStatusCount as CandidacyCountByStatus
      }
      cohortesVaeCollectives={cohortesVaeCollectives}
    >
      {maisonMereAAPId && isAdmin && (
        <div>
          <h1>Candidatures de la structure</h1>
          <Button
            priority="secondary"
            linkProps={{
              href: getPathnameWithoutMaisonMereAAPId(),
            }}
          >
            Accéder à toutes les candidatures
          </Button>
          <p className="mt-6">
            Ici, vous pouvez rechercher une ou plusieurs candidatures gérées par
            cette structure. Pour retrouver toutes les candidatures de la
            plateforme, cliquez sur “Accéder à toutes les candidatures”.
          </p>
        </div>
      )}
      {isAdmin && !maisonMereAAPId && (
        <div>
          <h1>Espace pro administrateur</h1>
          <p>
            En tant qu'administrateur, vous pouvez gérer toutes les candidatures
            et faire une recherche par Architecte Accompagnateur de Parcours.
          </p>
        </div>
      )}
      {!isAdmin && !maisonMereAAPId && (
        <div>
          <h1>Candidatures</h1>
        </div>
      )}

      {candidaciesByStatus && (
        <SearchList
          searchFilter={searchFilter}
          searchResultsPage={candidaciesByStatus}
          FilterBar={<SortByBar />}
        >
          {(candidacy) => (
            <CandidacyCard
              key={candidacy.id}
              candidacyId={candidacy.id}
              candidateFirstname={candidacy.candidate?.firstname || ""}
              candidateFirstname2={candidacy.candidate?.firstname2 || undefined}
              candidateFirstname3={candidacy.candidate?.firstname3 || undefined}
              candidateMiddleNames={
                candidacy.candidate?.middleNames || undefined
              }
              candidateLastname={candidacy.candidate?.lastname || ""}
              candidateGivenName={candidacy.candidate?.givenName || undefined}
              certificationLabel={
                candidacy.certification
                  ? `RNCP ${candidacy?.certification.codeRncp} : ${candidacy?.certification?.label}`
                  : undefined
              }
              departmentCode={candidacy.candidate?.department?.code}
              departmentLabel={candidacy.candidate?.department?.label}
              organismLabel={
                candidacy.organism?.nomPublic || candidacy.organism?.label
              }
              organismModalitateAccompagnement={
                candidacy.organism?.modaliteAccompagnement
              }
              vaeCollective={!!candidacy.cohorteVaeCollective}
              vaeCollectiveCommanditaireLabel={
                candidacy.cohorteVaeCollective?.commanditaireVaeCollective
                  .raisonSociale
              }
              vaeCollectiveCohortLabel={candidacy.cohorteVaeCollective?.nom}
              status={candidacy.status}
              statusHistory={candidacy.candidacyStatuses}
              typeAccompagnement={candidacy.typeAccompagnement}
              feasibility={candidacy.feasibility}
              readyForJuryEstimatedAt={
                candidacy.readyForJuryEstimatedAt
                  ? toDate(candidacy.readyForJuryEstimatedAt)
                  : undefined
              }
              jury={candidacy.jury}
              dropout={candidacy.candidacyDropOut}
            />
          )}
        </SearchList>
      )}
    </CandidaciesLayout>
  );
}
