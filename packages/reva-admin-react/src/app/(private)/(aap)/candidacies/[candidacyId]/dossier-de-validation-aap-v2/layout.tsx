"use client";

import { redirect, useParams } from "next/navigation";
import { ReactNode } from "react";

import { Skeleton } from "@/components/aap-candidacy-layout/Skeleton";
import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";

const DossierDeValidationAapV2Layout = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { candidacyId } = useParams<{ candidacyId: string }>();
  const { isFeatureActive, status } = useFeatureflipping();

  if (status !== "INITIALIZED") {
    return <Skeleton />;
  }

  if (!isFeatureActive("NEW_DV_PAGE")) {
    redirect(`/candidacies/${candidacyId}/dossier-de-validation-aap`);
  }

  return children;
};

export default DossierDeValidationAapV2Layout;
