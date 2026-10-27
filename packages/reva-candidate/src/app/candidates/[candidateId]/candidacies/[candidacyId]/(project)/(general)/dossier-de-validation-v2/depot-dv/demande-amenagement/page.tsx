"use client";

import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import Input from "@codegouvfr/react-dsfr/Input";

import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { Panel } from "@/components/layout/Panel";

import { AmenagementResourcesSection } from "./_components/AmenagementResourcesSection";

export default function AmenagementPage() {
  return (
    <Panel>
      <div className="flex flex-col">
        <Breadcrumb
          currentPageLabel="Aménagement spécifique"
          className="mb-4"
          segments={[
            {
              label: "Ma candidature",
              linkProps: {
                href: "../../../",
              },
            },
            {
              label: "Dossier de validation",
              linkProps: {
                href: "../../",
              },
            },
            {
              label: "Dépôt du dossier de validation",
              linkProps: {
                href: "../../",
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
              backUrl="../"
              hideResetButton
            />
          </form>
        </div>
      </div>
    </Panel>
  );
}
