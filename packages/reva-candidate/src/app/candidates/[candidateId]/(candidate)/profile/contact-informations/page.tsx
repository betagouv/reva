"use client";
import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import { useSearchParams } from "next/navigation";

import { FormOptionalFieldsDisclaimer } from "@/components/legacy/atoms/FormOptionalFieldsDisclaimer/FormOptionalFieldsDisclaimer";

import { ContactInformationForm } from "./_components/ContactInformationForm";
import { useContactInformations } from "./_components/useContactInformations";

export default function Profile() {
  const queryParams = useSearchParams();

  const navigationDisabledByQueryParam =
    queryParams.get("navigationDisabled") === "true";

  const { countries, departments, candidate } = useContactInformations();

  if (!candidate || !departments || !countries) {
    return null;
  }

  return (
    <div className="flex flex-col w-full">
      <Breadcrumb
        currentPageLabel="Mes informations de contact"
        className="mb-4"
        segments={[
          {
            label: "Mon profil",
            linkProps: {
              href: "../",
            },
          },
        ]}
      />

      <h1 className="mb-1">Mes informations de contact</h1>
      <FormOptionalFieldsDisclaimer className="mb-12" />

      <ContactInformationForm
        hideBackButton={navigationDisabledByQueryParam}
        candidate={candidate}
        countries={countries}
        departments={departments}
      />
    </div>
  );
}
