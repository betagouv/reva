"use server";

import { getAccessTokenFromCookie } from "@/helpers/auth/get-access-token-from-cookie/getAccessTokenFromCookie";
import { throwUrqlErrors } from "@/helpers/graphql/throw-urql-errors/throwUrqlErrors";
import { client } from "@/helpers/graphql/urql-client/urqlClient";

import { graphql } from "@/graphql/generated";

const getConnectedUserAccountQuery = graphql(`
  query getConnectedUserAccountForParametresPage {
    account_getAccountForConnectedUser {
      id
      firstname
      lastname
      email
    }
  }
`);

export const getConnectedUserAccount = async () => {
  const accessToken = await getAccessTokenFromCookie();

  const result = throwUrqlErrors(
    await client.query(
      getConnectedUserAccountQuery,
      {},
      {
        fetchOptions: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      },
    ),
  );

  return result.data?.account_getAccountForConnectedUser;
};
