"use client";
import Input from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { sanitizedText } from "@/utils/input-sanitization";

import { graphql } from "@/graphql/generated";

const CREATE_CERTIFICATION_AUTHORITY_STRUCTURE = graphql(`
  mutation CreateCertificationAuthorityStructure($label: String!) {
    certification_authority_createCertificationAuthorityStructure(
      label: $label
    ) {
      id
    }
  }
`);

const certificationAuthorityStructureSchema = z.object({
  label: sanitizedText(),
});

type CertificationAuthorityStructureFormValues = z.infer<
  typeof certificationAuthorityStructureSchema
>;

export default function AddCertificationAuthorityStructurePage() {
  const { register, handleSubmit, formState, reset } =
    useForm<CertificationAuthorityStructureFormValues>({
      resolver: standardSchemaResolver(certificationAuthorityStructureSchema),
      defaultValues: { label: "" },
    });
  const { graphqlClient } = useGraphQlClient();
  const router = useRouter();
  const { mutateAsync: createCertificationAuthorityStructure } = useMutation({
    mutationFn: (params: { label: string }) =>
      graphqlClient.request(CREATE_CERTIFICATION_AUTHORITY_STRUCTURE, {
        label: params.label,
      }),
  });

  const onSubmit = async (data: CertificationAuthorityStructureFormValues) => {
    try {
      const certificationAuthorityStructure =
        await createCertificationAuthorityStructure(data);
      successToast("Structure certificatrice créée avec succès");
      router.push(
        `/certification-authority-structures/${certificationAuthorityStructure.certification_authority_createCertificationAuthorityStructure.id}`,
      );
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  return (
    <div data-testid="add-certification-authority-structure-page">
      <h1>Nouvelle structure certificatrice</h1>
      <p>
        Vous êtes sur le point de créer une nouvelle structure certificatrice.
        Vous pourrez ensuite la configurer afin d'ajouter un responsable du
        référentiel et des gestionnaires de candidatures. Tant qu'aucun de ces
        comptes ne sera ajouté, le certificateur n'aura pas connaissance de la
        création de cette structure.
      </p>
      <form
        onSubmit={handleSubmit(onSubmit)}
        onReset={(e) => {
          e.preventDefault();
          reset();
        }}
      >
        <Input
          label="Nom de la structure certificatrice"
          nativeInputProps={register("label")}
          state={formState.errors.label ? "error" : "default"}
          stateRelatedMessage={formState.errors.label?.message}
        />
        <FormButtons
          backUrl="/certification-authority-structures"
          formState={{
            isDirty: formState.isDirty,
            isSubmitting: formState.isSubmitting,
          }}
        />
      </form>
    </div>
  );
}
