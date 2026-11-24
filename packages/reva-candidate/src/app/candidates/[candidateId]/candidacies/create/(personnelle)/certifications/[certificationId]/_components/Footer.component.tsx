"use client";

import Button from "@codegouvfr/react-dsfr/Button";
import { useParams, useRouter } from "next/navigation";
import { useCallback } from "react";

import { useFeatureFlipping } from "@/components/feature-flipping/featureFlipping";
import { errorToast } from "@/components/toast/toast";

import { useCreateCandidacy } from "./createCandidacy.hook";

export function CertificationFooterComponent() {
  const router = useRouter();

  const { isFeatureActive } = useFeatureFlipping();
  const isAccompagnementV2Enabled = isFeatureActive("ACCOMPAGNEMENT_V2");

  const { createCandidacy } = useCreateCandidacy();

  const { candidateId, certificationId } = useParams<{
    candidateId: string;
    certificationId: string;
  }>();

  const handleCreateCandidacy = useCallback(async () => {
    if (!candidateId || !certificationId) return;

    const data = await createCandidacy.mutateAsync({
      candidateId: candidateId,
      data: {
        certificationId: certificationId,
        typeAccompagnement: "AUTONOME",
      },
    });

    if (data.candidacy_createCandidacy) {
      router.push(`../../../${data.candidacy_createCandidacy.id}`);
    } else {
      errorToast(
        "Une erreur est survenue lors de la création de la candidature",
      );
    }
  }, [candidateId, certificationId, createCandidacy, router]);

  return (
    <div className="flex flex-row justify-end mt-6">
      <Button
        className="justify-center w-[100%]  md:w-fit"
        onClick={() => {
          if (isAccompagnementV2Enabled) {
            handleCreateCandidacy();
          } else {
            router.push("./type-accompagnement");
          }
        }}
      >
        Choisir ce diplôme
      </Button>
    </div>
  );
}
