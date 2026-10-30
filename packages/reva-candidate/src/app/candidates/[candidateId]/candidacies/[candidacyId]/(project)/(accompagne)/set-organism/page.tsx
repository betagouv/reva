"use client";

import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import { redirect, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state/EmptyState";
import { SearchBar } from "@/components/legacy/molecules/SearchBar/SearchBar";
import { OrganismCard } from "@/components/legacy/organisms/OrganismCard/OrganismCard";
import { OrganismFilters } from "@/components/legacy/organisms/OrganismFilters/OrganismFilters";
import { PICTOGRAMS } from "@/components/pictograms/Pictograms";
import { graphqlErrorToast } from "@/components/toast/toast";

import { Organism } from "@/graphql/generated/graphql";

import { useSetOrganism } from "./set-organism.hooks";

const RECORDS_PER_PAGE = 10;
const MAX_RECORDS = 50;

interface State {
  rows: Organism[];
  offset: number;
  hasMore: boolean;
}

export default function SetOrganism() {
  const router = useRouter();

  const [organismSearchText, setOrganismSearchText] = useState<string>("");
  const [organismSearchOnsite, setOrganismSearchOnsite] =
    useState<boolean>(false);
  const [organismSearchRemote, setOrganismSearchRemote] =
    useState<boolean>(false);
  const [organismSearchZip, setOrganismSearchZip] = useState<string>("");
  const [organismSearchPmr, setOrganismSearchPmr] = useState<boolean>(false);
  const [organismSearchMcf, setOrganismSearchMcf] = useState<boolean>(false);
  const [organismSearchIsAvailable, setOrganismSearchIsAvailable] =
    useState<boolean>(false);

  const resetFilters = () => {
    setOrganismSearchOnsite(false);
    setOrganismSearchRemote(false);
    setOrganismSearchZip("");
    setOrganismSearchPmr(false);
    setOrganismSearchMcf(false);
  };

  const {
    getRandomOrganismsForCandidacy,
    selectOrganism,
    canEditCandidacy,
    candidacy,
    hasSelectedCertification,
  } = useSetOrganism({
    searchText: organismSearchText,
    searchFilter: {
      distanceStatus: organismSearchOnsite
        ? "ONSITE"
        : organismSearchRemote
          ? "REMOTE"
          : undefined,
      pmr: organismSearchPmr,
      zip: organismSearchZip,
      isMcfCompatible: organismSearchMcf,
      isAvailable: organismSearchIsAvailable,
    },
  });

  const organisms =
    getRandomOrganismsForCandidacy?.data?.getRandomOrganismsForCandidacy;
  const isLoading =
    getRandomOrganismsForCandidacy?.isFetching ||
    getRandomOrganismsForCandidacy?.isPending;

  useEffect(() => {
    if (getRandomOrganismsForCandidacy.isError) {
      graphqlErrorToast(getRandomOrganismsForCandidacy.error);
    }
  }, [
    getRandomOrganismsForCandidacy.error,
    getRandomOrganismsForCandidacy.isError,
  ]);

  const [state, setState] = useState<State>({
    rows: [],
    offset: 0,
    hasMore: false,
  });

  const { offset: stateOffset } = state;

  const loadOrganisms = useCallback(
    (offset: number) => {
      const rows = (organisms?.rows || []).slice(0, offset);

      setState({
        rows: rows as Organism[],
        offset,
        hasMore: rows.length < (organisms?.rows || []).length,
      });
    },
    [organisms?.rows],
  );

  useEffect(() => {
    loadOrganisms(RECORDS_PER_PAGE);
  }, [loadOrganisms]);

  const submitOrganism = async (organismId: string) => {
    try {
      const response = await selectOrganism.mutateAsync({
        organismId,
      });
      if (response) {
        router.push("../");
      }
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  if (!candidacy) {
    return null;
  }

  if (!hasSelectedCertification) {
    redirect("../");
  }

  if (!canEditCandidacy) {
    redirect("../");
  }
  return (
    <div className="w-full px-6">
      <div data-testid="organisms">
        <Breadcrumb
          currentPageLabel="Choix de l'accompagnateur"
          className="mb-0"
          segments={[
            {
              label: "Ma candidature",
              linkProps: {
                href: "../",
              },
            },
          ]}
        />
        <h1 className="mt-4 mb-2" id="page-title">
          Choix de l'accompagnateur
        </h1>
        <p className="text-xl my-6">
          Vous pouvez choisir de réaliser votre accompagnement à distance ou sur
          site. Si vous pouvez bénéficiez de Mon compte Formation, pensez à
          choisir un accompagnateur référencé sur MCF.
        </p>

        <div className="bg-white mt-6 lg:mb-8 lg:px-10 pb-10 lg:py-8 lg:shadow-lifted border-b lg:border-b-4 lg:border-[#FFA180]">
          <h3>Recherchez par nom</h3>
          <SearchBar
            label="Recherchez votre organisme d’accompagnement en saisissant son nom"
            searchFilter={organismSearchText}
            onSearchFilterChange={setOrganismSearchText}
            debounceMs={200}
            className="mt-6"
          />
        </div>
        <div className="lg:flex gap-x-6">
          <div className="max-w-[282px]">
            <OrganismFilters
              onSearch={(filters) => {
                setOrganismSearchOnsite(filters.organismSearchOnsite);
                setOrganismSearchRemote(filters.organismSearchRemote);
                setOrganismSearchZip(filters.organismSearchZip);
                setOrganismSearchPmr(filters.organismSearchPmr);
                setOrganismSearchMcf(filters.organismSearchMcf);
                setOrganismSearchIsAvailable(filters.organismSearchIsAvailable);
              }}
              filters={{
                organismSearchText,
                organismSearchRemote,
                organismSearchOnsite,
                organismSearchZip,
                organismSearchPmr,
                organismSearchMcf,
                organismSearchIsAvailable,
              }}
            />
          </div>
          <div className="flex-1">
            {isLoading ? (
              <Loader />
            ) : (
              <>
                {organisms && organisms.totalRows > 0 ? (
                  <p className="mt-3 mb-4 text-gray-500">
                    {organisms.totalRows === 1
                      ? `Résultat filtré : ${organisms.totalRows} accompagnateur`
                      : `Résultats filtrés : ${organisms.totalRows} accompagnateurs`}
                  </p>
                ) : (
                  <NoOrganisms
                    organismSearchText={organismSearchText}
                    resetFilters={resetFilters}
                  />
                )}
              </>
            )}

            <Organisms
              selectedOrganismId={candidacy.organism?.id}
              submitOrganism={({ organismId }) => {
                submitOrganism(organismId);
              }}
              availableOrganisms={{
                rows: state.rows,
                totalRows: organisms?.totalRows || 0,
              }}
            />
            <div className="mt-4 w-full flex flex-row items-center justify-center">
              {state.hasMore ? (
                <Button
                  data-testid="project-organisms-refresh-organisms"
                  priority="secondary"
                  nativeButtonProps={{
                    onClick: () => {
                      const nextOffset = stateOffset + RECORDS_PER_PAGE;
                      loadOrganisms(nextOffset);
                    },
                  }}
                >
                  Afficher plus d’organismes
                </Button>
              ) : (
                stateOffset === MAX_RECORDS && (
                  <div className="flex flex-col md:flex-row items-start">
                    <p className="mt-0 text-lg">
                      Vous n’avez pas trouvé d’accompagnateur ? Utilisez des
                      filtres pour préciser votre recherche ou tapez le nom d’un
                      accompagnateur précis dans la barre de recherche.
                    </p>
                    <a
                      href="#page-title"
                      className="text-nowrap md:ml-6 fr-link fr-icon-arrow-up-fill fr-link--icon-left"
                    >
                      Haut de page
                    </a>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PropsOrganisms {
  submitOrganism: ({ organismId }: { organismId: string }) => void;
  availableOrganisms?: { rows: Organism[]; totalRows: number };
  selectedOrganismId?: string;
}

const Organisms: React.FC<PropsOrganisms> = ({
  submitOrganism,
  availableOrganisms = { rows: [], totalRows: 0 },
  selectedOrganismId,
}) => (
  <div className="flex flex-col gap-4">
    {availableOrganisms.rows.map((organism) => {
      return (
        <OrganismCard
          key={organism.id}
          isSelected={selectedOrganismId == organism.id}
          organism={organism}
          onClick={() => submitOrganism({ organismId: organism.id })}
        />
      );
    })}
  </div>
);

const NoOrganisms = ({
  organismSearchText,
  resetFilters,
}: {
  organismSearchText?: string;
  resetFilters: () => void;
}) => {
  if (organismSearchText) {
    return (
      <EmptyState
        data-testid="no-results-for-search-by-name"
        title={`Pas de résultats pour "${organismSearchText}"`}
        pictogram={PICTOGRAMS.searchLG}
      >
        <p>
          Si l’erreur persiste, après vérification du nom renseigné et
          réinitialisation des filtres sélectionnés, plusieurs possibilités :
        </p>
        <p className="max-w-[500px]">
          <ul>
            <li>
              L’accompagnateur recherché ne prend pas en charge la <br />
              certification sélectionnée
            </li>
            <li>L’accompagnateur n’est pas référencé sur France VAE</li>
          </ul>
        </p>
        <label className="fr-label fr-hint-text">
          Contactez l’accompagnateur souhaité pour comprendre avec lui pourquoi
          il n’apparaît
          <br />
          pas dans la liste.
        </label>
      </EmptyState>
    );
  }

  return (
    <EmptyState
      data-testid="no-results-for-filters"
      title="Aucun résultat trouvé"
      pictogram={PICTOGRAMS.searchLG}
    >
      <p>
        Nous ne trouvons pas d’accompagnateurs sur votre diplôme avec les
        critères sélectionnés.
      </p>
      <Button
        data-testid="no-results-button-reset-filters"
        onClick={resetFilters}
      >
        Réinitialiser les filtres
      </Button>
    </EmptyState>
  );
};

const Loader = () => {
  const [count, setCount] = useState<number>(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCount(count == 3 ? 1 : count + 1);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [count]);

  return (
    <p className="mt-3 mb-4 text-gray-500">
      Veuillez patienter. Recherche en cours
      {Array(count)
        .fill(".")
        .map((v) => v)}
    </p>
  );
};
