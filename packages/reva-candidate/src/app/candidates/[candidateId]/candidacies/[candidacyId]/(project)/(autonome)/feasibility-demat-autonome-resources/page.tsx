"use client";
import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { Panel } from "@/components/layout/Panel";
import { graphqlErrorToast } from "@/components/toast/toast";

import { useFeasibilityDematAutonomeResourcesPage } from "./feasibility-demat-autonome-resources.hook";

const schema = z.object({
  feasibilityFileDematAutonomeResourceHidden: z.boolean(),
});

type FeasibilityDematAutonomeResourcesForm = z.infer<typeof schema>;

export default function FeasibilityDematAutonomeResourcesPage() {
  const router = useRouter();

  const {
    candidacy,
    markFeasibilityFileDematAutonomeResourceAsHidden,
    updateFeasibilityFileDematAutonomeFirstOpeningAt,
  } = useFeasibilityDematAutonomeResourcesPage();

  const defaultValues = useMemo(
    () => ({
      feasibilityFileDematAutonomeResourceHidden:
        candidacy?.feasibilityFileDematAutonomeResourceHidden || false,
    }),
    [candidacy?.feasibilityFileDematAutonomeResourceHidden],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FeasibilityDematAutonomeResourcesForm>({
    resolver: standardSchemaResolver(schema),
    defaultValues,
  });

  const resetForm = useCallback(
    () => reset(defaultValues),
    [reset, defaultValues],
  );

  useEffect(resetForm, [resetForm]);

  const onSubmit = async (data: FeasibilityDematAutonomeResourcesForm) => {
    if (!candidacy?.id) {
      return;
    }

    try {
      if (data.feasibilityFileDematAutonomeResourceHidden) {
        await markFeasibilityFileDematAutonomeResourceAsHidden.mutateAsync({
          candidacyId: candidacy.id,
        });
      }

      if (!candidacy.feasibilityFileDematAutonomeFirstOpening) {
        await updateFeasibilityFileDematAutonomeFirstOpeningAt.mutateAsync({
          candidacyId: candidacy.id,
        });
      }

      router.push("../feasibility-demat-autonome");
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  if (!candidacy) {
    return null;
  }

  return (
    <Panel>
      <div className="flex flex-col w-full">
        <Breadcrumb
          currentPageLabel="Mes expériences"
          className="mb-0"
          segments={[
            {
              label: "Ma candidature",
              linkProps: {
                href: "../",
              },
            },
          ]}
        />
        <h1 className="mt-2 mb-6">Dossier de faisabilité</h1>
        <p className="text-xl mb-12">
          Complétez toutes les sections du dossier de faisabilité avant de
          l'envoyer au certificateur.
        </p>

        <div className="mb-12 flex flex-col px-4 pb-2 pt-6 bg-dsfr-light-decisions-background-background-alt-blue-france">
          <h6>Ressources :</h6>

          <div>
            <p className="font-medium mb-2">
              En quoi consiste le dossier de faisabilité ?
            </p>
            <p>
              Votre parcours de VAE comprend trois étapes importantes avec le
              certificateur :
            </p>

            <ol>
              <li>
                <strong>le dossier de faisabilité</strong>
              </li>
              <li>le dossier de validation</li>
              <li>le passage devant le jury</li>
            </ol>

            <p>
              Vous êtes ici à{" "}
              <strong>la première étape : le dossier de faisabilité</strong>.
            </p>

            <p>
              Le dossier de faisabilité permet de mettre en parallèle vos
              expériences avec les compétences de la certification. Vous allez
              notamment devoir décrire précisément les activités que vous avez
              réalisées.
            </p>

            <p>
              Le certificateur étudiera votre dossier et vérifiera que vos
              expériences correspondent à la certification visée. Si c’est le
              cas, vous recevrez un avis "recevable" : cela signifie que vous
              pourrez commencer votre parcours de VAE.
            </p>

            <p className="font-medium mb-2">À quoi faire attention ?</p>

            <p>
              Il est important d’écrire des réponses précises et de faire
              attention à l’orthographe et à la grammaire.
            </p>

            <p>
              Toutes les étapes à compléter sont sur votre espace France VAE :
              vous devez répondre aux questions directement ici, sur la
              plateforme. Vous pouvez le faire en plusieurs fois. Prenez le
              temps de bien formuler vos réponses et utilisez les ressources
              disponibles pour vous aider.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Checkbox
            small
            state={
              errors.feasibilityFileDematAutonomeResourceHidden
                ? "error"
                : "default"
            }
            stateRelatedMessage={
              errors.feasibilityFileDematAutonomeResourceHidden?.message
            }
            options={[
              {
                label: "Ne plus afficher cette page.",
                hintText:
                  "Toutes ces informations sont disponibles en tout temps depuis la section ressources.",
                nativeInputProps: {
                  ...register("feasibilityFileDematAutonomeResourceHidden"),
                },
              },
            ]}
          />

          <FormButtons
            hideResetButton
            backUrl="../"
            submitButtonLabel="Commencer"
            formState={{
              isSubmitting,
              canSubmit: !candidacy.feasibilityFileDematAutonomeResourceHidden,
            }}
          />
        </form>
      </div>
    </Panel>
  );
}
