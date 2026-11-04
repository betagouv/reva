"use client";

import { Input } from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getCertificationAuthorityStructureBreadcrumbSegments } from "@/components/certification-authority/settings-breadcrumb-segments/adminCertificationAuthorityBreadcrumbSegments";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { SettingsBreadcrumb } from "@/components/settings/settings-breadcrumb/SettingsBreadcrumb";
import { SettingsPageHeader } from "@/components/settings/settings-page-header/SettingsPageHeader";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { sanitizedText } from "@/utils/input-sanitization";

import { useInformationGeneralesPage } from "./informationsGenerales.hooks";

const schema = z.object({
  label: sanitizedText(),
});

type FormData = z.infer<typeof schema>;

const CertificationAuthorityStructureInformationsGeneralesPage = () => {
  const { certificationAuthorityStructureId } = useParams<{
    certificationAuthorityStructureId: string;
  }>();

  const {
    certificationAuthorityStructure,
    getCertificationAuthorityStructureStatus,
    updateCertificationAuthorityStructure,
  } = useInformationGeneralesPage({ certificationAuthorityStructureId });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { ...certificationAuthorityStructure },
  });

  const handleFormSubmit = handleSubmit(
    async (data) => {
      try {
        await updateCertificationAuthorityStructure.mutateAsync({
          certificationAuthorityStructureId,
          certificationAuthorityStructureLabel: data.label,
        });
        successToast("modifications enregistrées");
      } catch (e) {
        graphqlErrorToast(e);
      }
    },
    (e) => console.log({ e }),
  );

  const handleReset = useCallback(() => {
    reset({
      ...certificationAuthorityStructure,
    });
  }, [certificationAuthorityStructure, reset]);

  useEffect(() => {
    handleReset();
  }, [handleReset]);

  if (getCertificationAuthorityStructureStatus !== "success") {
    return null;
  }

  return (
    <div className="flex flex-col flex-1">
      {certificationAuthorityStructure && (
        <div className="flex flex-col">
          <SettingsPageHeader
            breadcrumb={
              <SettingsBreadcrumb
                currentPageLabel="Informations générales"
                homeLinkProps={{
                  href: `/`,
                }}
                segments={getCertificationAuthorityStructureBreadcrumbSegments({
                  certificationAuthorityStructureId,
                  certificationAuthorityStructureLabel:
                    certificationAuthorityStructure.label,
                })}
              />
            }
            title="Informations générales"
            chapo={
              <>
                Retrouvez ici les informations liées à la structure
                certificatrice. Vous pouvez signaler un changement au support si
                elles ne sont plus à jour.
              </>
            }
          />
          <form
            className="flex flex-col mt-4"
            onSubmit={handleFormSubmit}
            onReset={(e) => {
              e.preventDefault();
              handleReset();
            }}
          >
            <Input
              label="Nom de la structure certificatrice"
              nativeInputProps={{
                ...register("label"),
              }}
              state={errors.label ? "error" : "default"}
              stateRelatedMessage={errors.label?.message}
            />
            <FormButtons
              backUrl={`/certification-authority-structures/${certificationAuthorityStructureId}`}
              formState={{ isDirty, isSubmitting }}
            />
          </form>
        </div>
      )}
    </div>
  );
};

export default CertificationAuthorityStructureInformationsGeneralesPage;
