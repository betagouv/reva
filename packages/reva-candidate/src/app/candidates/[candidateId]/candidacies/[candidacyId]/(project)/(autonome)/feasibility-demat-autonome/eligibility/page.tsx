"use client";

import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import Input from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import Select from "@codegouvfr/react-dsfr/Select";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isBefore, parseISO, toDate } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CertificationCardReadOnly } from "@/components/card/certification-card-read-only/CertificationCardReadOnly";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { Panel } from "@/components/layout/Panel";
import { FormOptionalFieldsDisclaimer } from "@/components/legacy/atoms/FormOptionalFieldsDisclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { sanitizedOptionalText } from "@/utils/input-sanitization";

import { useEligibility } from "./_components/eligibility.hook";

const modal = createModal({
  id: "how-to-choose-eligibility",
  isOpenedByDefault: false,
});

const schema = z
  .object({
    eligibility: z.enum(
      [
        "",
        "PREMIERE_DEMANDE_RECEVABILITE",
        "DEMANDE_RENOUVELLEMENT_RECEVABILITE",
        "DETENTEUR_RECEVABILITE",
        "DETENTEUR_RECEVABILITE_AVEC_CHGT_CODE_RNCP_ET_REV_REFERENTIEL",
        "DETENTEUR_RECEVABILITE_AVEC_REV_SANS_CHGT_REFERENTIEL",
      ],
      {
        invalid_type_error: "Veuillez sélectionner une situation",
      },
    ),
    eligibilityValidUntil: sanitizedOptionalText(),
  })
  .superRefine(({ eligibility, eligibilityValidUntil }, ctx) => {
    if (!eligibility) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Veuillez sélectionner une situation",
        path: ["eligibility"],
      });
    }

    if (
      eligibility === "DETENTEUR_RECEVABILITE" ||
      eligibility === "DETENTEUR_RECEVABILITE_AVEC_REV_SANS_CHGT_REFERENTIEL"
    ) {
      if (!eligibilityValidUntil) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Veuillez sélectionner une date de fin de validité",
          path: ["eligibilityValidUntil"],
        });
      } else if (isBefore(toDate(eligibilityValidUntil), new Date())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Merci d'indiquer une date postérieure à la date du jour",
          path: ["eligibilityValidUntil"],
        });
      }
    }
  });

type DecisionForm = z.infer<typeof schema>;

const eligibilityRequirementMap = (
  eligibility: DecisionForm["eligibility"],
): "FULL_ELIGIBILITY_REQUIREMENT" | "PARTIAL_ELIGIBILITY_REQUIREMENT" => {
  if (
    eligibility === "DETENTEUR_RECEVABILITE" ||
    eligibility === "DETENTEUR_RECEVABILITE_AVEC_REV_SANS_CHGT_REFERENTIEL"
  ) {
    return "PARTIAL_ELIGIBILITY_REQUIREMENT";
  }
  return "FULL_ELIGIBILITY_REQUIREMENT";
};

