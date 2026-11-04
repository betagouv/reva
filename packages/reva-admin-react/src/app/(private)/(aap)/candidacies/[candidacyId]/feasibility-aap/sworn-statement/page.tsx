"use client";

import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DownloadTile } from "@/components/download-tile/DownloadTile";
import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { useUrqlClient } from "@/components/urql-client";
import { fileWithMaxMBSize } from "@/utils/input-sanitization";

import { File as GQLFile } from "@/graphql/generated/graphql";

import {
  createOrUpdateSwornStatement,
  useSwornStatement,
} from "./_components/swornStatement.hook";

const schema = z
  .object({
    swornStatement: z.object({
      0: fileWithMaxMBSize(2),
    }),
  })
  .superRefine(({ swornStatement }, { addIssue }) => {
    if (!swornStatement?.[0]) {
      addIssue({
        path: ["swornStatement"],
        message: "Merci de remplir ce champ",
        code: z.ZodIssueCode.custom,
      });
    }
  });

type FormData = z.infer<typeof schema>;

export default function SwornStatementPage() {
  const { candidacyId } = useParams<{ candidacyId: string }>();
  const { swornStatementFile, candidate } = useSwornStatement();
  const urqlClient = useUrqlClient();
  const router = useRouter();
  const [swornStatement, setSwornStatement] = useState<GQLFile | undefined>();

  const feasibilitySummaryUrl = `/candidacies/${candidacyId}/feasibility-aap`;

  const resetFiles = useCallback(() => {
    if (!swornStatementFile) return;
    setSwornStatement(swornStatementFile);
  }, [swornStatementFile]);

  useEffect(() => {
    const doResetFiles = () => {
      resetFiles();
    };
    doResetFiles();
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
    resolver: zodResolver(schema),
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
      router.push(`/candidacies/${candidacyId}/feasibility-aap`);
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  const resetForm = useCallback(() => {
    reset(defaultValues);
    resetFiles();
  }, [defaultValues, reset, resetFiles]);

  useEffect(() => {
    const doReset = () => {
      resetForm();
    };
    doReset();
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
    <div className="flex flex-col">
      <Breadcrumb
        className="mb-4"
        currentPageLabel="Attestation sur l’honneur"
        segments={[
          {
            label: (
              <span>
                {candidate?.givenName
                  ? candidate.givenName
                  : candidate?.lastname}{" "}
                {candidate?.firstname}
              </span>
            ),
            linkProps: { href: "../" },
          },
        ]}
      />

      <h1>Attestation sur l’honneur</h1>
      <FormOptionalFieldsDisclaimer />
      <p className="text-xl mb-12">
        Une attestation sur l’honneur signée est obligatoire pour valider le
        dossier de faisabilité. Vous devez télécharger ce modèle d’attestation,
        le compléter, le signer et le joindre.
      </p>

      <DownloadTile
        name="Modèle d'attestation sur l'honneur (PDF)"
        url="/admin2/files/attestation_sur_l_honneur_modele.pdf"
        mimeType="application/pdf"
        fileSizeInBytes={984064}
      />

      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        onReset={(e) => {
          e.preventDefault();
          resetForm();
        }}
        className="mt-4"
      >
        <FancyUpload
          className="col-span-2"
          title="Joindre l'attestation sur l'honneur complétée et signée"
          hint="Format supporté : PDF uniquement avec un poids maximum de 2Mo"
          defaultFile={swornStatementDefaultFile}
          nativeInputProps={{
            ...register("swornStatement"),
            accept: ".pdf",
          }}
          state={errors.swornStatement ? "error" : "default"}
          stateRelatedMessage={errors.swornStatement?.[0]?.message}
          dataTest="sworn-statement-upload"
        />

        <FormButtons
          hideResetButton
          backUrl={feasibilitySummaryUrl}
          formState={{
            isSubmitting,
          }}
        />
      </form>
    </div>
  );
}
