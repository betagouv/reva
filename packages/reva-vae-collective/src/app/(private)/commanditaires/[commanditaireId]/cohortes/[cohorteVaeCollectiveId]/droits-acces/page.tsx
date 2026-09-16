import { RoleDependentBreadcrumb } from "@/components/role-dependent-breadcrumb/RoleDependentBreadcrumb";

import { AccessRightsForm } from "./AccessRightsForm";
import { getCommanditaireVaeCollectiveAndCohorteById } from "./actions";

export default async function AccessRightsPage({
  params,
  searchParams,
}: {
  params: Promise<{ commanditaireId: string; cohorteVaeCollectiveId: string }>;
  searchParams: Promise<{ page?: string; searchFilter?: string }>;
}) {
  const { commanditaireId, cohorteVaeCollectiveId } = await params;
  const { page, searchFilter } = await searchParams;

  const currentPage = page ? Number(page) : 1;

  const { cohorte, sousComptesPage } =
    await getCommanditaireVaeCollectiveAndCohorteById(
      commanditaireId,
      cohorteVaeCollectiveId,
      currentPage,
      searchFilter || undefined,
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

      <AccessRightsForm
        commanditaireId={commanditaireId}
        cohorteVaeCollectiveId={cohorteVaeCollectiveId}
        totalRows={sousComptesPage?.info.totalRows ?? 0}
        sousComptes={(sousComptesPage?.rows ?? []).map((sousCompte) => ({
          id: sousCompte.id,
          firstname: sousCompte.account?.firstname ?? "",
          lastname: sousCompte.account?.lastname ?? "",
          email: sousCompte.account?.email ?? "",
          roles: sousCompte.rolesSpecificToCohorte,
        }))}
        backUrl={`/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}`}
      />
    </div>
  );
}