export default function EligibilityPage() {
  const router = useRouter();
  const { certification, createOrUpdateEligibilityRequirement, feasibility } =
    useEligibility();

  const defaultValues = useMemo(() => {
    return {
      eligibility:
        feasibility?.dematerializedFeasibilityFile
          ?.eligibilityCandidateSituation || ("" as const),
      eligibilityValidUntil: feasibility?.dematerializedFeasibilityFile
        ?.eligibilityValidUntil
        ? format(
            feasibility?.dematerializedFeasibilityFile?.eligibilityValidUntil,
            "yyyy-MM-dd",
          )
        : undefined,
    };
  }, [feasibility]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
    watch,
  } = useForm<DecisionForm>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const eligibility = watch("eligibility");

  const areOptionalFieldsDisabled = !(
    eligibility === "DETENTEUR_RECEVABILITE" ||
    eligibility === "DETENTEUR_RECEVABILITE_AVEC_REV_SANS_CHGT_REFERENTIEL"
  );

  const handleFormSubmit = async ({
    eligibility,
    eligibilityValidUntil,
  }: DecisionForm) => {
    const eligibilityRequirement = eligibilityRequirementMap(eligibility);

    const eligibilityValidUntilDate =
      eligibilityValidUntil &&
      eligibilityRequirement === "PARTIAL_ELIGIBILITY_REQUIREMENT"
        ? parseISO(eligibilityValidUntil).getTime()
        : undefined;

    const input = {
      eligibilityRequirement,
      eligibilityValidUntil: eligibilityValidUntilDate,
      eligibilityCandidateSituation: eligibility || undefined,
    };

    try {
      await createOrUpdateEligibilityRequirement(input);
      successToast("Recevabilité du candidat enregistré");
      router.push("../");
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  const resetForm = useCallback(
    () => reset(defaultValues),
    [reset, defaultValues],
  );

  useEffect(resetForm, [resetForm]);

  return (
    <Panel>
      <div className="flex flex-col">
        <Breadcrumb
          currentPageLabel="Recevabilité déjà acquise"
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

        <h1 className="mb-0">Recevabilité déjà acquise</h1>
        <FormOptionalFieldsDisclaimer />
        <p className="text-xl mb-12">
          Si une recevabilité a déjà été obtenue sur cette certification,
          signalez-le ici : vous accéderez alors à un dossier de faisabilité
          adapté.
        </p>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          onReset={(e) => {
            e.preventDefault();
            resetForm();
          }}
        >
          <div className="grid grid-cols-4">
            <div className="col-span-3">
              <CertificationCardReadOnly
                certification={{
                  id: certification?.id || "",
                  codeRncp: certification?.codeRncp || "",
                  label: certification?.label || "",
                }}
              />

              <hr className="mt-8 mb-2" />

              <Select
                state={errors.eligibility ? "error" : "default"}
                stateRelatedMessage={errors.eligibility?.message}
                label="Situation du candidat"
                hint={
                  <div>
                    <span>Sélectionnez le cas actuel.</span>
                    <Button
                      type="button"
                      className="underline p-0 m-0 mx-1 text-xs shadow-none min-h-0"
                      priority="secondary"
                      onClick={modal.open}
                    >
                      Voir plus de détails →
                    </Button>
                  </div>
                }
                nativeSelectProps={{
                  ...register("eligibility"),
                  defaultValue: "",
                }}
                data-testid="eligibility-select"
              >
                <option value={undefined} disabled>
                  Choisir une situation
                </option>
                <option value="PREMIERE_DEMANDE_RECEVABILITE">
                  Demande initiale de recevabilité
                </option>
                <option value="DEMANDE_RENOUVELLEMENT_RECEVABILITE">
                  Demande de renouvellement
                </option>
                <option value="DETENTEUR_RECEVABILITE">
                  Détenteur d'une recevabilité
                </option>
                <option
                  disabled
                  hidden
                  value="DETENTEUR_RECEVABILITE_AVEC_CHGT_CODE_RNCP_ET_REV_REFERENTIEL"
                >
                  Détenteur d'une recevabilité avec changement de code RNCP et
                  révision du référentiel
                </option>
                <option
                  disabled
                  hidden
                  value="DETENTEUR_RECEVABILITE_AVEC_REV_SANS_CHGT_REFERENTIEL"
                >
                  Détenteur d'une recevabilité avec révision sans changement de
                  référentiel
                </option>
              </Select>

              {!areOptionalFieldsDisabled && (
                <div className="flex flex-col gap-6 p-4 border border-dsfr-light-border-default">
                  <Input
                    className="max-w-xs mb-0"
                    label="Date de fin de validité "
                    nativeInputProps={{
                      type: "date",
                      ...register("eligibilityValidUntil"),
                    }}
                    state={errors.eligibilityValidUntil ? "error" : "default"}
                    stateRelatedMessage={errors.eligibilityValidUntil?.message}
                    data-testid="eligibility-valid-until-input"
                  />

                  <Alert
                    severity="info"
                    title="Un doute sur la possibilité de déposer le dossier de validation avant cette date ?"
                    description="Rapprochez vous du certificateur avant de poursuivre afin de connaître la procédure adaptée."
                  />
                </div>
              )}
            </div>

            <div className="col-span-1 ml-6">
              <div className="flex flex-col px-4 pb-2 pt-6 bg-dsfr-light-decisions-background-background-alt-blue-france">
                <h6>Ressources :</h6>

                <div>
                  <p className="font-medium mb-4">Besoin d'aide ?</p>

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
              isDirty,
              isSubmitting,
            }}
          />
        </form>

        <modal.Component
          title={
            <div>
              <span
                className="fr-icon-info-fill mr-2"
                aria-hidden="true"
              ></span>
              Comment choisir ?
            </div>
          }
          size="large"
        >
          <p>
            Sélectionnez <strong>"Demande initiale de recevabilité"</strong> si
            la recevabilité n’a pas été obtenue pour la certification visée.
            <br />
            Exemple : C'est la première fois qu’une candidature est présentée
            pour faire une VAE sur cette certification.
          </p>

          <p>
            Sélectionner <strong>"Demande de renouvellement"</strong> seulement
            si une recevabilité a déjà été obtenue sur l'ancienne version de la
            certification. (Changement de code RNCP et modification du
            référentiel)
          </p>

          <p>
            Sélectionner <strong>“Détenteur d’une recevabilité”</strong> si la
            recevabilité a déjà été obtenue sur la certification visée. Vous
            pouvez également sélectionner "détenteur d'une recevabilité" si une
            recevabilité a déjà été obtenue sur l'ancienne version de la
            certification (Changement de code RNCP) mais que le référentiel n'a
            pas évolué.
            <br />
            Exemple : une recevabilité a été acquise hors France VAE et vous
            souhaitez poursuivre votre parcours de VAE sur la plateforme.
            <br />
            Vous n’aurez pas à repasser l’étape complète du dossier de
            faisabilité. Dans ce cas, pensez à bien vérifier la{" "}
            <strong>date de fin de validité</strong> de la recevabilité. D'ici à
            cette date, le dossier de validation doit être terminé (sa rédaction
            peut prendre plusieurs mois). Si vous n'êtes pas sûr que le dossier
            de validation soit fini d'ici à cette date, contactez le
            certificateur.
          </p>

          <p>
            Si <strong>une recevabilité a déjà été obtenue</strong>, vous devez
            transmettre le courrier de recevabilité en pièce jointe.
          </p>
        </modal.Component>
      </div>
    </Panel>
  );
}
