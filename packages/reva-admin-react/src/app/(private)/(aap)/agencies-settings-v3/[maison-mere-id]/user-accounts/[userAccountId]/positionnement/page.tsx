"use client";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Tag } from "@codegouvfr/react-dsfr/Tag";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { MultiSelectList } from "@/components/multi-select-list/MultiSelectList";

import { Organism } from "@/graphql/generated/types";

import { SettingsBreadcrumb } from "../../_components/SettingsBreadcrumb";

import { usePositionnementPage } from "./positionnement.hook";

const PositionnementPage = () => {
  const {
    "maison-mere-id": maisonMereAAPId,
    userAccountId,
  }: { "maison-mere-id": string; userAccountId: string } = useParams<{
    "maison-mere-id": string;
    userAccountId: string;
  }>();

  const searchParams = useSearchParams();
  const searchParamsPage = searchParams.get("page");
  const currentPage = searchParamsPage ? Number(searchParamsPage) : 1;
  const onlyShowAddedItems = searchParams.get("onlyShowAddedItems") === "true";
  const searchFilter = searchParams.get("searchFilter");

  const {
    userAccount,
    maisonMereAAPOrganismsPage,
    updatePositionnementCollaborateur,
  } = usePositionnementPage({
    maisonMereAAPId,
    userAccountId,
    page: currentPage,
    onlyShowUserOrganisms: onlyShowAddedItems,
    organismsSearchFilter: searchFilter,
  });
  const backUrl = `/agencies-settings-v3/${maisonMereAAPId}/user-accounts/${userAccountId}`;

  const userOrganismIds = useMemo(
    () => userAccount?.organisms.map((o) => o.id) || [],
    [userAccount?.organisms],
  );

  if (!userAccount) {
    return null;
  }
  return (
    <div className="w-full flex flex-col">
      <SettingsBreadcrumb
        currentPageLabel="Informations de connexion"
        maisonMereAAPId={maisonMereAAPId}
        segmentsAfterBaseSegments={[
          {
            label: userAccount.lastname + " " + userAccount.firstname,
            linkProps: {
              href: `/agencies-settings-v3/${maisonMereAAPId}/user-accounts/${userAccountId}`,
            },
          },
        ]}
      />
      <h1>Positionnement</h1>
      <p className="text-xl mb-12">
        Ajoutez tous les lieux d’accueil et accompagnement à distance au
        positionnement de votre collaborateur. Il aura alors accès à toutes les
        candidatures reçues.
      </p>

      <MultiSelectList
        className="mb-12"
        pageItems={maisonMereAAPOrganismsPage.rows.map((organism) =>
          getOrganismMultiSelectItem({
            organism,
            selected: userOrganismIds.includes(organism.id),
          }),
        )}
        paginationInfo={{
          totalItems: maisonMereAAPOrganismsPage.info.totalRows,
          totalPages: maisonMereAAPOrganismsPage.info.totalPages,
        }}
        itemTypeLabelForSearchResultsCount="organisme(s)"
        onSelectionChange={({ itemId, selected }) => {
          updatePositionnementCollaborateur.mutate({
            accountId: userAccountId,
            organismIds: selected
              ? [...userOrganismIds, itemId]
              : userOrganismIds.filter((id) => id !== itemId),
          });
        }}
        onlyShowAddedItemsSwitchLabel="Afficher uniquement les organismes ajoutés"
        searchBarLabel="Rechercher par intitulé de l’organisme, code postal ou ville"
        emptyStateTitle="Aucun lieu (présentiel et/ou distanciel) trouvé"
        emptyStateDescription="Vous n’avez pas encore configuré le lieu (présentiel et/ou distanciel) recherché ? Créez-le dès maintenant, puis ajoutez-le aux collaborateurs concernés."
        emptyStateShowAllItemsButtonLabel="Afficher tous les organismes"
      />
      <Button
        priority="secondary"
        className="mt-auto"
        linkProps={{ href: backUrl }}
      >
        Retour
      </Button>
    </div>
  );
};

export default PositionnementPage;

const getOrganismMultiSelectItem = ({
  organism,
  selected,
}: {
  organism: Pick<
    Organism,
    | "id"
    | "label"
    | "nomPublic"
    | "modaliteAccompagnement"
    | "disponiblePourVaeCollective"
    | "adresseNumeroEtNomDeRue"
    | "adresseInformationsComplementaires"
    | "adresseCodePostal"
    | "adresseVille"
    | "conformeNormesAccessibilite"
  >;
  selected: boolean;
}) => ({
  id: organism.id,
  selected,
  title: organism.nomPublic || organism.label,
  start: (
    <div className="flex gap-2">
      {organism.modaliteAccompagnement === "A_DISTANCE" && (
        <Tag small iconId="fr-icon-customer-service-fill">
          À distance
        </Tag>
      )}
      {organism.modaliteAccompagnement === "LIEU_ACCUEIL" && (
        <Tag small iconId="fr-icon-home-4-fill">
          Sur site
        </Tag>
      )}
      {organism.disponiblePourVaeCollective && <Tag small>VAE collective</Tag>}
    </div>
  ),
  desc: (
    <span className="flex flex-col gap-2">
      <span className="text-sm mb-0">
        {[
          organism.adresseNumeroEtNomDeRue,
          organism.adresseInformationsComplementaires,
          organism.adresseCodePostal,
          organism.adresseVille,
        ]
          .filter(Boolean)
          .join(" ")}
      </span>
      {organism.conformeNormesAccessibilite === "CONFORME" && (
        <span className="text-sm mt-0.5 mb-0">
          <span
            className="fr-icon-wheelchair-fill fr-icon--xs mr-1"
            aria-hidden="true"
          ></span>
          Accessibilité PMR
        </span>
      )}
    </span>
  ),
});
