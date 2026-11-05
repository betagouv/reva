"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { graphqlErrorToast, successToast } from "@/components/toast/toast";

import {
  CertificationAuthority,
  CertificationAuthorityPaginated,
} from "@/graphql/generated/types";

import { CertificationAuthoritySearchList } from "./_components/CertificationAuthoritySearchList";
import { CertificationAuthorityValidation } from "./_components/CertificationAuthorityValidation";
import { EmptyStateCertificationSearch } from "./_components/EmptyStateCertificationSearch";
import { useTransferCandidacy } from "./_components/transferCandidacy.hook";

export default function TransferCandidacyPage() {
  const router = useRouter();

  const searchParams = useSearchParams();
  const searchFilter = searchParams.get("search") || "";

  const [certificationAuthoritySelected, setCertificationAuthoritySelected] =
    useState<CertificationAuthority | null>(null);

  const {
    certificationAuthorities,
    certificationAuthoritiesStatus,
    certificationAuthoritiesIsLoading,
    transferCandidacyToAnotherCertificationAuthorityMutation,
    candidacy,
    candidacyIsLoading,
  } = useTransferCandidacy({ searchFilter });

  const handleTransferCandidacy = async ({
    certificationAuthorityId,
    transferReason,
  }: {
    certificationAuthorityId: string;
    transferReason: string;
  }) => {
    try {
      await transferCandidacyToAnotherCertificationAuthorityMutation({
        certificationAuthorityId,
        transferReason,
      });

      successToast({
        title: "La candidature a été transférée avec succès",
        description:
          "Le nouveau service recevra un courriel pour prendre connaissance de ce transfert.",
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
      <h1>
        Transférer la candidature vers un autre gestionnaire de candidature
        administrateur
      </h1>
      <p className="text-xl">
        {certificationAuthoritySelected
          ? `Vous vous apprêtez à transférer la candidature de ${candidacy?.candidate?.firstname} ${candidacy?.candidate?.lastname} visant la certification ${candidacy?.certification?.label} à un nouveau service.`
          : "Recherchez le gestionnaire de candidature administrateur auquel vous souhaitez transférer cette candidature."}
      </p>

      <div className="my-12">
        {certificationAuthoritySelected ? (
          <CertificationAuthorityValidation
            certificationAuthority={certificationAuthoritySelected}
            setCertificationAuthoritySelected={
              setCertificationAuthoritySelected
            }
            onTransferCandidacy={(transferReason: string) =>
              handleTransferCandidacy({
                certificationAuthorityId: certificationAuthoritySelected.id,
                transferReason,
              })
            }
          />
        ) : (
          <>
            <CertificationAuthoritySearchList
              certificationAuthorities={
                certificationAuthorities as CertificationAuthorityPaginated
              }
              searchFilter={searchFilter}
              setCertificationAuthoritySelected={
                setCertificationAuthoritySelected
              }
            />
            {certificationAuthorities?.rows?.length === 0 && (
              <EmptyStateCertificationSearch searchFilter={searchFilter} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
