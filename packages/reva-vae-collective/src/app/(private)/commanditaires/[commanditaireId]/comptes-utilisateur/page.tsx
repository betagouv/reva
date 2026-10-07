import { Button } from "@codegouvfr/react-dsfr/Button";
import { Pagination } from "@codegouvfr/react-dsfr/Pagination";
import { redirect } from "next/navigation";

import { RoleDependentBreadcrumb } from "@/components/role-dependent-breadcrumb/RoleDependentBreadcrumb";
import { getAccessTokenFromCookie } from "@/helpers/auth/get-access-token-from-cookie/getAccessTokenFromCookie";
import { throwUrqlErrors } from "@/helpers/graphql/throw-urql-errors/throwUrqlErrors";
import { client } from "@/helpers/graphql/urql-client/urqlClient";

import { graphql } from "@/graphql/generated";

import { SousCompteCard } from "./_components/SousCompteCard";

const RECORDS_PER_PAGE = 10;

const getSousComptes = async ({
  commanditaireVaeCollectiveId,
  sousComptePage = 1,
}: {
  commanditaireVaeCollectiveId: string;
  sousComptePage?: number;
}) => {
  const accessToken = await getAccessTokenFromCookie();

  const result = throwUrqlErrors(
    await client.query(
      graphql(`
        query commanditaireVaeCollectiveForComptesUtilisateurPage(
          $commanditaireVaeCollectiveId: ID!
          $offset: Int!
          $limit: Int!
        ) {
          vaeCollective_getCommanditaireVaeCollective(
            commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
          ) {
            id
            sousComptes(offset: $offset, limit: $limit) {
              info {
                totalRows
              }
              rows {
                id
                canCreateCohorteVaeCollective
                isAAPAccount
                account {
                  firstname
                  lastname
                }
              }
            }
          }
        }
      `),
      {
        commanditaireVaeCollectiveId,
        offset: (sousComptePage - 1) * RECORDS_PER_PAGE,
        limit: RECORDS_PER_PAGE,
      },
      {
        fetchOptions: { headers: { Authorization: `Bearer ${accessToken}` } },
      },
    ),
  );

  return result.data?.vaeCollective_getCommanditaireVaeCollective?.sousComptes;
};

export default async function ComptesUtilisateurPage({
  params,
  searchParams,
}: {
  params: Promise<{ commanditaireId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { commanditaireId } = await params;
  const { page } = await searchParams;

  const currentPage = page ? Number(page) : 1;

  const sousComptes = await getSousComptes({
    commanditaireVaeCollectiveId: commanditaireId,
    sousComptePage: currentPage,
  });

  if (!sousComptes) {
    throw new Error("Commanditaire non trouvé");
  }

  if (sousComptes.info.totalRows === 0) {
    redirect(
      `/commanditaires/${commanditaireId}/comptes-utilisateur/aucun-compte-utilisateur/`,
    );
  }

  return (
    <div className="flex flex-col">
      <RoleDependentBreadcrumb
        className="mt-0 mb-4"
        currentPageLabel="Gestion des comptes"
        segments={[]}
      />

      <h1>Gestion des comptes</h1>
      <p>
        Vous souhaitez partager des droits à certains de vos collaborateurs,
        vous pouvez leur créer des comptes et leur partager les informations
        nécessaires.
      </p>
      <Button
        className="ml-auto mr-auto md:mr-0 mt-12"
        priority="secondary"
        linkProps={{
          href: `/commanditaires/${commanditaireId}/comptes-utilisateur/nouveau-compte-utilisateur/`,
        }}
      >
        Ajouter un collaborateur
      </Button>
      <ul className="flex flex-col gap-4 list-none px-0 mt-4">
        {sousComptes.rows.map((sousCompte) => (
          <li key={sousCompte.id}>
            <SousCompteCard
              firstname={sousCompte.account?.firstname || ""}
              lastname={sousCompte.account?.lastname || ""}
              canCreateCohorte={sousCompte.canCreateCohorteVaeCollective}
              isAAPAccount={sousCompte.isAAPAccount}
              onClickHref={`/commanditaires/${commanditaireId}/comptes-utilisateur/${sousCompte.id}/`}
            />
          </li>
        ))}
      </ul>

      <Pagination
        classes={{
          root: "mt-12 ml-auto",
        }}
        showFirstLast={false}
        defaultPage={currentPage}
        count={Math.ceil(sousComptes.info.totalRows / RECORDS_PER_PAGE)}
        getPageLinkProps={(page) => ({
          href: `/commanditaires/${commanditaireId}/comptes-utilisateur?page=${page}`,
        })}
      />
    </div>
  );
}
