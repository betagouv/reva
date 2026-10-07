"use server";

import { revalidatePath } from "next/cache";

import { getAccessTokenFromCookie } from "@/helpers/auth/get-access-token-from-cookie/getAccessTokenFromCookie";
import { throwUrqlErrors } from "@/helpers/graphql/throw-urql-errors/throwUrqlErrors";
import { client } from "@/helpers/graphql/urql-client/urqlClient";

import { graphql } from "@/graphql/generated";

const getSousCompteVaeCollectiveQuery = graphql(`
  query getSousCompteVaeCollective(
    $commanditaireVaeCollectiveId: ID!
    $sousCompteVaeCollectiveId: ID!
  ) {
    vaeCollective_getSousCompteVaeCollective(
      commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
      sousCompteVaeCollectiveId: $sousCompteVaeCollectiveId
    ) {
      id
      canCreateCohorteVaeCollective
      isAAPAccount
      account {
        firstname
        lastname
        email
      }
    }
  }
`);

const updateSousCompteVaeCollectiveMutation = graphql(`
  mutation updateSousCompteVaeCollective(
    $commanditaireVaeCollectiveId: ID!
    $sousCompteVaeCollectiveId: ID!
    $canCreateCohorteVaeCollective: Boolean!
  ) {
    vaeCollective_updateSousCompteVaeCollective(
      commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
      sousCompteVaeCollectiveId: $sousCompteVaeCollectiveId
      canCreateCohorteVaeCollective: $canCreateCohorteVaeCollective
    ) {
      id
      canCreateCohorteVaeCollective
    }
  }
`);

export const getSousCompteVaeCollective = async ({
  commanditaireVaeCollectiveId,
  sousCompteVaeCollectiveId,
}: {
  commanditaireVaeCollectiveId: string;
  sousCompteVaeCollectiveId: string;
}) => {
  const accessToken = await getAccessTokenFromCookie();

  const result = throwUrqlErrors(
    await client.query(
      getSousCompteVaeCollectiveQuery,
      {
        commanditaireVaeCollectiveId,
        sousCompteVaeCollectiveId,
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

  return result.data?.vaeCollective_getSousCompteVaeCollective;
};

export const updateSousCompteVaeCollective = async ({
  commanditaireVaeCollectiveId,
  sousCompteVaeCollectiveId,
  canCreateCohorteVaeCollective,
}: {
  commanditaireVaeCollectiveId: string;
  sousCompteVaeCollectiveId: string;
  canCreateCohorteVaeCollective: boolean;
}) => {
  const accessToken = await getAccessTokenFromCookie();

  throwUrqlErrors(
    await client.mutation(
      updateSousCompteVaeCollectiveMutation,
      {
        commanditaireVaeCollectiveId,
        sousCompteVaeCollectiveId,
        canCreateCohorteVaeCollective,
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
    `/commanditaires/${commanditaireVaeCollectiveId}/comptes-utilisateur/${sousCompteVaeCollectiveId}`,
  );
};
