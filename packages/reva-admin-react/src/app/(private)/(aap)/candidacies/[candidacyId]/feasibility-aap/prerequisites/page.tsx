"use client";

import Alert from "@codegouvfr/react-dsfr/Alert";
import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { sanitizedTextAllowSpecialCharacters } from "@/utils/input-sanitization";

import type { PrerequisiteInput as PrerequisiteInputType } from "@/graphql/generated/graphql";

import { CertificationPrerequisiteInput } from "./_components/CertificationPrerequisiteInput";
import { PrerequisiteInput } from "./_components/PrerequisiteInput";
import { usePrerequisites } from "./_components/prerequisites.hook";

const modal = createModal({
  id: "how-to-write-prerequisite-comment",
  isOpenedByDefault: false,
});

const schema = z.object({
  aapPrerequisites: z.array(
    z.object({
      id: z.string().uuid().optional().nullable(),
      label: sanitizedTextAllowSpecialCharacters(),
      state: z
        .enum(["ACQUIRED", "IN_PROGRESS"], {
          message: "Merci de sélectionner une réponse",
        })
        .optional(),
    }),
  ),
  certificationPrerequisites: z.array(
    z.object({
      id: z.string().uuid().optional().nullable(),
      label: sanitizedTextAllowSpecialCharacters(),
      state: z
        .enum(["ACQUIRED", "IN_PROGRESS"], {
          message: "Merci de sélectionner une réponse",
        })
        .optional(),
      certificationPrerequisiteId: z.string().uuid(),
    }),
  ),
  blocText: sanitizedTextAllowSpecialCharacters({
    minLength: 0,
    maxLength: 10000,
  }),
});

export type PrerequisitesFormData = z.infer<typeof schema>;

