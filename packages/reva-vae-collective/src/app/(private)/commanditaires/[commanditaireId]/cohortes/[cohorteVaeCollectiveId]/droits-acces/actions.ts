"use server";

import { getAccessTokenFromCookie } from "@/helpers/auth/get-access-token-from-cookie/getAccessTokenFromCookie";
import { throwUrqlErrors } from "@/helpers/graphql/throw-urql-errors/throwUrqlErrors";
import { client } from "@/helpers/graphql/urql-client/urqlClient";

import { graphql } from "@/graphql/generated";

const RECORDS_PER_PAGE = 10;

const getCommanditaireVaeCollectiveAndCohorteByIdQuery = graphql(`
  query getCommanditaireVaeCollectiveAndCohorteByIdQuery(
    $commanditaireVaeCollectiveId: ID!
    $cohorteVaeCollectiveId: ID!
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
          account {
            firstname
            lastname
            email
          }
        }
      }
    }
    vaeCollective_getCohorteVaeCollectiveById(
      commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
      cohorteVaeCollectiveId: $cohorteVaeCollectiveId
    ) {
      id
      nom
    }
  }
`);

export const getCommanditaireVaeCollectiveAndCohorteById = async (
  commanditaireVaeCollectiveId: string,
  cohorteVaeCollectiveId: string,
  sousComptePage = 1,
) => {
  const accessToken = await getAccessTokenFromCookie();

  const result = throwUrqlErrors(
    await client.query(
      getCommanditaireVaeCollectiveAndCohorteByIdQuery,
      {
        commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId,
        offset: (sousComptePage - 1) * RECORDS_PER_PAGE,
        limit: RECORDS_PER_PAGE,
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
  const sousComptesPage =
    result.data?.vaeCollective_getCommanditaireVaeCollective?.sousComptes;

  return {
    cohorte,
    sousComptesPage,
  };
};
