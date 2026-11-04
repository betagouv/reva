"use client";

import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { successToast, graphqlErrorToast } from "@/components/toast/toast";

import { useFinancingMethodsPage } from "./financing-methods.hook";

export default function FinancingMethodsPage() {
  const router = useRouter();

  const { "maison-mere-id": maisonMereAAPId } = useParams<{
    "maison-mere-id": string;
  }>();

  const { maisonMereAAP, isLoading, updateMaisonMereAAPFinancingMethods } =
    useFinancingMethodsPage({
      maisonMereAAPId,
    });
  const { isAdmin } = useAuth();

  const defaultValues = useMemo(() => {
    if (
      maisonMereAAP?.isMCFCompatible === null ||
      maisonMereAAP?.isMCFCompatible === undefined
    ) {
      return undefined;
    } else {
      return {
        isMCFCompatible: maisonMereAAP.isMCFCompatible
          ? ("true" as const)
          : ("false" as const),
      };
    }
  }, [maisonMereAAP]);

  if (isLoading || !maisonMereAAP) return null;

  const backUrl = isAdmin
    ? `/maison-mere-aap/${maisonMereAAP.id}`
    : `/agencies-settings-v3`;

  const handleFinancingMethodsFormSubmit = async (
    data: FinancingMethodsFormData,
  ) => {
    try {
      await updateMaisonMereAAPFinancingMethods.mutateAsync({
        isMCFCompatible: data.isMCFCompatible === "true",
      });
      successToast("modifications enregistrées");
      router.push(backUrl);
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  return (
    <div className="flex flex-col">
      <Breadcrumb
        currentPageLabel={"Modalités de financement"}
        homeLinkProps={{
          href: `/`,
        }}
        segments={[
          isAdmin
            ? {
                label: maisonMereAAP?.raisonSociale,
                linkProps: {
                  href: `/maison-mere-aap/${maisonMereAAP.id}`,
                },
              }
            : {
                label: "Paramètres",
                linkProps: { href: "/agencies-settings-v3" },
              },
        ]}
      />
      <h1>Modalités de financement</h1>
      <p>
        Les parcours VAE peuvent être financés par Mon Compte Formation (MCF).
        Si vous êtes référencé sur la plateforme, les candidats pourront
        financer leur parcours grâce à leur Compte Personnel de Formation (CPF).
      </p>
      <h2>Référencement sur la plateforme MCF</h2>

      <FinancingMethodsForm
        onSubmit={handleFinancingMethodsFormSubmit}
        defaultValues={defaultValues}
        backUrl={backUrl}
      />
    </div>
  );
}

const financingMethodsFormSchema = z.object({
  isMCFCompatible: z.enum(["true", "false"]),
});

type FinancingMethodsFormData = z.infer<typeof financingMethodsFormSchema>;

const FinancingMethodsForm = ({
  onSubmit,
  defaultValues,
  backUrl,
}: {
  onSubmit: (data: FinancingMethodsFormData) => Promise<void>;
  defaultValues?: FinancingMethodsFormData;
  backUrl: string;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FinancingMethodsFormData>({
    defaultValues,
    resolver: standardSchemaResolver(financingMethodsFormSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset>
        <RadioButtons
          legend="Votre structure est-elle référencée sur la plateforme Mon Compte Formation ?"
          options={[
            {
              label: "Oui",
              nativeInputProps: {
                value: "true",
                ...register("isMCFCompatible"),
              },
            },
            {
              label: "Non",
              nativeInputProps: {
                value: "false",
                ...register("isMCFCompatible"),
              },
            },
          ]}
          state={errors.isMCFCompatible ? "error" : "default"}
          stateRelatedMessage={
            errors.isMCFCompatible && "Veuillez sélectionner une option"
          }
        />
      </fieldset>
      <FormButtons backUrl={backUrl} formState={{ isDirty, isSubmitting }} />
    </form>
  );
};
