import Input from "@codegouvfr/react-dsfr/Input";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";

import { graphql } from "@/graphql/generated";

const RECORDS_PER_PAGE = 10;
const getCcnsQuery = graphql(`
  query getCCNsForCCNSearchList(
    $offset: Int
    $limit: Int
    $searchFilter: String
  ) {
    candidacy_getCandidacyCcns(
      offset: $offset
      limit: $limit
      searchFilter: $searchFilter
    ) {
      rows {
        id
        idcc
        label
      }
      info {
        totalRows
        currentPage
        totalPages
      }
    }
  }
`);

type ConventionCollective = { id: string; idcc: string; label: string };

export const CcnSearchList = ({
  conventionCollective,
  onCcnButtonClick: _onCcnButtonClick,
}: {
  conventionCollective?: ConventionCollective | null;
  onCcnButtonClick?(id: string): void;
}) => {
  const { graphqlClient } = useGraphQlClient();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = searchParams.get("page");
  const currentPage = page ? Number.parseInt(page) : 1;
  const searchFilter = searchParams.get("search") || "";

  const [inputValue, setInputValue] = useState(searchFilter);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedCcn, setSelectedCcn] = useState<ConventionCollective | null>(
    conventionCollective ?? null,
  );

  const refTimeout = useRef<NodeJS.Timeout | null>(null);

  const setSearchFilter = useCallback(
    (searchFilter: string) => {
      if (refTimeout.current) {
        clearTimeout(refTimeout.current);
      }

      refTimeout.current = setTimeout(() => {
        const queryParams = new URLSearchParams(searchParams);
        queryParams.set("search", searchFilter);
        router.push(`${pathname}?${queryParams.toString()}`);
      }, 150);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (inputValue !== searchFilter) {
      setSearchFilter(inputValue);
    }
  }, [inputValue, searchFilter, setSearchFilter]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    if (isFocused) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFocused]);

  const { data: getCCnsResponse } = useQuery({
    queryKey: ["getCcns", searchFilter, currentPage],
    queryFn: () =>
      graphqlClient.request(getCcnsQuery, {
        offset: (currentPage - 1) * RECORDS_PER_PAGE,
        searchFilter,
      }),
  });

  return (
    <div ref={containerRef} className="relative">
      <Input
        className="mb-0"
        label="Convention collective (IDCC)"
        nativeInputProps={{
          value: isFocused
            ? inputValue
            : selectedCcn
              ? `${selectedCcn.label} (${selectedCcn.idcc})`
              : "",
          onChange: (event) => {
            setInputValue(event.target.value);
          },
          onFocus: () => {
            setIsFocused(true);
          },
          placeholder: "Rechercher...",
        }}
      />
      {isFocused && getCCnsResponse?.candidacy_getCandidacyCcns.rows && (
        <div
          id="ccn-search-list"
          className="absolute z-10 max-h-80 w-full overflow-y-auto bg-white  py-2 shadow-[0px_2px_6px_0px_rgba(0,0,18,0.16)] mt-1"
        >
          {getCCnsResponse.candidacy_getCandidacyCcns.rows.map((ccn) => (
            <div
              key={ccn.id}
              className="px-4 py-2 cursor-pointer hover:bg-dsfrGray-contrast"
              onClick={() => {
                setSelectedCcn(ccn);
                _onCcnButtonClick?.(ccn.id);
                setIsFocused(false);
              }}
            >
              <div
                className="whitespace-normal"
                dangerouslySetInnerHTML={{
                  __html: ccn.label.replace(
                    new RegExp(searchFilter, "gi"),
                    `<strong>${searchFilter}</strong>`,
                  ),
                }}
              />
              <div className="text-xs text-gray-500">IDCC : {ccn.idcc}</div>
            </div>
          ))}

          {getCCnsResponse.candidacy_getCandidacyCcns.rows.length === 0 && (
            <div className="px-4 py-2 cursor-pointer hover:bg-dsfrGray-contrast">
              Aucun résultat trouvé
            </div>
          )}
        </div>
      )}
    </div>
  );
};