export default function PrerequisitesPage() {
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();
  const router = useRouter();
  const feasibilitySummaryUrl = `/candidacies/${candidacyId}/feasibility-aap`;
  const {
    prerequisitesComment,
    prerequisites: dffPrerequisites,
    createOrUpdatePrerequisitesMutation,
    isLoadingPrerequisites,
    prerequisitesPartComplete,
    candidate,
  } = usePrerequisites();
  const defaultValues: PrerequisitesFormData = useMemo(() => {
    return {
      aapPrerequisites:
        (dffPrerequisites?.filter(
          (p) => p?.certificationPrerequisiteId === null,
        ) as PrerequisitesFormData["aapPrerequisites"]) ?? [],
      certificationPrerequisites:
        (dffPrerequisites?.filter(
          (p) => p?.certificationPrerequisiteId !== null,
        ) as PrerequisitesFormData["certificationPrerequisites"]) ?? [],
      blocText: prerequisitesComment ?? "",
    };
  }, [dffPrerequisites, prerequisitesComment]);
  const {
    register,
    watch,
    handleSubmit,
    formState: { isDirty, isSubmitting, errors },
    reset,
    control,
  } = useForm<PrerequisitesFormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues,
  });

  const {
    fields: aapPrerequisitesFields,
    append: appendAapPrerequisite,
    remove: removeAapPrerequisite,
  } = useFieldArray({
    control,
    name: "aapPrerequisites",
  });
  const { fields: certificationPrerequisitesFields } = useFieldArray({
    control,
    name: "certificationPrerequisites",
  });

  const aapPrerequisites = watch("aapPrerequisites");
  const certificationPrerequisites = watch("certificationPrerequisites");

  const hasNoCertificationPrerequisites =
    certificationPrerequisites.length === 0;

  const undefinedAapPrerequisites = aapPrerequisites.some((p) => !p.state);
  const undefinedCertificationPrerequisites = certificationPrerequisites.some(
    (p) => !p.state,
  );
  const formIsValid =
    !undefinedAapPrerequisites && !undefinedCertificationPrerequisites;
  const canSubmit =
    (isDirty ||
      aapPrerequisites.length !== defaultValues.aapPrerequisites.length ||
      certificationPrerequisites.length !==
        defaultValues.certificationPrerequisites.length ||
      hasNoCertificationPrerequisites) &&
    formIsValid;

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      const dataToSubmit = [
        ...data.aapPrerequisites,
        ...data.certificationPrerequisites,
      ];
      await createOrUpdatePrerequisitesMutation({
        prerequisites: dataToSubmit as PrerequisiteInputType[],
        prerequisitesComment: data.blocText,
      });
      successToast("Modifications enregistrées");
      router.push(feasibilitySummaryUrl);
    } catch (e) {
      graphqlErrorToast(e);
    }
  });

  const resetForm = useCallback(
    () => reset(defaultValues),
    [reset, defaultValues],
  );

  useEffect(resetForm, [resetForm]);

  if (isLoadingPrerequisites) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <Breadcrumb
        className="mb-4"
        currentPageLabel="Pré-requis obligatoires"
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

      <h1>Pré-requis obligatoires</h1>
      <FormOptionalFieldsDisclaimer />
      <p className="text-xl mb-12">
        Les pré-requis sont{" "}
        <strong>
          obligatoires et nécessaires pour obtenir la certification
        </strong>
        . Le certificateur demandera un{" "}
        <strong>document qui prouve l’obtention</strong> de chaque pré-requis.
        Assurez-vous que ces pré-requis sont déjà acquis, ou prévoyez de les
        obtenir dans votre parcours.
      </p>

      <form
        onSubmit={handleFormSubmit}
        onReset={(e) => {
          e.preventDefault();
          resetForm();
        }}
      >
        {hasNoCertificationPrerequisites ? (
          <Alert
            className="mb-12"
            severity="info"
            description="Le certificateur n’a transmis aucun pré-requis obligatoire."
            small
            data-testid="no-prerequisites-message"
          />
        ) : (
          <div className="flex flex-col p-4 pb-0 border border-dsfr-light-decisions-border-border-default-grey mb-4">
            <p className="text-m font-bold mb-0 text-dsfrGray-titleGrey border-b border-dsfr-light-decisions-border-border-default-grey pb-6">
              Pré-requis obligatoires renseignés par le certificateur :
            </p>
            {certificationPrerequisitesFields?.map(({ label }, index) => (
              <CertificationPrerequisiteInput
                key={index}
                register={register}
                index={index}
                label={label}
                errorLabel={
                  errors.certificationPrerequisites?.[index]?.label?.message
                }
                errorState={
                  errors.certificationPrerequisites?.[index]?.state?.message
                }
              />
            ))}
          </div>
        )}
        <div>
          {aapPrerequisitesFields?.map(({ state }, index) => (
            <PrerequisiteInput
              key={index}
              register={register}
              index={index}
              onDelete={() => {
                removeAapPrerequisite(index);
              }}
              errorLabel={errors.aapPrerequisites?.[index]?.label?.message}
              errorState={
                state && errors.aapPrerequisites?.[index]?.state?.message
              }
            />
          ))}
        </div>
        <div
          className="flex cursor-pointer gap-2 text-blue-900 items-center w-fit"
          onClick={() => {
            appendAapPrerequisite({
              label: "",
              state: undefined,
            });
          }}
          data-testid="add-prerequisite-button"
        >
          <span className="fr-icon-add-line fr-icon--sm" />
          <span className="text-sm font-medium">Ajouter un pré-requis</span>
        </div>

        <hr className="mt-8 mb-4" />

        <Input
          className="mb-2"
          textArea
          label="Commentaire (optionnel)"
          hintText={
            <span>
              Si un pré-requis n'est pas encore obtenu, expliquez clairement au
              certificateur comment et quand il le sera.
              <Button
                type="button"
                className="underline p-0 m-0 mx-1 text-xs shadow-none min-h-0"
                priority="secondary"
                onClick={modal.open}
              >
                Voir plus de détails →
              </Button>
            </span>
          }
          nativeTextAreaProps={{
            ...register("blocText"),
          }}
          stateRelatedMessage={errors?.blocText?.message}
          state={errors?.blocText ? "error" : "default"}
          data-testid="block-comment-input"
        />

        <FormButtons
          hideResetButton
          backUrl={`/candidacies/${candidacyId}/feasibility-aap`}
          formState={{
            isDirty:
              isDirty ||
              (hasNoCertificationPrerequisites && !prerequisitesPartComplete),
            isSubmitting,
            canSubmit,
          }}
        />
      </form>

      <modal.Component
        title={
          <div>
            <span className="fr-icon-info-fill mr-2" aria-hidden="true"></span>
            Détails sur les pré-requis
          </div>
        }
        size="large"
      >
        <p>
          <ul>
            <li>
              si une attestation ou une habilitation est obligatoire, vous devez
              faire les démarches pour l’obtenir
            </li>
            <li>
              si une formation est nécessaire, vérifiez que son financement est
              possible. Dans ce cas, la situation doit être expliquée clairement
              dans la partie «Commentaires» de l'attestation sur l’honneur à
              joindre à l’envoi du dossier de faisabilité.
            </li>
          </ul>
        </p>

        <p>Exemple :</p>

        <p>
          La certification visée nécessite l’obtention de l’Attestation de
          Formation aux Gestes et Soins d’Urgences 2 (AFGSU 2). Si elle n’est
          pas encore obtenue, vous devez contacter un organisme de formation.
          Dans le commentaire de l'attestation sur l’honneur (Pièce jointe à
          fournir à l’envoi du dossier), indiquez :{" "}
        </p>

        <p>
          <ul>
            <li>le nom de l’organisme de formation contacté,</li>
            <li>le nom de la formation (AFGSU 2),</li>
            <li>le nombre d’heures de la formation.</li>
          </ul>
        </p>

        <p>
          Cela permet au certificateur de savoir que le nécessaire est en cours
          pour obtenir le pré-requis.
        </p>

        <p>
          Le certificateur demandera un document qui prouve que le pré-requis a
          bien été obtenu. La date à laquelle ce document est demandé dépend de
          la certification et du pré-requis.
        </p>

        <p>Besoin de plus d’informations ? Contactez le certificateur.</p>
      </modal.Component>
    </div>
  );
}
