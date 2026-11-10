import { redirect } from "next/navigation";

import { getAccessTokenFromCookie } from "@/helpers/auth/get-access-token-from-cookie/getAccessTokenFromCookie";
import { throwUrqlErrors } from "@/helpers/graphql/throw-urql-errors/throwUrqlErrors";
import { client } from "@/helpers/graphql/urql-client/urqlClient";

import { graphql } from "@/graphql/generated";

const sousCompteGraphQlQuery = graphql(`
  query sousCompteVaeCollectiveForDashboardPage {
    vaeCollective_getSousCompteVaeCollectiveForConnectedUser {
      metabaseDashboardIframeUrl
    }
  }
`);

export default async function DashboardSousComptePage() {
  const accessToken = await getAccessTokenFromCookie();

  if (!accessToken) {
    redirect("/login");
  }

  const result = throwUrqlErrors(
    await client.query(
      sousCompteGraphQlQuery,
      {},
      {
        fetchOptions: { headers: { Authorization: `Bearer ${accessToken}` } },
      },
    ),
  );

  const metabaseDashboardIframeUrl =
    result.data?.vaeCollective_getSousCompteVaeCollectiveForConnectedUser
      ?.metabaseDashboardIframeUrl;

  if (!metabaseDashboardIframeUrl) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <h1>Pilotage</h1>
      <iframe src={metabaseDashboardIframeUrl} className="w-full h-screen" />
    </div>
  );
}
