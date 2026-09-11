"use client";

import Button from "@codegouvfr/react-dsfr/Button";
import DsfrPagination from "@codegouvfr/react-dsfr/Pagination";
import SearchBar from "@codegouvfr/react-dsfr/SearchBar";
import { toDate } from "date-fns";
import { redirect, usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth";
import { CandidacyCard } from "@/components/card/candidacy-card/CandidacyCard";
import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";
import { SearchResultsHeader } from "@/components/search-results-header/SearchResultsHeader";

import { MaisonMereAAP } from "../_components/MaisonMereAAP";

import { useAnnuaire } from "./_components/annuaire.hook";
import { AnnuaireEmptyState } from "./_components/AnnuaireEmptyState";
import { CandidacyCardSkeleton } from "./_components/CandidacyCardSkeleton";
import { FiltersSection } from "./_components/FiltersSection";
import { SortByBar } from "./_components/SortByBar";

export default function AnnuairePage() {
  const { isFeatureActive } = useFeatureflipping();
  const isCandidaciesForAAPEnabled = isFeatureActive("CANDIDACIES_FOR_AAP");

  if (!isCandidaciesForAAPEnabled) {
    redirect("/candidacies");
  }

  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { isAdmin } = useAuth();

  const {
    candidacies,
    cohortes,
    isLoading,
    filters,
    searchFilter,
    setSearchFilter: onSearchFilterChange,
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
    maisonMereAAPId,
  } = useAnnuaire();

  const [localSearchFilter, setLocalSearchFilter] = useState(searchFilter);
  const [prevSearchFilter, setPrevSearchFilter] = useState(searchFilter);

  if (searchFilter !== prevSearchFilter) {
    setPrevSearchFilter(searchFilter);
    setLocalSearchFilter(searchFilter);
  }

  const emptyResult = useMemo(
    () => candidacies?.info?.totalRows === 0,
    [candidacies],
  );

  const searchParamsWithoutPage = useMemo<Record<string, string>>(() => {
    let params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.toLowerCase() !== "page") {
        params = { ...params, [key]: value };
      }
    });
    return params;
  }, [searchParams]);

  const buildPageHref = (page: number) => {
    const params = new URLSearchParams(searchParamsWithoutPage);
    params.set("page", String(page));
    const queryString = params.toString();

    return queryString ? `${pathname}?${queryString}` : pathname;
  };

  const getPathnameWithoutMaisonMereAAPId = (): string => {
    const currentParams = new URLSearchParams(searchParams);
    currentParams.delete("maisonMereAAPId");
    return `${pathname}?${currentParams.toString()}`;
  };

  return (
    <div className="w-full mx-auto max-w-[1248px]">
      {isAdmin && maisonMereAAPId && (
        <div className="mb-6">
          <h1>Candidatures du gestionnaire</h1>

          <MaisonMereAAP maisonMereAAPId={maisonMereAAPId} />

          <p className="mt-2">
            Ici, vous pouvez rechercher une ou plusieurs candidatures gérées par
            ce gestionnaire. Pour retrouver toutes les candidatures, cliquez sur
            “Accéder à toutes les candidatures”.
          </p>

          <Button
            priority="secondary"
            linkProps={{
              href: getPathnameWithoutMaisonMereAAPId(),
            }}
          >
            Accéder à toutes les candidatures
          </Button>
        </div>
      )}

      <h1 className="mb-10">Candidatures</h1>

      <div className="mb-10 bg-white px-6 py-8 shadow-lifted">
        <SearchBar
          label="Rechercher par nom, prénom, adresse électronique, numéro de téléphone, intitulé de certification etc..."
          allowEmptySearch
          big
          onButtonClick={() => onSearchFilterChange(localSearchFilter)}
          renderInput={({ className, id, placeholder, type }) => (
            <input
              className={className}
              id={id}
              placeholder={placeholder}
              type={type}
              value={localSearchFilter}
              onChange={(e) => setLocalSearchFilter(e.target.value)}
            />
          )}
        />
      </div>

      <div className="flex gap-6">
        <FiltersSection
          filters={filters}
          cohortes={cohortes}
          onToggleActiveCandidacies={toggleActiveCandidacies}
          onToggleCandidacyStatus={toggleCandidacyStatus}
          onToggleTypeAccompagnementStatus={toggleTypeAccompagnementStatus}
          onToggleTrainingStatus={toggleTrainingStatus}
          onToggleFeasibilityStatus={toggleFeasibilityStatus}
          onToggleDossierDeValidationStatus={toggleDossierDeValidationStatus}
          onToggleJuryStatus={toggleJuryStatus}
          onToggleJuryResults={toggleJuryResults}
          onToggleFundingStatus={toggleFundingStatus}
          onToggleArchiveStatus={toggleArchiveStatus}
          onToggleAccompagnementStatus={toggleAccompagnementStatus}
          onToggleCohorteVAECollective={toggleCohorteVAECollective}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <div className="flex-1">
          <div className="flex flex-col">
            <SearchResultsHeader
              className="mb-4"
              defaultSearchFilter={searchFilter}
              onSearchFilterChange={onSearchFilterChange}
              resultCount={candidacies?.info.totalRows || 0}
              addButton={<SortByBar />}
            />

            <ul data-testid="results" className="my-0 flex flex-col gap-5 pl-0">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <CandidacyCardSkeleton key={index} />
                ))
              ) : emptyResult ? (
                <AnnuaireEmptyState
                  onClearFilters={clearFilters}
                  hasActiveFilters={hasActiveFilters}
                />
              ) : (
                candidacies?.rows.map((candidacy) => (
                  <CandidacyCard
                    key={candidacy.id}
                    candidacyId={candidacy.id}
                    candidateFirstname={candidacy.candidate?.firstname || ""}
                    candidateFirstname2={
                      candidacy.candidate?.firstname2 || undefined
                    }
                    candidateFirstname3={
                      candidacy.candidate?.firstname3 || undefined
                    }
                    candidateMiddleNames={
                      candidacy.candidate?.middleNames || undefined
                    }
                    candidateLastname={candidacy.candidate?.lastname || ""}
                    candidateGivenName={
                      candidacy.candidate?.givenName || undefined
                    }
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
                    vaeCollectiveCohortLabel={
                      candidacy.cohorteVaeCollective?.nom
                    }
                    status={candidacy.status}
                    statusHistory={candidacy.candidacyStatuses}
                    typeAccompagnement={candidacy.typeAccompagnement}
                    feasibility={candidacy.feasibility}
                    dossierDeValidation={candidacy.activeDossierDeValidation}
                    readyForJuryEstimatedAt={
                      candidacy.readyForJuryEstimatedAt
                        ? toDate(candidacy.readyForJuryEstimatedAt)
                        : undefined
                    }
                    jury={candidacy.jury}
                    dropout={candidacy.candidacyDropOut}
                    endAccompagnementStatus={candidacy.endAccompagnementStatus}
                    endAccompagnementDate={candidacy.endAccompagnementDate}
                  />
                ))
              )}
            </ul>

            <br />

            {!emptyResult && candidacies?.info && (
              <div className="mx-auto my-12 flex [&_ul]:flex-nowrap">
                <DsfrPagination
                  defaultPage={candidacies.info.currentPage}
                  count={candidacies.info.totalPages}
                  getPageLinkProps={(page) => ({
                    href: buildPageHref(page),
                  })}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
