"use client";

import { Input } from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { Impersonate } from "@/components/impersonate/Impersonate.component";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import {
  sanitizedEmail,
  sanitizedOptionalText,
  sanitizedText,
} from "@/utils/input-sanitization";

import { CertificationAuthorityStructureBreadcrumb } from "../_components/certification-authority-structure-breadcrumb/CertificationAuthorityStructureBreadcrumb";

import { useCertificationRegistryPage } from "./responsableReferentiel.hooks";

const schema = z.object({
  accountFirstname: sanitizedOptionalText(),
  accountLastname: sanitizedText({ minLength: 2 }),
  accountEmail: sanitizedEmail(),
});

type FormData = z.infer<typeof schema>;

const CertificationAuthorityStructureInformationsGeneralesPage = () => {
  const router = useRouter();

  const { certificationAuthorityStructureId } = useParams<{
    certificationAuthorityStructureId: string;
  }>();

  const {
    certificationAuthorityStructure,
    getCertificationRegistryManagerStatus,
    createCertificationRegistryManager,
    updateCertificationRegistryManager,
  } = useCertificationRegistryPage({ certificationAuthorityStructureId });

  const certificationRegistryManager =
    certificationAuthorityStructure?.certificationRegistryManager;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      accountLastname:
        certificationRegistryManager?.account.lastname || undefined,
      accountFirstname:
        certificationRegistryManager?.account.firstname || undefined,
      accountEmail: certificationRegistryManager?.account.email,
    },
  });

  const handleFormSubmit = handleSubmit(
    async (data) => {
      if (certificationRegistryManager) {
        return handleCertificationRegistryManagerUpdate(data);
      } else {
        return handleCertificationRegistryManagerCreation(data);
      }
    },
    (e) => console.log({ e }),
  );

  const handleCertificationRegistryManagerCreation = async (data: FormData) => {
    try {
      await createCertificationRegistryManager.mutateAsync({
        ...data,
        certificationAuthorityStructureId,
      });
      successToast("Le responsable de certifications a été créé avec succès");
      router.push(
        `/certification-authority-structures/${certificationAuthorityStructureId}`,
      );
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  const handleCertificationRegistryManagerUpdate = async (data: FormData) => {
    try {
      await updateCertificationRegistryManager.mutateAsync({
        certificationRegistryManagerId: certificationRegistryManager?.id || "",
        ...data,
      });
      successToast(
        "Le responsable de certifications a été mis à jour avec succès",
      );
      router.push(
        `/certification-authority-structures/${certificationAuthorityStructureId}`,
      );
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  const handleReset = useCallback(() => {
    reset({
      accountLastname:
        certificationRegistryManager?.account.lastname || undefined,
      accountFirstname:
        certificationRegistryManager?.account.firstname || undefined,
      accountEmail: certificationRegistryManager?.account.email,
    });
  }, [certificationRegistryManager, reset]);

  useEffect(() => {
    handleReset();
  }, [handleReset]);

  if (getCertificationRegistryManagerStatus !== "success") {
    return null;
  }

  return (
    <div
      className="flex flex-col flex-1"
      data-testid="certification-registry-manager-page"
    >
      <CertificationAuthorityStructureBreadcrumb
        certificationAuthorityStructureId={certificationAuthorityStructureId}
        certificationAuthorityStructureLabel={
          certificationAuthorityStructure?.label || "..."
        }
        pageLabel="Responsable de certifications"
      />
      <div className="flex flex-row justify-between">
        <h1 data-testid="certification-registry-manager-page-title">
          Responsable de certifications
        </h1>

        {certificationRegistryManager?.account.id && (
          <Impersonate
            accountId={certificationRegistryManager?.account.id}
            size="small"
          />
        )}
      </div>
      <p className="text-xl">
        Le responsable de certifications bénéficie d'un espace personnel sur la
        plateforme. Renseignez ses informations de connexion pour qu’il puisse
        commencer à travailler.
      </p>
      <form className="flex flex-col mt-4" onSubmit={handleFormSubmit}>
        <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <legend className="text-3xl text-neutral-900 font-bold mb-4">
            Informations de connexion
          </legend>
          <Input
            label="Nom"
            nativeInputProps={{
              ...register("accountLastname"),
            }}
            state={errors.accountLastname ? "error" : "default"}
            stateRelatedMessage={errors.accountLastname?.message}
          />
          <Input
            label="Prénom"
            nativeInputProps={{
              ...register("accountFirstname"),
            }}
            state={errors.accountFirstname ? "error" : "default"}
            stateRelatedMessage={errors.accountFirstname?.message}
          />
          <Input
            label="Adresse électronique de connexion"
            nativeInputProps={{
              ...register("accountEmail"),
            }}
            state={errors.accountEmail ? "error" : "default"}
            stateRelatedMessage={errors.accountEmail?.message}
          />
        </fieldset>
        <FormButtons
          backUrl={`/certification-authority-structures/${certificationAuthorityStructureId}`}
          formState={{ isDirty, isSubmitting }}
        />
      </form>
    </div>
  );
};

export default CertificationAuthorityStructureInformationsGeneralesPage;
