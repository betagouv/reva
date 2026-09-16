"use client";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Pagination } from "@codegouvfr/react-dsfr/Pagination";
import { SearchBar } from "@codegouvfr/react-dsfr/SearchBar";
import Select from "@codegouvfr/react-dsfr/Select";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RoleVaeCollective } from "@/graphql/generated/graphql";

import {
  getCommanditaireVaeCollectiveAndCohorteById,
  updateRolesSpecificToCohorteOfSousCompteVaeCollective,
} from "./actions";
import { RECORDS_PER_PAGE } from "./constants";

type CohorteRole = Extract<
  RoleVaeCollective,
  "LECTEUR_COHORTE" | "EDITEUR_COHORTE"
>;

const NO_ROLE = "AUCUN_DROIT" as const;

type SelectedRole = CohorteRole | typeof NO_ROLE;

const roleOptions: { value: SelectedRole; label: string }[] = [
  { value: NO_ROLE, label: "Aucun droit" },
  { value: "LECTEUR_COHORTE", label: "Droits de lecture" },
  { value: "EDITEUR_COHORTE", label: "Droits d'édition" },
];

const getSelectedRole = (roles: RoleVaeCollective[]): SelectedRole => {
  if (roles.includes("EDITEUR_COHORTE")) {
    return "EDITEUR_COHORTE";
  }
  if (roles.includes("LECTEUR_COHORTE")) {
    return "LECTEUR_COHORTE";
  }
  return NO_ROLE;
};

type SousCompteAccessRight = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  roles: RoleVaeCollective[];
};

const toAccessRight = (row: {
  id: string;
  account?: {
    firstname?: string | null;
    lastname?: string | null;
    email: string;
  } | null;
  rolesSpecificToCohorte: RoleVaeCollective[];
}): SousCompteAccessRight => ({
  id: row.id,
  firstname: row.account?.firstname ?? "",
  lastname: row.account?.lastname ?? "",
  email: row.account?.email ?? "",
  roles: row.rolesSpecificToCohorte,
});

export const AccessRightsForm = ({
  commanditaireId,
  cohorteVaeCollectiveId,
  initialSousComptes,
  totalRows,
  backUrl,
}: {
  commanditaireId: string;
  cohorteVaeCollectiveId: string;
  initialSousComptes: SousCompteAccessRight[];
  totalRows: number;
  backUrl: string;
}) => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState("");
  const [visibleSousComptes, setVisibleSousComptes] =
    useState(initialSousComptes);
  const [totalRowsCount, setTotalRowsCount] = useState(totalRows);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<
    Record<string, SelectedRole>
  >(() =>
    Object.fromEntries(
      initialSousComptes.map((sousCompte) => [
        sousCompte.id,
        getSelectedRole(sousCompte.roles),
      ]),
    ),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pageCount = Math.ceil(totalRowsCount / RECORDS_PER_PAGE);

  const loadPage = async (page: number, filter: string = searchFilter) => {
    setIsLoadingPage(true);
    try {
      const { sousComptesPage } =
        await getCommanditaireVaeCollectiveAndCohorteById(
          commanditaireId,
          cohorteVaeCollectiveId,
          page,
          filter || undefined,
        );
      const rows = (sousComptesPage?.rows ?? []).map(toAccessRight);

      setSelectedRoles((previousRoles) => {
        const nextRoles = { ...previousRoles };
        for (const sousCompte of rows) {
          if (!(sousCompte.id in nextRoles)) {
            nextRoles[sousCompte.id] = getSelectedRole(sousCompte.roles);
          }
        }
        return nextRoles;
      });
      setVisibleSousComptes(rows);
      setTotalRowsCount(sousComptesPage?.info.totalRows ?? 0);
      setCurrentPage(page);
    } finally {
      setIsLoadingPage(false);
    }
  };

  const handleSearch = (filter: string) => {
    setSearchFilter(filter);
    loadPage(1, filter);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await updateRolesSpecificToCohorteOfSousCompteVaeCollective({
        commanditaireVaeCollectiveId: commanditaireId,
        cohorteVaeCollectiveId,
        sousComptesIdsAndRoles: Object.entries(selectedRoles).map(
          ([sousCompteVaeCollectiveId, role]) => ({
            sousCompteVaeCollectiveId,
            roles: role === NO_ROLE ? [] : [role],
          }),
        ),
      });
      router.push(backUrl);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <SearchBar
        className="mb-12 w-[500px]"
        label="Rechercher un nom, prénom, adresse électronique"
        defaultValue={searchFilter}
        onButtonClick={handleSearch}
        allowEmptySearch
      />
      <form onSubmit={handleSubmit}>
        {visibleSousComptes.length > 0 ? (
          <ul className="flex flex-col gap-1 list-none px-0 my-0">
            {visibleSousComptes.map((sousCompte, index) => (
              <li key={sousCompte.id}>
                <SousCompteLine
                  firstname={sousCompte.firstname}
                  lastname={sousCompte.lastname}
                  email={sousCompte.email}
                  bottomDelimiter={index === visibleSousComptes.length - 1}
                  selectedRole={selectedRoles[sousCompte.id]}
                  onRoleChange={(role) =>
                    setSelectedRoles((previousRoles) => ({
                      ...previousRoles,
                      [sousCompte.id]: role,
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p>Aucun compte ne correspond à votre recherche.</p>
        )}

        <div className="flex justify-between items-center mt-6">
          <Button
            priority="tertiary"
            linkProps={{
              href: backUrl,
            }}
          >
            Retour
          </Button>
          <div>
            {pageCount > 1 && (
              <Pagination
                className="mt-4"
                showFirstLast={false}
                defaultPage={currentPage}
                count={pageCount}
                getPageLinkProps={(page) => ({
                  href: "#",
                  onClick: (event) => {
                    event.preventDefault();
                    if (page !== currentPage && !isLoadingPage) {
                      loadPage(page);
                    }
                  },
                })}
              />
            )}
          </div>
          <div>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingPage}
              data-testid="submit-access-rights-button"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

const SousCompteLine = ({
  firstname,
  lastname,
  email,
  bottomDelimiter,
  selectedRole,
  onRoleChange,
}: {
  firstname: string;
  lastname: string;
  email: string;
  bottomDelimiter?: boolean;
  selectedRole: SelectedRole;
  onRoleChange: (role: SelectedRole) => void;
}) => (
  <div className="flex flex-col">
    <hr className="pb-2 -ml-4 -mr-4" />
    <div className="flex justify-between items-start gap-4">
      <div>
        <div className="flex gap-2 mb-2 font-bold">
          {lastname} {firstname}
        </div>
        <div>{email}</div>
      </div>
      <Select
        className="w-64 mb-0 shrink-0"
        label="Droits d'accès"
        nativeSelectProps={{
          value: selectedRole,
          onChange: (event) => onRoleChange(event.target.value as SelectedRole),
          "aria-label": `Droits d'accès de ${firstname} ${lastname}`,
        }}
      >
        {roleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
    {bottomDelimiter && <hr className="mt-2 -ml-4 -mr-4" />}
  </div>
);
