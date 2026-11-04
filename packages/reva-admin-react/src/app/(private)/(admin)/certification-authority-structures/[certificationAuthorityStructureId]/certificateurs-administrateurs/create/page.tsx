"use client";

import { Input } from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import {
  sanitizedEmail,
  sanitizedOptionalText,
  sanitizedText,
} from "@/utils/input-sanitization";

import { CertificationAuthorityStructureBreadcrumb } from "../../_components/certification-authority-structure-breadcrumb/CertificationAuthorityStructureBreadcrumb";

import { useCreateCertificationAuthorityPage } from "./createCertificationAuthority.hooks";

const schema = z.object({
  label: sanitizedText(),
  firstname: sanitizedOptionalText(),
  lastname: sanitizedText(),
  email: sanitizedEmail(),
});

type FormData = z.infer<typeof schema>;

const CreateCertificationAuthorityPage = () => {
  const router = useRouter();
  const {
    certificationAuthorityStructure,
    getCertificationAuthorityStructureStatus,
    createCertificationAuthority,
  } = useCreateCertificationAuthorityPage();

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
  });

  const handleFormSubmit = handleSubmit(
    async (data) => {
      try {
        const result = await createCertificationAuthority.mutateAsync(data);
        successToast("L'autorité de certification a bien été enregistrée");
        router.push(
          `/certification-authority-structures/${certificationAuthorityStructure?.id}/certificateurs-administrateurs/${result.certification_authority_createCertificationAuthority.id}`,
        );
      } catch (error) {
        graphqlErrorToast(error);
      }
    },
    (e) => console.log(e),
  );

  if (
    !certificationAuthorityStructure ||
    getCertificationAuthorityStructureStatus !== "success"
  ) {
    return null;
  }
  return (
    <div className="flex flex-col flex-1">
      <CertificationAuthorityStructureBreadcrumb
        certificationAuthorityStructureId={certificationAuthorityStructure.id}
        certificationAuthorityStructureLabel={
          certificationAuthorityStructure.label
        }
        pageLabel="Ajouter un gestionnaire des candidatures"
      />
      <h1>Ajouter un gestionnaire des candidatures</h1>
      <p className="text-xl">
        Le gestionnaire des candidatures bénéficie d’ un espace personnel sur la
        plateforme. Renseignez ses informations de connexion pour qu’il puisse
        commencer à travailler.
      </p>
      <form
        className="flex flex-col gap-y-6 mt-6 mb-8"
        onSubmit={handleFormSubmit}
        onReset={() => reset()}
      >
        <h2>Informations de connexion</h2>
        <div className="grid grid-cols-2 w-full gap-x-4">
          <Input
            label="Nom de la structure (ex: ASP)"
            className="col-span-2"
            nativeInputProps={{
              ...register("label"),
              placeholder:
                "[Nom de l’antenne du gestionnaire des candidatures]",
            }}
            state={errors.label ? "error" : "default"}
            stateRelatedMessage={errors.label?.message}
          />
          <Input
            label="Nom "
            nativeInputProps={{
              ...register("lastname"),
              placeholder: "[Nom de la personne physique]",
            }}
            state={errors.lastname ? "error" : "default"}
            stateRelatedMessage={errors.lastname?.message}
          />
          <Input
            label="Prénom (Optionnel)"
            nativeInputProps={{
              ...register("firstname"),
              placeholder: "[Prénom de la personne physique]",
            }}
            state={errors.firstname ? "error" : "default"}
            stateRelatedMessage={errors.firstname?.message}
          />
          <Input
            label="Adresse électronique de connexion"
            nativeInputProps={{
              ...register("email"),
              placeholder:
                "[Adresse électronique de la personne qui va se connecter(Administrateur)]",
            }}
            state={errors.email ? "error" : "default"}
            stateRelatedMessage={errors.email?.message}
          />
        </div>
        <FormButtons
          backUrl={`/certification-authority-structures/${certificationAuthorityStructure.id}`}
          formState={{ isDirty, isSubmitting }}
        />
      </form>
    </div>
  );
};

export default CreateCertificationAuthorityPage;
