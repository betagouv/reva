"use server";

import { revalidatePath } from "next/cache";

import { getAccessTokenFromCookie } from "@/helpers/auth/get-access-token-from-cookie/getAccessTokenFromCookie";
import { throwUrqlErrors } from "@/helpers/graphql/throw-urql-errors/throwUrqlErrors";
import { client } from "@/helpers/graphql/urql-client/urqlClient";

import { graphql } from "@/graphql/generated";
import { RoleVaeCollective } from "@/graphql/generated/graphql";

import { RECORDS_PER_PAGE } from "./constants";

const getCommanditaireVaeCollectiveAndCohorteByIdQuery = graphql(`
  query getCommanditaireVaeCollectiveAndCohorteByIdQuery(
    $commanditaireVaeCollectiveId: ID!
    $cohorteVaeCollectiveId: ID!
    $offset: Int!
    $limit: Int!
    $searchFilter: String
  ) {
    vaeCollective_getCommanditaireVaeCollective(
      commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
    ) {
      id
      sousComptes(offset: $offset, limit: $limit, searchFilter: $searchFilter) {
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
          rolesSpecificToCohorte(
            cohorteVaeCollectiveId: $cohorteVaeCollectiveId
          )
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

const updateRolesSpecificToCohorteOfSousCompteVaeCollectiveMutation = graphql(`
  mutation updateRolesSpecificToCohorteOfSousCompteVaeCollective(
    $commanditaireVaeCollectiveId: ID!
    $cohorteVaeCollectiveId: ID!
    $sousComptesIdsAndRoles: [SousCompteVaeCollectiveAndRoleInput!]!
  ) {
    vaeCollective_updateRolesSpecificToCohorteOfSousCompteVaeCollective(
      commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
      cohorteVaeCollectiveId: $cohorteVaeCollectiveId
      sousComptesIdsAndRoles: $sousComptesIdsAndRoles
    ) {
      id
    }
  }
`);

export const getCommanditaireVaeCollectiveAndCohorteById = async (
  commanditaireVaeCollectiveId: string,
  cohorteVaeCollectiveId: string,
  sousComptePage = 1,
  searchFilter?: string,
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
  const sousComptesPage =
    result.data?.vaeCollective_getCommanditaireVaeCollective?.sousComptes;

  return {
    cohorte,
    sousComptesPage,
  };
};

export const updateRolesSpecificToCohorteOfSousCompteVaeCollective = async ({
  commanditaireVaeCollectiveId,
  cohorteVaeCollectiveId,
  sousComptesIdsAndRoles,
}: {
  commanditaireVaeCollectiveId: string;
  cohorteVaeCollectiveId: string;
  sousComptesIdsAndRoles: {
    sousCompteVaeCollectiveId: string;
    roles: RoleVaeCollective[];
  }[];
}) => {
  const accessToken = await getAccessTokenFromCookie();

  throwUrqlErrors(
    await client.mutation(
      updateRolesSpecificToCohorteOfSousCompteVaeCollectiveMutation,
      {
        commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId,
        sousComptesIdsAndRoles,
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

  revalidatePath(
    `/commanditaires/${commanditaireVaeCollectiveId}/cohortes/${cohorteVaeCollectiveId}/droits-acces`,
  );
};
