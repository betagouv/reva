"use client";
import { useRouter, useSearchParams } from "next/navigation";

import { SectionCard } from "@/components/card/section-card/SectionCard";
import { useAnonymousFeatureFlipping } from "@/components/feature-flipping/featureFlipping";
import { FormOptionalFieldsDisclaimer } from "@/components/legacy/atoms/FormOptionalFieldsDisclaimer/FormOptionalFieldsDisclaimer";

import CandidateInformationForm from "./_components/CandidateInformationForm";
import { useProfile } from "./_components/useProfile";

export default function Profile() {
  const router = useRouter();
  const queryParams = useSearchParams();

  const navigationDisabledByQueryParam =
    queryParams.get("navigationDisabled") === "true";

  const { isFeatureActive } = useAnonymousFeatureFlipping();

  const isCandidateProfileV2FeatureActive = isFeatureActive(
    "CANDIDATE_PROFILE_V2",
  );

  const { countries, departments, candidate } = useProfile();

  if (!candidate || !departments || !countries) {
    return null;
  }

  return (
    <div className="flex flex-col w-full gap-6">
      {isCandidateProfileV2FeatureActive ? (
        <div className="flex flex-col gap-6">
          <h1 className="mb-0">Mon profil</h1>
          <p>
            Vérifiez et complétez vos informations de profil qui seront
            utilisées pour vous identifier et vous contacter pendant tout votre
            parcours de VAE.
          </p>
          <SectionCard
            titleIconClass="fr-icon-account-circle-fill"
            title="Mes informations civiles"
            hasButton
            buttonTitle="Modifier"
            buttonOnClick={() => router.push(`./civil-informations`)}
            buttonPriority="secondary"
          >
            <p className="mb-0">
              Retrouvez vos informations liées à votre état civil.
            </p>
          </SectionCard>

          <SectionCard
            titleIconClass="fr-icon-mail-fill"
            title="Mes informations de contact"
            hasButton
            buttonTitle="Modifier"
            buttonOnClick={() => router.push(`./contact-informations`)}
            buttonPriority="secondary"
          >
            <p className="mb-0">
              Retrouvez votre adresse postale, adresse électronique (de
              connexion et de contact) et votre numéro de téléphone.
            </p>
          </SectionCard>

          <SectionCard
            titleIconClass="fr-icon-government-fill"
            title="Ma typologie et convention collective"
            hasButton
            buttonTitle="Modifier"
            buttonOnClick={() =>
              router.push(`./typology-and-collective-agreement`)
            }
            buttonPriority="secondary"
          >
            <p className="mb-0">
              Retrouvez vos informations liées à votre profil professionnel.
            </p>
          </SectionCard>
        </div>
      ) : (
        <>
          <div>
            <h1 className="mb-1">Mon profil</h1>
            <FormOptionalFieldsDisclaimer className="mb-0" />
          </div>
          <CandidateInformationForm
            hideBackButton={navigationDisabledByQueryParam}
            candidate={candidate}
            countries={countries}
            departments={departments}
          />
        </>
      )}
    </div>
  );
}
