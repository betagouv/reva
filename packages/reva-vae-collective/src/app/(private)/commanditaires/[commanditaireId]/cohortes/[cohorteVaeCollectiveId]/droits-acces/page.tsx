import { Button } from "@codegouvfr/react-dsfr/Button";
import { Pagination } from "@codegouvfr/react-dsfr/Pagination";

import { RoleDependentBreadcrumb } from "@/components/role-dependent-breadcrumb/RoleDependentBreadcrumb";

import { getCommanditaireVaeCollectiveAndCohorteById } from "./actions";

const RECORDS_PER_PAGE = 10;

export default async function AccessRightsPage({
  params,
  searchParams,
}: {
  params: Promise<{ commanditaireId: string; cohorteVaeCollectiveId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { commanditaireId, cohorteVaeCollectiveId } = await params;
  const { page } = await searchParams;

  const currentPage = page ? Number(page) : 1;

  const { cohorte, sousComptesPage } =
    await getCommanditaireVaeCollectiveAndCohorteById(
      commanditaireId,
      cohorteVaeCollectiveId,
      currentPage,
    );

  if (!cohorte) {
    throw new Error("Cohorte non trouvée");
  }

  return (
    <div className="flex flex-col w-full">
      <RoleDependentBreadcrumb
        className="mt-0 mb-4"
        currentPageLabel={cohorte.nom}
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
      <h1 className="mb-12">Droits d'accès</h1>

      <ul className="flex flex-col gap-1 list-none px-0 my-0">
        {sousComptesPage?.rows?.map((sousCompte, index) => (
          <li key={sousCompte.id}>
            <SousCompteLine
              firstname={sousCompte.account?.firstname ?? ""}
              lastname={sousCompte.account?.lastname ?? ""}
              email={sousCompte.account?.email}
              bottomDelimiter={index === sousComptesPage?.rows.length - 1}
            />
          </li>
        ))}
      </ul>

      <div className="flex justify-between mt-12 items-start">
        <Button
          priority="tertiary"
          linkProps={{
            href: `/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}`,
          }}
        >
          Retour
        </Button>
        <Pagination
          showFirstLast={false}
          defaultPage={currentPage}
          count={Math.ceil(
            (sousComptesPage?.info.totalRows ?? 0) / RECORDS_PER_PAGE,
          )}
          getPageLinkProps={(page) => ({
            href: `/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}/droits-acces?page=${page}`,
          })}
        />
      </div>
    </div>
  );
}

const SousCompteLine = ({
  firstname,
  lastname,
  email,
  bottomDelimiter,
}: {
  firstname: string;
  lastname: string;
  email: string;
  bottomDelimiter?: boolean;
}) => (
  <div className="flex flex-col">
    <hr className="pb-2 -ml-4 -mr-4" />
    <div className="flex gap-2 mb-2 font-bold">
      {lastname} {firstname}
    </div>
    <div>{email}</div>
    {bottomDelimiter && <hr className="mt-2 -ml-4 -mr-4" />}
  </div>
);
