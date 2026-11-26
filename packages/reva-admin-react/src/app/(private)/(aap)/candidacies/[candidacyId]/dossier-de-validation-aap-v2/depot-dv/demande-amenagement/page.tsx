"use client";

import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import Input from "@codegouvfr/react-dsfr/Input";
import { useParams } from "next/navigation";

import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { FormButtons } from "@/components/form/form-footer/FormButtons";

import { AmenagementResourcesSection } from "./_components/AmenagementResourcesSection";

export default function AmenagementPage() {
  const { candidacyId } = useParams<{ candidacyId: string }>();

  return (
    <div className="flex flex-col">
      <Breadcrumb
        currentPageLabel="Aménagement spécifique"
        className="mb-4"
        segments={[
          {
            label: "Aperçu de la candidature",
            linkProps: {
              href: `/candidacies/${candidacyId}/summary`,
            },
          },
          {
            label: "Dossier de validation",
            linkProps: {
              href: `/candidacies/${candidacyId}/dossier-de-validation-aap-v2`,
            },
          },
          {
            label: "Dépôt du dossier de validation",
            linkProps: {
              href: `/candidacies/${candidacyId}/dossier-de-validation-aap-v2/depot-dv`,
            },
          },
        ]}
      />
      <h1>Aménagement spécifique</h1>
      <div>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex flex-col gap-2">
              <Input
                textArea
                label="Besoin d’un aménagement spécifique pour le passage devant le jury :"
                hintText="Décrivez les aménagements dont vous souhaitez bénéficier lors du passage devant le jury pour son bon déroulement. Ces informations seront transmises au certificateur avec le dossier de validation. Il examinera votre demande."
                nativeTextAreaProps={{
                  name: "amenagementSpecifiqueDescription",
                  rows: 10,
                }}
              />
              <FancyUpload
                title="Joindre le justificatif"
                description="Ce document ne sera pas conservé par France VAE"
                hint="Formats supportés : jpg, png, pdf avec un poids maximum de 15Mo"
              />
            </div>
            <div>
              <AmenagementResourcesSection />
            </div>
          </div>
          <FormButtons
            formState={{ isSubmitting: false }}
            backUrl={`/candidacies/${candidacyId}/dossier-de-validation-aap-v2/depot-dv`}
            hideResetButton
          />
        </form>
      </div>
    </div>
  );
}
