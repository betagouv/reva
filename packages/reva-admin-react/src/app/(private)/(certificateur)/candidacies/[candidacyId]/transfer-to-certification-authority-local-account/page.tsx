"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { graphqlErrorToast, successToast } from "@/components/toast/toast";

import {
  CertificationAuthorityLocalAccount,
  CertificationAuthorityLocalAccountPaginated,
} from "@/graphql/generated/types";

import { CertificationAuthorityLocalAccountSearchList } from "./_components/CertificationAuthorityLocalAccountSearchList";
import { CertificationAuthorityLocalAccountValidation } from "./_components/CertificationAuthorityLocalAccountValidation";
import { EmptyStateCertificationAuthorityLocalAccountSearch } from "./_components/EmptyStateCertificationAuthorityLocalAccountSearch";
import { useTransferCandidacy } from "./_components/transferCandidacy.hook";

export default function TransferCandidacyPage() {
  const router = useRouter();

  const searchParams = useSearchParams();
  const searchFilter = searchParams.get("search") || "";

  const [
    certificationAuthorityLocalAccountSelected,
    setCertificationAuthorityLocalAccountSelected,
  ] = useState<CertificationAuthorityLocalAccount | null>(null);

  const {
    certificationAuthorities,
    certificationAuthoritiesStatus,
    certificationAuthoritiesIsLoading,
    transferCandidacyToCertificationAuthorityLocalAccountMutation,
    candidacy,
    candidacyIsLoading,
  } = useTransferCandidacy({ searchFilter });

  const handleTransferCandidacy = async ({
    certificationAuthorityLocalAccountId,
    transferReason,
  }: {
    certificationAuthorityLocalAccountId: string;
    transferReason: string;
  }) => {
    try {
      await transferCandidacyToCertificationAuthorityLocalAccountMutation({
        certificationAuthorityLocalAccountId,
        transferReason,
      });

      successToast({
        title: "La candidature a été transférée avec succès",
        closable: true,
      });
      router.push("/candidacies/annuaire");
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  if (
    certificationAuthoritiesIsLoading ||
    candidacyIsLoading ||
    certificationAuthoritiesStatus !== "success"
  ) {
    return null;
  }

  return (
    <div>
      <h1>Transférer la candidature vers un autre compte collaborateur</h1>
      <p className="text-xl">
        {certificationAuthorityLocalAccountSelected
          ? `Vous vous apprêtez à transférer la candidature de ${candidacy?.candidate?.firstname} ${candidacy?.candidate?.lastname} visant la certification ${candidacy?.certification?.label} à un collaborateur.`
          : "Recherchez le collaborateur auquel vous souhaitez transférer cette candidature."}
      </p>

      <div className="my-12">
        {certificationAuthorityLocalAccountSelected ? (
          <CertificationAuthorityLocalAccountValidation
            certificationAuthorityLocalAccount={
              certificationAuthorityLocalAccountSelected
            }
            setCertificationAuthorityLocalAccountSelected={
              setCertificationAuthorityLocalAccountSelected
            }
            onTransferCandidacy={(transferReason: string) =>
              handleTransferCandidacy({
                certificationAuthorityLocalAccountId:
                  certificationAuthorityLocalAccountSelected.id,
                transferReason,
              })
            }
          />
        ) : (
          <>
            <CertificationAuthorityLocalAccountSearchList
              certificationAuthorities={
                certificationAuthorities as CertificationAuthorityLocalAccountPaginated
              }
              searchFilter={searchFilter}
              setCertificationAuthorityLocalAccountSelected={
                setCertificationAuthorityLocalAccountSelected
              }
            />
            {certificationAuthorities?.rows?.length === 0 && (
              <EmptyStateCertificationAuthorityLocalAccountSearch
                searchFilter={searchFilter}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
