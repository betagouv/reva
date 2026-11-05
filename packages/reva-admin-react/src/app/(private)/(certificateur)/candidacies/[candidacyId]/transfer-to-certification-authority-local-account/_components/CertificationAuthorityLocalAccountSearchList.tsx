import Button from "@codegouvfr/react-dsfr/Button";

import { SearchList } from "@/components/search/search-list/SearchList";

import {
  CertificationAuthorityLocalAccount,
  CertificationAuthorityLocalAccountPaginated,
} from "@/graphql/generated/types";

import { CertificationAuthorityLocalAccountCard } from "./CertificationAuthorityLocalAccountCard";

export const CertificationAuthorityLocalAccountSearchList = ({
  certificationAuthorities,
  searchFilter,
  setCertificationAuthorityLocalAccountSelected,
}: {
  certificationAuthorities: CertificationAuthorityLocalAccountPaginated;
  searchFilter: string;
  setCertificationAuthorityLocalAccountSelected: (
    certificationAuthorityLocalAccount: CertificationAuthorityLocalAccount,
  ) => void;
}) => {
  return (
    <SearchList
      searchResultsPage={
        certificationAuthorities as CertificationAuthorityLocalAccountPaginated
      }
      searchFilter={searchFilter}
      childrenContainerClassName="grid grid-cols-2 gap-5"
    >
      {(certificationAuthorityLocalAccount) =>
        certificationAuthorityLocalAccount ? (
          <CertificationAuthorityLocalAccountCard
            key={certificationAuthorityLocalAccount.id}
            certificationAuthorityLocalAccount={
              certificationAuthorityLocalAccount as CertificationAuthorityLocalAccount
            }
            buttonComponent={
              <Button
                className="ml-auto"
                priority="tertiary"
                onClick={() =>
                  setCertificationAuthorityLocalAccountSelected(
                    certificationAuthorityLocalAccount as CertificationAuthorityLocalAccount,
                  )
                }
              >
                Choisir
              </Button>
            }
          />
        ) : null
      }
    </SearchList>
  );
};
