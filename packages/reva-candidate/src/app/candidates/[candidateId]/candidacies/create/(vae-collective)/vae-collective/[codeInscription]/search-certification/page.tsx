"use client";

import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import { Card } from "@codegouvfr/react-dsfr/Card";
import { Pagination } from "@codegouvfr/react-dsfr/Pagination";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Panel } from "@/components/layout/Panel";
import { SearchBar } from "@/components/legacy/molecules/SearchBar/SearchBar";
import { LoaderWithLayout } from "@/components/loaders/LoaderWithLayout";

import {
  useGetVaeCollectiveCohort,
  useSearchCertification,
} from "./search-certification.hooks";

export default function SetCertification() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = searchParams.get("page");
  const searchFilter = searchParams.get("search") || "";
  const currentPage = page ? Number.parseInt(page) : 1;

  const { cohorteVaeCollective, isLoading } = useGetVaeCollectiveCohort();

  const { searchCertificationsForCandidate } = useSearchCertification({
    searchText: searchFilter,
    currentPage,
    cohorteVaeCollectiveIdFilter: cohorteVaeCollective?.id,
  });

  if (isLoading) {
    return <LoaderWithLayout />;
  }

  const info =
    searchCertificationsForCandidate.data?.searchCertificationsForCandidate
      .info;

  const rows =
    searchCertificationsForCandidate.data?.searchCertificationsForCandidate
      .rows;

  return (
    <Panel>
      <div data-testid="certificates">
        <Breadcrumb
          currentPageLabel="Choisir un diplôme"
          className="mb-0"
          segments={[
            {
              label: "Mes candidatures",
              linkProps: {
                href: "../../../../",
              },
            },
            {
              label: "Créer une candidature",
              linkProps: {
                href: "../../../",
              },
            },
            {
              label: "Rejoindre une VAE collective",
              linkProps: {
                href: "../../",
              },
            },
            {
              label: cohorteVaeCollective?.nom,
              linkProps: {
                href: "../",
              },
            },
          ]}
        />
        <>
          <h1 className="mt-4 mb-8">Choisir un diplôme</h1>
          <div className="mb-8 border-b-[4px] border-b-[#FFA180] shadow-[0px_6px_18px_0px_rgba(0,0,18,0.16)] py-8 px-8 w-full">
            <h2 className="mb-6">Recherchez parmi les diplômes disponibles</h2>
            <SearchBar
              label="Rechercher"
              searchFilter={searchFilter}
              onSearchFilterChange={(filter) => {
                const queryParams = new URLSearchParams(searchParams);
                if (filter && queryParams.get("page")) {
                  queryParams.set("page", "1");
                  queryParams.set("search", filter);
                } else if (filter) {
                  queryParams.set("search", filter);
                } else {
                  queryParams.delete("search");
                }

                const path = `${pathname}?${queryParams.toString()}`;
                router.push(path);
              }}
            />
          </div>

          {info && rows && (
            <>
              <p className="mb-2" role="status">
                Nombre de diplômes disponibles : {info?.totalRows}
              </p>
              <div className="flex flex-col gap-2.5">
                {rows?.map((certification) => (
                  <Card
                    size="small"
                    title={certification.label}
                    detail={`RNCP ${certification.codeRncp}`}
                    desc={certification.certificationAuthorityStructure?.label}
                    key={certification.id}
                    linkProps={{
                      href: `../?certificationId=${certification.id}`,
                    }}
                    enlargeLink
                    classes={{
                      detail: "mt-2",
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-center mt-auto mb-0 pt-8">
                <Pagination
                  defaultPage={info.currentPage}
                  count={info.totalPages}
                  getPageLinkProps={(page) => ({
                    href: `../search-certification?search=${searchFilter}&page=${page}`,
                  })}
                />
              </div>
            </>
          )}
        </>
      </div>
    </Panel>
  );
}
