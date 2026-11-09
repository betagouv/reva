import { redirect } from "next/navigation";

import { isUserInRole } from "@/components/auth/actions";
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

const commanditaireGraphQlQuery = graphql(`
  query commanditaireVaeCollectiveForDashboardPage(
    $commanditaireVaeCollectiveId: ID!
  ) {
    vaeCollective_getCommanditaireVaeCollective(
      commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
    ) {
      metabaseDashboardIframeUrl
    }
  }
`);

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ commanditaireId: string }>;
}) {
  const accessToken = await getAccessTokenFromCookie();
  const { commanditaireId } = await params;

  if (!accessToken) {
    redirect("/login");
  }

  const isSousCompteVaeCollective = await isUserInRole(
    "sous_compte_vae_collective",
  );

  let metabaseDashboardIframeUrl = null;

  if (isSousCompteVaeCollective) {
    const result = throwUrqlErrors(
      await client.query(
        sousCompteGraphQlQuery,
        {},
        {
          fetchOptions: { headers: { Authorization: `Bearer ${accessToken}` } },
        },
      ),
    );
    metabaseDashboardIframeUrl =
      result.data?.vaeCollective_getSousCompteVaeCollectiveForConnectedUser
        ?.metabaseDashboardIframeUrl;
  } else {
    const result = throwUrqlErrors(
      await client.query(
        commanditaireGraphQlQuery,
        {
          commanditaireVaeCollectiveId: commanditaireId,
        },
        {
          fetchOptions: { headers: { Authorization: `Bearer ${accessToken}` } },
        },
      ),
    );
    metabaseDashboardIframeUrl =
      result.data?.vaeCollective_getCommanditaireVaeCollective
        ?.metabaseDashboardIframeUrl;
  }

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
