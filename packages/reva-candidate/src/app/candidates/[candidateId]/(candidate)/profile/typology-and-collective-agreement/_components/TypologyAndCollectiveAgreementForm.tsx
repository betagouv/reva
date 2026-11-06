import Alert from "@codegouvfr/react-dsfr/Alert";
import Select from "@codegouvfr/react-dsfr/Select";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import {
  AVAILABLE_CANDIDATE_TYPOLOGIES,
  getTypologyLabel,
} from "@/utils/candidateTypology.util";

import { CandidateUpdateTypologyAndCcnInput } from "@/graphql/generated/graphql";

import { CcnSearchList } from "./CcnSearchList";
import {
  TypologyFormData,
  typologyFormSchema,
} from "./typologyAndCollectiveAgreementSchema";
import {
  CandidateUseProfile,
  useUpdateCandidateTypologyAndCcn,
} from "./useTypologyAndCollectiveAgreement";

export const TypologyAndCollectiveAgreementForm = ({
  candidate,
  hideBackButton,
  backButtonLabel,
  backButtonUrl,
  hideResetButton,
  submitButtonLabel,
  submitPath,
  forceIsDirty,
}: {
  candidate: CandidateUseProfile;
  hideBackButton?: boolean;
  backButtonLabel?: string;
  backButtonUrl?: string;
  hideResetButton?: boolean;
  submitButtonLabel?: string;
  submitPath?: string;
  forceIsDirty?: boolean;
}) => {
  const { updateCandidateTypologyAndCcnMutate } =
    useUpdateCandidateTypologyAndCcn();
  const router = useRouter();

  const {
    register,
    setValue,
    reset,
    control,
    formState: { isDirty, isSubmitting },
    handleSubmit,
  } = useForm<TypologyFormData>({
    resolver: standardSchemaResolver(typologyFormSchema),
    defaultValues: {
      ccnId: candidate?.conventionCollective?.id ?? "",
      typology:
        (candidate?.typology as TypologyFormData["typology"]) ?? "NON_SPECIFIE",
      additionalInformation: candidate?.typologyAdditional ?? "",
    },
  });

  const resetFormData = useCallback(
    (candidate: CandidateUseProfile) => {
      reset({
        ccnId: candidate?.conventionCollective?.id ?? "",
        typology:
          (candidate?.typology as TypologyFormData["typology"]) ??
          "NON_SPECIFIE",
        additionalInformation: candidate?.typologyAdditional ?? "",
      });
    },
    [reset],
  );

  useEffect(() => {
    resetFormData(candidate);
  }, [candidate, resetFormData]);

  const onSubmit = async (data: TypologyFormData) => {
    const candidateTypologyAndCcn: CandidateUpdateTypologyAndCcnInput = {
      ccnId: data.ccnId,
      typology: data.typology,
      additionalInformation: data.additionalInformation,
    };

    try {
      await updateCandidateTypologyAndCcnMutate({
        candidateId: candidate?.id,
        candidateTypologyAndCcn,
      });
      successToast("Les informations ont bien été mises à jour");
      router.push(submitPath || "../");
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  const { typology } = useWatch({ control });

  const isCcnRequired = useMemo(() => {
    return (
      typology === "SALARIE_PRIVE" ||
      typology === "DEMANDEUR_EMPLOI" ||
      typology === "TRAVAILLEUR_NON_SALARIE" ||
      typology === "TITULAIRE_MANDAT_ELECTIF" ||
      typology === "AIDANTS_FAMILIAUX_AGRICOLES"
    );
  }, [typology]);

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        onReset={(e) => {
          e.preventDefault();
          resetFormData(candidate);
        }}
        className="flex flex-col gap-6"
        data-testid="contact-information-form"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 md:gap-6">
          <div className="col-span-3 flex flex-col">
            <Select
              className="w-full"
              label="Typologie"
              nativeSelectProps={{ ...register("typology") }}
            >
              <option value="NON_SPECIFIE" disabled>
                Sélectionner
              </option>

              {AVAILABLE_CANDIDATE_TYPOLOGIES.map((typology) => (
                <option key={typology} value={typology}>
                  {getTypologyLabel(typology)}
                </option>
              ))}
            </Select>

            {(typology as string) === "NON_SPECIFIE" && (
              <Alert
                small
                severity="warning"
                description={
                  <p>
                    France VAE n'est pas encore disponible pour les{" "}
                    <strong>
                      fonctionnaires et agents contractuels (de droit public ou
                      privé)
                    </strong>
                    . Vous pouvez retrouver des informations auprès de vos
                    interlocuteurs RH habituels.
                  </p>
                }
              />
            )}

            {(typology as string) !== "NON_SPECIFIE" && !isCcnRequired && (
              <Alert
                small
                severity="info"
                description="Cette typologie ne nécessite pas de renseigner une convention collective."
              />
            )}

            {isCcnRequired && (
              <>
                <CcnSearchList
                  conventionCollective={candidate?.conventionCollective}
                  onCcnButtonClick={(ccnId) => {
                    setValue("ccnId", ccnId, { shouldDirty: true });
                  }}
                />
              </>
            )}
          </div>

          <div className="col-span-1 w-full md:w-auto mt-6 md:mt-0">
            <div className="flex flex-col px-4 pt-6 bg-dsfr-light-decisions-background-background-alt-blue-france">
              <h6>Ressources :</h6>
              <div>
                <p className="font-bold mb-2">
                  Comment retrouver ma convention collective ?
                </p>
                <p>
                  Vous pouvez retrouver le nom et numéro de votre convention
                  collective sur votre dernier bulletin de paie ou sur votre
                  contrat de travail.
                </p>
                <p className="font-bold mb-2">
                  Je ne trouve pas ma convention collective
                </p>
                <p className="mb-0">
                  Vous pouvez utiliser les ressources disponibles :
                </p>

                <ul className="list-none p-0 mb-8">
                  <li>
                    <a
                      className="fr-link"
                      href="https://code.travail.gouv.fr/outils/convention-collective"
                      target="_blank"
                    >
                      Site du code du travail
                    </a>
                  </li>
                  <li>
                    <a
                      className="fr-link"
                      href="https://vae.gouv.fr/savoir-plus/articles/retrouver-ma-convention-collective-pour-france-vae"
                      target="_blank"
                    >
                      Article dédié de France VAE
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <FormButtons
          backUrl={hideBackButton ? undefined : backButtonUrl || "../"}
          backLabel={backButtonLabel}
          hideResetButton={hideResetButton}
          submitButtonLabel={submitButtonLabel}
          formState={{ isDirty: forceIsDirty ?? isDirty, isSubmitting }}
          data-testid="form-buttons"
        />
      </form>
    </>
  );
};
