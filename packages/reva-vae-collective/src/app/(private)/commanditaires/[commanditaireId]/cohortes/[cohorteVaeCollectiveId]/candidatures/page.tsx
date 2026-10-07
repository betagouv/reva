import { Button } from "@codegouvfr/react-dsfr/Button";
import { Pagination } from "@codegouvfr/react-dsfr/Pagination";

import { RoleDependentBreadcrumb } from "@/components/role-dependent-breadcrumb/RoleDependentBreadcrumb";
import { getAccessTokenFromCookie } from "@/helpers/auth/get-access-token-from-cookie/getAccessTokenFromCookie";
import { getActiveFeatures } from "@/helpers/get-actives-features";
import { throwUrqlErrors } from "@/helpers/graphql/throw-urql-errors/throwUrqlErrors";
import { client } from "@/helpers/graphql/urql-client/urqlClient";

import { graphql } from "@/graphql/generated";

import { CandidacyCard } from "./_components/CandidacyCard";

const RECORDS_PER_PAGE = 10;

const getCandidacies = async ({
  commanditaireVaeCollectiveId,
  cohorteVaeCollectiveId,
  offset,
  searchFilter,
}: {
  commanditaireVaeCollectiveId: string;
  cohorteVaeCollectiveId: string;
  offset: number;
  searchFilter?: string;
}) => {
  const accessToken = await getAccessTokenFromCookie();

  const result = throwUrqlErrors(
    await client.query(
      graphql(`
        query getCandidaciesForCandidaciesPage(
          $commanditaireVaeCollectiveId: ID!
          $cohorteVaeCollectiveId: ID!
          $offset: Int
          $limit: Int
        ) {
          vaeCollective_getCohorteVaeCollectiveById(
            commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
            cohorteVaeCollectiveId: $cohorteVaeCollectiveId
          ) {
            id
            nom
            candidacies(offset: $offset, limit: $limit) {
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
                readyForJuryEstimatedAt
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
        }
      `),
      {
        commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId,
        offset,
        limit: RECORDS_PER_PAGE,
        searchFilter,
      },
      {
        fetchOptions: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      },
    ),
  );

  const cohorte = result.data?.vaeCollective_getCohorteVaeCollectiveById;
  const candidacies = cohorte?.candidacies;

  if (!cohorte) {
    throw new Error("Cohorte non trouvée");
  }

  if (!candidacies) {
    throw new Error("Candidatures non trouvées");
  }

  return { cohorte, candidacies };
};

export default async function CandidaturesPage({
  params,
  searchParams,
}: {
  params: Promise<{ commanditaireId: string; cohorteVaeCollectiveId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { commanditaireId, cohorteVaeCollectiveId } = await params;
  const { page } = await searchParams;

  const currentPage = Number(page) > 0 ? Number(page) : 1;

  const { cohorte, candidacies } = await getCandidacies({
    commanditaireVaeCollectiveId: commanditaireId,
    cohorteVaeCollectiveId,
    offset: (currentPage - 1) * RECORDS_PER_PAGE,
  });

  const { isFeatureActive } = await getActiveFeatures();
  const isMiddleNamesEnabled = isFeatureActive("MIDDLE_NAMES");

  const candidaturesPath = `/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}/candidatures`;

  const getPageHref = (pageNumber: number) => {
    const queryParams = new URLSearchParams();

    queryParams.set("page", String(pageNumber));
    return `${candidaturesPath}?${queryParams.toString()}`;
  };

  const emptyResult = candidacies.info.totalRows === 0;

  return (
    <div className="flex flex-col w-full">
      <RoleDependentBreadcrumb
        className="mt-0 mb-4"
        currentPageLabel="Candidatures"
        segments={[
          {
            label: "Cohortes",
            linkProps: {
              href: `/commanditaires/${commanditaireId}/cohortes`,
            },
          },
          {
            label: cohorte.nom,
            linkProps: {
              href: `/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}`,
            },
          },
        ]}
      />
      <h1 className="mb-10">Candidatures</h1>

      {emptyResult ? (
        <p>Aucune candidature</p>
      ) : (
        <ul
          data-testid="results"
          className="my-0 flex list-none flex-col gap-5 pl-0"
        >
          {candidacies.rows.map((candidacy) => (
            <li key={candidacy.id}>
              <CandidacyCard
                candidacy={candidacy}
                isMiddleNamesEnabled={isMiddleNamesEnabled}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex mt-12 items-start">
        <Button
          priority="secondary"
          linkProps={{
            href: `/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}`,
          }}
        >
          Retour
        </Button>

        {!emptyResult && (
          <Pagination
            classes={{
              root: "m-auto",
            }}
            showFirstLast={false}
            defaultPage={candidacies.info.currentPage}
            count={candidacies.info.totalPages}
            getPageLinkProps={(pageNumber) => ({
              href: getPageHref(pageNumber),
            })}
          />
        )}
      </div>
    </div>
  );
}
