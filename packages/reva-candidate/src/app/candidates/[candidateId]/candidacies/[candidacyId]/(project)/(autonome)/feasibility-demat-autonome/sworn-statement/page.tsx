"use client";

import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DownloadTile } from "@/components/download-tile/DownloadTile";
import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { useUrqlClient } from "@/components/graphql/urql-client/UrqlClient";
import { Panel } from "@/components/layout/Panel";
import { FormOptionalFieldsDisclaimer } from "@/components/legacy/atoms/FormOptionalFieldsDisclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";

import { File as GQLFile } from "@/graphql/generated/graphql";

import {
  createOrUpdateSwornStatement,
  useSwornStatement,
} from "./_components/swornStatement.hook";

const schema = z
  .object({
    swornStatement: z.object({
      0: z.instanceof(File, { message: "Merci de remplir ce champ" }),
    }),
  })
  .superRefine(({ swornStatement }, { addIssue }) => {
    if (!swornStatement?.[0]) {
      addIssue({
        path: ["swornStatement"],
        message: "Merci de remplir ce champ",
        code: "custom",
      });
    }
  });

type FormData = z.infer<typeof schema>;

export default function SwornStatementPage() {
  const { candidacyId } = useParams<{ candidacyId: string }>();
  const { swornStatementFile } = useSwornStatement();
  const urqlClient = useUrqlClient();
  const router = useRouter();
  const [swornStatement, setSwornStatement] = useState<GQLFile | undefined>();

  const resetFiles = useCallback(() => {
    if (!swornStatementFile) return;
    setSwornStatement(swornStatementFile);
  }, [swornStatementFile]);

  useEffect(() => {
    resetFiles();
  }, [resetFiles]);

  const defaultValues = useMemo(
    () => ({
      swornStatement: undefined,
    }),
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues,
  });

  const handleFormSubmit = async (data: FormData) => {
    const swornStatement = data.swornStatement?.[0];

    const input = {
      swornStatement,
    };

    try {
      const result = await urqlClient.mutation(createOrUpdateSwornStatement, {
        input,
        candidacyId,
      });
      if (result.error) {
        throw new Error(result.error.graphQLErrors[0].message);
      }
      successToast("L’attestation sur l’honneur a été enregistrée");
      router.push(`../`);
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  const resetForm = useCallback(() => {
    reset(defaultValues);
    resetFiles();
  }, [defaultValues, reset, resetFiles]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const swornStatementDefaultFile = useMemo(
    () =>
      swornStatement?.previewUrl
        ? {
            name: swornStatement.name,
            mimeType: swornStatement.mimeType,
            url: swornStatement.previewUrl,
          }
        : undefined,
    [swornStatement],
  );

  return (
    <Panel>
      <div className="flex flex-col">
        <Breadcrumb
          currentPageLabel="Attestation sur l’honneur"
          className="mb-2"
          segments={[
            {
              label: "Ma candidature",
              linkProps: {
                href: "../../",
              },
            },
            {
              label: "Dossier de faisabilité",
              linkProps: {
                href: "../",
              },
            },
          ]}
        />

        <h1 className="mb-0">Attestation sur l’honneur</h1>
        <FormOptionalFieldsDisclaimer />
        <p className="text-xl mb-12">
          Une attestation sur l’honneur signée est obligatoire pour valider le
          dossier de faisabilité. Vous devez télécharger ce modèle
          d’attestation, le compléter, le signer et le joindre.
        </p>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          onReset={(e) => {
            e.preventDefault();
            resetForm();
          }}
          className="mt-4"
        >
          <div className="grid grid-cols-4">
            <div className="col-span-3">
              <div className="flex flex-col gap-6">
                <DownloadTile
                  name="Modèle d'attestation sur l'honneur (PDF)"
                  url="/candidat/files/attestation_sur_l_honneur_modele.pdf"
                  mimeType="application/pdf"
                  fileSizeInBytes={984064}
                />

                <FancyUpload
                  className="col-span-2"
                  title="Joindre l'attestation sur l'honneur complétée et signée"
                  hint="Formats supportés : jpg, png, pdf avec un poids maximum de 2Mo"
                  defaultFile={swornStatementDefaultFile}
                  nativeInputProps={{
                    ...register("swornStatement"),
                    accept: ".pdf, .jpg, .jpeg, .png",
                  }}
                  state={errors.swornStatement ? "error" : "default"}
                  stateRelatedMessage={errors.swornStatement?.[0]?.message}
                  dataTest="sworn-statement-upload"
                />
              </div>
            </div>

            <div className="col-span-1 ml-6">
              <div className="flex flex-col px-4 pb-2 pt-6 bg-dsfr-light-decisions-background-background-alt-blue-france">
                <h6>Ressources :</h6>

                <div>
                  <p>
                    <a
                      className="fr-link text-sm"
                      href="https://scribehow.com/viewer/Tutoriel__Candidat_sans_accompagnement_autonome__0NQyq175SDaI0Epy7bdyLA?referrer=documents&mode=edit"
                      target="_blank"
                    >
                      Consultez le guide pas à pas
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <FormButtons
            hideResetButton
            backUrl={`../`}
            formState={{
              isSubmitting,
            }}
          />
        </form>
      </div>
    </Panel>
  );
}
