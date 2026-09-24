import { Button } from "@codegouvfr/react-dsfr/Button";
import Image from "next/image";
import { redirect } from "next/navigation";

import { AapSelectionAdvice } from "@/components/aap-selection-advice/AapSelectionAdvice";
import { hasPermission } from "@/components/auth/actions";
import { getAccessTokenFromCookie } from "@/helpers/auth/get-access-token-from-cookie/getAccessTokenFromCookie";
import { throwUrqlErrors } from "@/helpers/graphql/throw-urql-errors/throwUrqlErrors";
import { client } from "@/helpers/graphql/urql-client/urqlClient";

import { graphql } from "@/graphql/generated";

import applicationPolygon from "./assets/application-polygon.svg";

const getCohortesTotalRows = async (commanditaireVaeCollectiveId: string) => {
  const accessToken = await getAccessTokenFromCookie();

  const result = throwUrqlErrors(
    await client.query(
      graphql(`
        query commanditaireVaeCollectiveCohortesCountForAucuneCohortePage(
          $commanditaireVaeCollectiveId: ID!
        ) {
          vaeCollective_getCommanditaireVaeCollective(
            commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
          ) {
            id
            cohorteVaeCollectives(offset: 0, limit: 1) {
              info {
                totalRows
              }
            }
          }
        }
      `),
      { commanditaireVaeCollectiveId },
      {
        fetchOptions: { headers: { Authorization: `Bearer ${accessToken}` } },
      },
    ),
  );

  return (
    result.data?.vaeCollective_getCommanditaireVaeCollective
      ?.cohorteVaeCollectives.info.totalRows ?? 0
  );
};

export default async function AucuneCohortePage({
  params,
}: {
  params: Promise<{ commanditaireId: string }>;
}) {
  const { commanditaireId } = await params;

  if ((await getCohortesTotalRows(commanditaireId)) > 0) {
    redirect(`/commanditaires/${commanditaireId}/cohortes/`);
  }

  const canCreateCohorte = await hasPermission({
    permission: "CREER_COHORTE",
  });

  return (
    <div className="flex flex-col-reverse items-center md:flex-row md:justify-between gap-[50px]">
      <div>
        <h1>Bienvenue dans votre espace France VAE</h1>
        {canCreateCohorte ? (
          <CanCreateCohorteBlock />
        ) : (
          <CannotCreateCohorteBlock />
        )}
      </div>
      <Image src={applicationPolygon} alt="icône application" />
    </div>
  );
}

const CanCreateCohorteBlock = () => (
  <>
    <p className="text-xl leading-loose">
      Retrouvez ici toutes les cohortes que vous avez créées.
    </p>
    <p className="text-xl leading-loose">
      Commencez en créant votre première cohorte.
    </p>
    <AapSelectionAdvice />
    <Button className="mt-4" linkProps={{ href: "./nouvelle-cohorte" }}>
      Créer une cohorte
    </Button>
  </>
);

const CannotCreateCohorteBlock = () => (
  <>
    <p className="text-xl leading-loose">
      Retrouvez ici toutes les cohortes qui vous concernent.
    </p>
    <p className="text-sm">
      Vous n’avez pas la possibilité de créer de cohortes. Cette option est
      actionnable par votre administrateur à la création de votre compte.
    </p>
  </>
);
