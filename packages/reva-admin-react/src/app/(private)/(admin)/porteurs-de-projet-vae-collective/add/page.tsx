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
import { sanitizedEmail, sanitizedText } from "@/utils/input-sanitization";

import { graphql } from "@/graphql/generated";

const createCommanditaireVaeCollectiveMutation = graphql(`
  mutation vaeCollective_createCommanditaireVaeCollective(
    $raisonSociale: String!
    $gestionnaireEmail: String!
    $gestionnaireFirstname: String!
    $gestionnaireLastname: String!
  ) {
    vaeCollective_createCommanditaireVaeCollective(
      raisonSociale: $raisonSociale
      gestionnaireEmail: $gestionnaireEmail
      gestionnaireFirstname: $gestionnaireFirstname
      gestionnaireLastname: $gestionnaireLastname
    ) {
      id
    }
  }
`);

const porteurDeProjetVaeCollectiveSchema = z.object({
  raisonSociale: sanitizedText(),
  gestionnaireEmail: sanitizedEmail(),
  gestionnaireFirstname: sanitizedText(),
  gestionnaireLastname: sanitizedText(),
});

type PorteurDeProjetVaeCollectiveFormValues = z.infer<
  typeof porteurDeProjetVaeCollectiveSchema
>;

export default function AddPorteurDeProjetVaeCollectivePage() {
  const router = useRouter();
  const { graphqlClient } = useGraphQlClient();
  const { mutateAsync: createCommanditaireVaeCollective } = useMutation({
    mutationFn: (params: {
      raisonSociale: string;
      gestionnaireEmail: string;
      gestionnaireFirstname: string;
      gestionnaireLastname: string;
    }) =>
      graphqlClient.request(createCommanditaireVaeCollectiveMutation, params),
  });

  const { register, handleSubmit, formState, reset } =
    useForm<PorteurDeProjetVaeCollectiveFormValues>({
      resolver: standardSchemaResolver(porteurDeProjetVaeCollectiveSchema),
      defaultValues: {
        raisonSociale: "",
        gestionnaireEmail: "",
        gestionnaireFirstname: "",
        gestionnaireLastname: "",
      },
    });

  const onSubmit = async (data: PorteurDeProjetVaeCollectiveFormValues) => {
    try {
      await createCommanditaireVaeCollective(data);
      successToast("Porteur de projet VAE collective créée avec succès");
      router.push(`/porteurs-de-projet-vae-collective`);
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <h1 className="mb-12">Nouveau porteur de projet VAE collective</h1>
      <form
        className="flex flex-col flex-1"
        onSubmit={handleSubmit(onSubmit)}
        onReset={(e) => {
          e.preventDefault();
          reset();
        }}
      >
        <Input
          label="Raison sociale"
          nativeInputProps={register("raisonSociale")}
          state={formState.errors.raisonSociale ? "error" : "default"}
          stateRelatedMessage={formState.errors.raisonSociale?.message}
        />
        <div className="flex flex-row flex-wrap gap-6 ">
          <Input
            className="min-w-[282px] flex-1"
            label="Nom (administrateur du compte)"
            nativeInputProps={register("gestionnaireLastname")}
            state={formState.errors.gestionnaireLastname ? "error" : "default"}
            stateRelatedMessage={formState.errors.gestionnaireLastname?.message}
          />
          <Input
            className="min-w-[282px] flex-1"
            label="Prénom (administrateur du compte)"
            nativeInputProps={register("gestionnaireFirstname")}
            state={formState.errors.gestionnaireFirstname ? "error" : "default"}
            stateRelatedMessage={
              formState.errors.gestionnaireFirstname?.message
            }
          />
          <Input
            className="basis-[500px] min-w-[282px] flex-1"
            label="Adresse électronique de connexion"
            nativeInputProps={{
              ...register("gestionnaireEmail"),
              type: "email",
              spellCheck: "false",
            }}
            state={formState.errors.gestionnaireEmail ? "error" : "default"}
            stateRelatedMessage={formState.errors.gestionnaireEmail?.message}
          />
        </div>

        <FormButtons
          backUrl="/porteurs-de-projet-vae-collective"
          hideResetButton
          submitButtonLabel="Créer"
          backButtonLabel="Annuler"
          formState={{
            isDirty: formState.isDirty,
            isSubmitting: formState.isSubmitting,
          }}
        />
      </form>
    </div>
  );
}
