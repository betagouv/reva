import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import Select from "@codegouvfr/react-dsfr/Select";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import Image from "next/image";
import { useCallback, useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { SmallNotice } from "@/components/small-notice/SmallNotice";
import { sanitizedText } from "@/utils/input-sanitization";

import { NoCertificationAuthorityAlert } from "./NoCertificationAuthorityAlert";
import { NoCertificationRegistryManagerAlert } from "./NoCertificationRegistryManagerAlert";
import { useStructureForm } from "./structureForm.hook";

type CertificationForForm = {
  id: string;
  label: string;
  codeRncp: string;
  certificationAuthorityStructure?: { id: string; label: string } | null;
  certificationAuthorities: { id: string }[];
};

type StructureForForm = { id: string; label: string };

type FCCertificateurForForm = { NOM_CERTIFICATEUR: string };

const certificationStructureFormSchema = z.object({
  certificationAuthorityStructureId: sanitizedText(),
  certificationAuthorities: z
    .object({ id: z.string(), label: z.string(), checked: z.boolean() })
    .array(),
});

export type CertificationStructureFormData = z.infer<
  typeof certificationStructureFormSchema
>;

export const StructureForm = ({
  certification,
  availableStructures,
  fcCertificateurs,
  onSubmit,
}: {
  certification: CertificationForForm;
  availableStructures: StructureForForm[];
  fcCertificateurs: FCCertificateurForForm[];
  onSubmit(data: CertificationStructureFormData): Promise<void>;
}) => {
  const {
    control,
    register,
    handleSubmit,
    formState: { isDirty, isSubmitting },
    reset,
    getValues,
  } = useForm<CertificationStructureFormData>({
    resolver: standardSchemaResolver(certificationStructureFormSchema),
    defaultValues: {
      certificationAuthorityStructureId:
        certification.certificationAuthorityStructure?.id,
      certificationAuthorities: [],
    },
  });

  const { certificationAuthorityStructureId } = useWatch({ control });

  const {
    availableCertificationAuthorities,
    certificationRegistryManagerPresent,
    getCertificationAuthoritiesQueryStatus,
  } = useStructureForm({ certificationAuthorityStructureId });

  const {
    fields: certificationAuthoritiesFields,
    replace: replaceCertificationAuthorities,
  } = useFieldArray({
    control,
    name: "certificationAuthorities",
  });

  const refreshCertificationAuthoritiesList = useCallback(() => {
    const newCAs =
      availableCertificationAuthorities?.map((aca) => ({
        id: aca.id,
        label: aca.label,
        checked: !!certification.certificationAuthorities.find(
          (ca) => ca.id === aca.id,
        ),
      })) || [];

    replaceCertificationAuthorities(newCAs);
  }, [
    availableCertificationAuthorities,
    certification.certificationAuthorities,
    replaceCertificationAuthorities,
  ]);

  const selectOrUnselectAllCertificationAuthorities = (selectAll: boolean) => {
    const newCAs =
      availableCertificationAuthorities?.map((aca) => ({
        id: aca.id,
        label: aca.label,
        checked: selectAll,
      })) || [];
    replaceCertificationAuthorities(newCAs);
  };

  useEffect(() => {
    refreshCertificationAuthoritiesList();
  }, [
    availableCertificationAuthorities,
    certification.certificationAuthorities,
    refreshCertificationAuthoritiesList,
  ]);

  const handleFormSubmit = handleSubmit(onSubmit);

  const handleReset = () => {
    reset();
    refreshCertificationAuthoritiesList();
  };

  return (
    <div data-testid="update-certification-structure-page">
      <Breadcrumb
        currentPageLabel="Structure certificatrice et gestionnaires"
        homeLinkProps={{
          href: `/`,
        }}
        segments={[
          {
            label: certification.label,
            linkProps: {
              href: `/certifications/${certification.id}`,
            },
          },
        ]}
      />

      <h1>Structure certificatrice et gestionnaires</h1>
      <FormOptionalFieldsDisclaimer />
      <p className="mb-12 text-xl">
        Pour terminer l’ajout de cette certification, vous devez la relier à une
        structure certificatrice et (à minima) à un gestionnaire des
        candidatures. Il est également possible de la relier au gestionnaire des
        candidatures d’une autre structure.
      </p>
      {fcCertificateurs.length > 0 && (
        <div
          data-testid="fc-certificateurs"
          className="bg-dsfr-light-neutral-grey-1000 p-6 rounded my-12"
        >
          <h2 className="mb-0">
            Informations liées à la certification RNCP {certification.codeRncp}
          </h2>
          <div className="my-8 px-4 py-2 border-y border-dsfr-light-decisions-border-border-default-grey flex">
            <p className="mb-0 min-w-[164px]">Certificateurs :</p>
            <ul className="mb-0 font-medium mt-0">
              {fcCertificateurs.map((c, index) => (
                <li key={index}>{c.NOM_CERTIFICATEUR}</li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-between gap-4">
            <SmallNotice>
              Les informations affichées ci-dessus sont issues de France
              compétences via le numéro RNCP de la certification.
            </SmallNotice>
            <Image
              className="shrink-0"
              src="/admin2/logos/logo-france-competences.svg"
              alt="France compétences"
              width={142}
              height={40}
            />
          </div>
        </div>
      )}
      <form
        onSubmit={handleFormSubmit}
        onReset={(e) => {
          e.preventDefault();
          handleReset();
        }}
      >
        <Select
          data-testid="certification-authority-structure-select"
          label="Structure certificatrice"
          hint="La structure certificatrice (organismes et ministères) est l’entité morale à l’origine de l’enregistrement de cette certification au RNCP."
          nativeSelectProps={{
            ...register("certificationAuthorityStructureId"),
          }}
        >
          {availableStructures.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>

        {!certificationRegistryManagerPresent && (
          <NoCertificationRegistryManagerAlert className="my-4" />
        )}
        {getCertificationAuthoritiesQueryStatus === "success" &&
          (certificationAuthoritiesFields.length ? (
            <Checkbox
              legend="Gestionnaire(s) des candidatures"
              options={[
                {
                  label: "Tout cocher / décocher",
                  nativeInputProps: {
                    checked: getValues("certificationAuthorities").reduce(
                      (checked, item) => (!item.checked ? false : checked),
                      true,
                    ),
                    onChange: (e) =>
                      selectOrUnselectAllCertificationAuthorities(
                        e.currentTarget.checked,
                      ),
                  },
                },
                ...certificationAuthoritiesFields.map((ca, caIndex) => ({
                  label: ca.label,
                  nativeInputProps: {
                    key: ca.id,
                    ...register(`certificationAuthorities.${caIndex}.checked`),
                  },
                })),
              ]}
            />
          ) : (
            <NoCertificationAuthorityAlert className="my-4" />
          ))}
        <FormButtons
          backUrl={`/certifications/${certification.id}`}
          formState={{
            isDirty,
            isSubmitting,
          }}
        />
      </form>
    </div>
  );
};
