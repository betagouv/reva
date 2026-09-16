"use client";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Pagination } from "@codegouvfr/react-dsfr/Pagination";
import { SearchBar } from "@codegouvfr/react-dsfr/SearchBar";
import Select from "@codegouvfr/react-dsfr/Select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { RoleVaeCollective } from "@/graphql/generated/graphql";

import { updateRolesSpecificToCohorteOfSousCompteVaeCollective } from "./actions";
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

export const AccessRightsForm = ({
  commanditaireId,
  cohorteVaeCollectiveId,
  sousComptes,
  totalRows,
  backUrl,
}: {
  commanditaireId: string;
  cohorteVaeCollectiveId: string;
  sousComptes: SousCompteAccessRight[];
  totalRows: number;
  backUrl: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page") ?? "1");
  const searchFilter = searchParams.get("searchFilter") ?? "";

  // Store the previous value of sousComptes to avoid unnecessary re-renders
  const [previousSousComptes, setPreviousSousComptes] = useState(sousComptes);

  const [selectedRoleBySousCompteId, setSelectedRoleBySousCompteId] = useState<
    Record<string, SelectedRole>
  >(() =>
    Object.fromEntries(
      sousComptes.map((sousCompte) => [
        sousCompte.id,
        getSelectedRole(sousCompte.roles),
      ]),
    ),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pageCount = Math.ceil(totalRows / RECORDS_PER_PAGE);

  // Initialize new sousComptes entries in selectedRoleBySousCompteId during render when the sousComptes prop changes
  // (rather than in a useEffect), per https://react.dev/reference/react/useState#storing-information-from-previous-renders
  if (sousComptes !== previousSousComptes) {
    setPreviousSousComptes(sousComptes);
    setSelectedRoleBySousCompteId((previousRoleBySousCompteId) => {
      const nextRoleBySousCompteId = { ...previousRoleBySousCompteId };
      let changed = false;
      for (const sousCompte of sousComptes) {
        if (!(sousCompte.id in nextRoleBySousCompteId)) {
          nextRoleBySousCompteId[sousCompte.id] = getSelectedRole(
            sousCompte.roles,
          );
          changed = true;
        }
      }
      return changed ? nextRoleBySousCompteId : previousRoleBySousCompteId;
    });
  }

  const handleSearch = (filter: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("searchFilter", filter);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await updateRolesSpecificToCohorteOfSousCompteVaeCollective({
        commanditaireVaeCollectiveId: commanditaireId,
        cohorteVaeCollectiveId,
        sousComptesIdsAndRoles: Object.entries(selectedRoleBySousCompteId).map(
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
        key={searchFilter}
        className="mb-12 w-[500px]"
        label="Rechercher un nom, prénom, adresse électronique"
        defaultValue={searchFilter}
        onButtonClick={handleSearch}
        allowEmptySearch
      />
      <form onSubmit={handleSubmit}>
        {sousComptes.length > 0 ? (
          <ul className="flex flex-col gap-1 list-none px-0 my-0">
            {sousComptes.map((sousCompte, index) => (
              <li key={sousCompte.id}>
                <SousCompteLine
                  firstname={sousCompte.firstname}
                  lastname={sousCompte.lastname}
                  email={sousCompte.email}
                  bottomDelimiter={index === sousComptes.length - 1}
                  selectedRole={selectedRoleBySousCompteId[sousCompte.id]}
                  onRoleChange={(role) =>
                    setSelectedRoleBySousCompteId(
                      (previousRoleBySousCompteId) => ({
                        ...previousRoleBySousCompteId,
                        [sousCompte.id]: role,
                      }),
                    )
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
                getPageLinkProps={(page) => {
                  const params = new URLSearchParams(searchParams);
                  params.set("page", String(page));
                  return { href: `${pathname}?${params.toString()}` };
                }}
              />
            )}
          </div>
          <div>
            <Button
              type="submit"
              disabled={isSubmitting}
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
