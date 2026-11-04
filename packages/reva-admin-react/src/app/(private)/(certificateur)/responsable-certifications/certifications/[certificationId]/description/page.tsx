"use client";

import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import Input from "@codegouvfr/react-dsfr/Input";
import Notice from "@codegouvfr/react-dsfr/Notice";
import Select from "@codegouvfr/react-dsfr/Select";
import Tag from "@codegouvfr/react-dsfr/Tag";
import { TZDate } from "@date-fns/tz";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format, toDate } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { ReactNode, useMemo } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { EnhancedSectionCard } from "@/components/card/enhanced-section-card/EnhancedSectionCard";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { FranceCompetencesLogo } from "@/components/logo/france-competences-logo/FranceCompetencesLogo";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import {
  sanitizedOptionalText,
  sanitizedText,
} from "@/utils/input-sanitization";

import { CertificationJuryFrequency } from "@/graphql/generated/graphql";

import { useUpdateCertificationDescriptionPage } from "./updateCertificationDescription.hook";

const JuryFrequencies: { id: CertificationJuryFrequency; label: string }[] = [
  {
    id: "MONTHLY",
    label: "Tous les mois",
  },
  {
    id: "TRIMESTERLY",
    label: "Trimestrielle",
  },
  {
    id: "YEARLY",
    label: "1 fois / an",
  },
];

const getZodSchema = ({
  hasReducedRequirements,
}: {
  hasReducedRequirements: boolean;
}) =>
  z
    .object({
      juryTypeOfTest: z
        .object({
          id: z.string(),
          label: z.string(),
          checked: z.boolean(),
          presentiel: z.boolean(),
          distanciel: z.boolean(),
        })
        .array(),

      juryFrequency: z.enum([
        "",
        ...JuryFrequencies.map(({ id }) => id),
        "Autre",
      ]),
      juryFrequencyOther: sanitizedOptionalText(),
      juryPlace: sanitizedOptionalText(),
      juryEstimatedCost: z.number().optional().nullable(),
      startOfVisibility: sanitizedText(),
    })
    .superRefine(
      (
        {
          juryTypeOfTest,
          juryFrequency,
          juryFrequencyOther,
          startOfVisibility,
        },
        { addIssue },
      ) => {
        if (
          !hasReducedRequirements &&
          juryTypeOfTest.findIndex(
            (v) => v.checked && (v.presentiel || v.distanciel),
          ) == -1
        ) {
          addIssue({
            path: ["juryTypeOfTest"],
            message:
              "Veuillez renseigner au moins un type d’épreuve pour le jury de cette certification",
            code: "custom",
          });
        }

        if (!hasReducedRequirements && !juryFrequency) {
          addIssue({
            path: ["juryFrequency"],
            message: "Veuillez renseigner ce champ",
            code: "custom",
          });
          return;
        } else if (juryFrequency == "Autre" && !juryFrequencyOther) {
          addIssue({
            path: ["juryFrequencyOther"],
            message: "Veuillez renseigner ce champ",
            code: "custom",
          });

          return;
        }

        if (isNaN(Date.parse(startOfVisibility))) {
          addIssue({
            path: ["startOfVisibility"],
            message: "Veuillez renseigner ce champ",
            code: "custom",
          });
        }
      },
    );

type CertificationDescriptionFormSchema = z.infer<
  ReturnType<typeof getZodSchema>
>;

type CertificationForPage = Exclude<
  ReturnType<typeof useUpdateCertificationDescriptionPage>["certification"],
  undefined
>;

export default function UpdateCertificationDescriptionForCertificationRegistryManagerPage() {
  const { certificationId } = useParams<{
    certificationId: string;
  }>();

  const {
    certification,
    getCertificationQueryStatus,
    updateCertificationDescription,
  } = useUpdateCertificationDescriptionPage({ certificationId });

  return getCertificationQueryStatus === "success" && certification ? (
    <PageContent
      certification={certification}
      updateCertificationDescription={updateCertificationDescription}
    />
  ) : null;
}

const PageContent = ({
  certification,
  updateCertificationDescription,
}: {
  certification: CertificationForPage;
  updateCertificationDescription: ReturnType<
    typeof useUpdateCertificationDescriptionPage
  >["updateCertificationDescription"];
}) => {
  const router = useRouter();
  const hasReducedRequirements =
    certification.certificationAuthorityStructure?.hasReducedRequirements ??
    false;
  const zodSchema = useMemo(
    () => getZodSchema({ hasReducedRequirements }),
    [hasReducedRequirements],
  );
  const optionalJuryLabelSuffix = hasReducedRequirements ? " (optionnel)" : "";

  const defaultValues = useMemo(
    () => ({
      juryTypeOfTest: [
        {
          id: "SOUTENANCE_ORALE",
          label: "Entretien",
          checked: !!certification.juryTypeSoutenanceOrale,
          presentiel:
            certification.juryTypeSoutenanceOrale == "LES_DEUX" ||
            certification.juryTypeSoutenanceOrale == "PRESENTIEL",
          distanciel:
            certification.juryTypeSoutenanceOrale == "LES_DEUX" ||
            certification.juryTypeSoutenanceOrale == "A_DISTANCE",
        },
        {
          id: "MISE_EN_SITUATION_PROFESSIONNELLE",
          label: "Mise en situation professionnelle",
          checked: !!certification.juryTypeMiseEnSituationProfessionnelle,
          presentiel:
            certification.juryTypeMiseEnSituationProfessionnelle ==
              "LES_DEUX" ||
            certification.juryTypeMiseEnSituationProfessionnelle ==
              "PRESENTIEL",
          distanciel:
            certification.juryTypeMiseEnSituationProfessionnelle ==
              "LES_DEUX" ||
            certification.juryTypeMiseEnSituationProfessionnelle ==
              "A_DISTANCE",
        },
      ],

      juryFrequency: (certification.juryFrequencyOther
        ? "Autre"
        : certification.juryFrequency || "") as CertificationJuryFrequency,
      juryFrequencyOther: certification.juryFrequencyOther || undefined,

      juryPlace: certification.juryPlace || undefined,

      juryEstimatedCost: certification.juryEstimatedCost ?? null,

      startOfVisibility: certification.availableAt
        ? format(certification.availableAt, "yyyy-MM-dd")
        : undefined,
    }),
    [certification],
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty, errors },
    watch,
    setValue,
    reset,
  } = useForm<CertificationDescriptionFormSchema>({
    resolver: standardSchemaResolver(zodSchema),
    defaultValues,
  });

  const juryFrequency = watch("juryFrequency");
  const juryTypeOfTest = watch("juryTypeOfTest");

  const handleFormSubmit = handleSubmit(
    async (data) => {
      try {
        const frequency =
          JuryFrequencies.find(({ id }) => id == data.juryFrequency)?.id ||
          null;

        const juryTypeMiseEnSituationProfessionnelle =
          data.juryTypeOfTest.filter(
            (modality) => modality.id == "MISE_EN_SITUATION_PROFESSIONNELLE",
          )[0];

        const juryTypeSoutenanceOrale = data.juryTypeOfTest.filter(
          (modality) => modality.id == "SOUTENANCE_ORALE",
        )[0];

        const startOfVisibility = toDate(data.startOfVisibility);
        const tzStartOfVisibility = new TZDate(
          startOfVisibility.getFullYear(),
          startOfVisibility.getMonth(),
          startOfVisibility.getDate(),
          "Europe/Paris",
        );

        await updateCertificationDescription.mutateAsync({
          certificationId: certification.id,
          juryTypeMiseEnSituationProfessionnelle:
            juryTypeMiseEnSituationProfessionnelle.checked &&
            juryTypeMiseEnSituationProfessionnelle.presentiel &&
            juryTypeMiseEnSituationProfessionnelle.distanciel
              ? "LES_DEUX"
              : juryTypeMiseEnSituationProfessionnelle.checked &&
                  juryTypeMiseEnSituationProfessionnelle.presentiel
                ? "PRESENTIEL"
                : juryTypeMiseEnSituationProfessionnelle.checked &&
                    juryTypeMiseEnSituationProfessionnelle.distanciel
                  ? "A_DISTANCE"
                  : null,
          juryTypeSoutenanceOrale:
            juryTypeSoutenanceOrale.checked &&
            juryTypeSoutenanceOrale.presentiel &&
            juryTypeSoutenanceOrale.distanciel
              ? "LES_DEUX"
              : juryTypeSoutenanceOrale.checked &&
                  juryTypeSoutenanceOrale.presentiel
                ? "PRESENTIEL"
                : juryTypeSoutenanceOrale.checked &&
                    juryTypeSoutenanceOrale.distanciel
                  ? "A_DISTANCE"
                  : null,
          juryFrequency: frequency,
          juryFrequencyOther: frequency ? null : data.juryFrequencyOther,
          juryPlace: data.juryPlace,
          juryEstimatedCost: data.juryEstimatedCost,
          availableAt: tzStartOfVisibility.getTime(),
        });

        successToast("Les informations ont été enregistrées");

        router.push(
          `/responsable-certifications/certifications/${certification.id}`,
        );
      } catch (error) {
        graphqlErrorToast(error);
      }
    },
    (errors) => {
      console.log("errors", errors);
    },
  );

  return (
    <div data-testid="certification-registry-manager-update-certification-description-page">
      <h1>Descriptif de la certification</h1>
      <p className="mb-12 text-xl">
        Complétez ou modifiez les informations concernant cette certification.
        Une fois la certification validée et visible, ces informations seront
        disponibles pour les AAP et les candidats.
      </p>

      <div className="flex flex-col gap-8">
        <EnhancedSectionCard
          data-testid="certification-description-card"
          title={`Informations liées au code RNCP ${certification.codeRncp}`}
          status="TO_COMPLETE"
        >
          <div className="flex flex-col gap-4">
            <h3 className="m-0">
              Descriptif de la certification dans France compétences
            </h3>
            <Info title="Intitulé">{certification.label}</Info>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Info title="Niveau">Niveau {certification.degree.level}</Info>
              <Info title="Type">{certification.typeDiplome || "Inconnu"}</Info>
              <Info title="Date de publication">
                {certification.rncpPublishedAt
                  ? format(certification.rncpPublishedAt, "dd/MM/yyyy")
                  : "Inconnue"}
              </Info>
              <Info title="Date d’échéance">
                {certification.rncpExpiresAt
                  ? format(certification.rncpExpiresAt, "dd/MM/yyyy")
                  : "Inconnue"}
              </Info>
            </div>

            <h3 className="m-0">Domaines et sous-domaines du Formacode </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certification.domains.length == 0 && (
                <div>Aucun formacode associé</div>
              )}
              {certification.domains.map((domain) => (
                <div key={domain.id} className="flex flex-col gap-2">
                  <div>{domain.label}</div>
                  <div
                    key={domain.id}
                    className="flex flex-row flex-wrap gap-2"
                  >
                    {domain.children.map((subDomain) => (
                      <Tag key={subDomain.id}>
                        {`${subDomain.code} ${subDomain.label}`}
                      </Tag>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex content-between items-start mt-2">
              <Notice
                className="bg-transparent -ml-6 text-xs p-0"
                title={
                  <span className="text-sm inline font-normal">
                    Vous trouverez dans cette section des informations à
                    compléter et d’autres non modifiables. En cas d’erreur,
                    contactez directement France compétences.
                  </span>
                }
              />
              <FranceCompetencesLogo />
            </div>
          </div>
        </EnhancedSectionCard>

        <form
          id="CertificationDescriptionForm"
          onSubmit={handleFormSubmit}
          onReset={(e) => {
            e.preventDefault();
            reset(defaultValues);
          }}
        >
          <div className="flex flex-col gap-8">
            <h2 className="m-0">Informations complémentaires</h2>
            <div className="flex flex-col gap-6">
              <h3 className="m-0">Jury</h3>
              {hasReducedRequirements && <FormOptionalFieldsDisclaimer />}
              <div className="flex flex-col gap-4">
                <h4 className="mb-0">{`Types d’épreuves${optionalJuryLabelSuffix}`}</h4>
                <div className="max-w-[620px]">
                  <Checkbox
                    className="[&_.fr-label::before]:mt-2 [&_.fr-checkbox-group]:m-0 first:[&_.fr-checkbox-group]:border-t [&_.fr-checkbox-group]:border-b [&_.fr-messages-group>p]:pt-4 [&_.fr-messages-group]:pb-0 mb-0"
                    small
                    options={juryTypeOfTest.map((typeOfTest, index) => ({
                      label: (
                        <div className="flex-1 flex flex-row items-center gap-2">
                          <div className="flex-1 py-1 cursor-pointer">
                            {typeOfTest.label}
                          </div>
                          <div
                            className="flex flex-row items-center gap-2"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <Tag
                              nativeButtonProps={{
                                onClick: () => {
                                  setValue(
                                    `juryTypeOfTest.${index}.presentiel`,
                                    !typeOfTest.presentiel,
                                    { shouldDirty: true },
                                  );
                                },
                                disabled: !typeOfTest.checked,
                              }}
                              pressed={typeOfTest.presentiel}
                            >
                              Présentiel
                            </Tag>
                            <Tag
                              nativeButtonProps={{
                                onClick: () => {
                                  setValue(
                                    `juryTypeOfTest.${index}.distanciel`,
                                    !typeOfTest.distanciel,
                                    { shouldDirty: true },
                                  );
                                },
                                disabled: !typeOfTest.checked,
                              }}
                              pressed={typeOfTest.distanciel}
                            >
                              À distance
                            </Tag>
                          </div>
                        </div>
                      ),
                      nativeInputProps: {
                        ...register(`juryTypeOfTest.${index}.checked`),
                      },
                    }))}
                    state={errors.juryTypeOfTest ? "error" : "default"}
                    stateRelatedMessage={
                      errors.juryTypeOfTest
                        ? "Veuillez renseigner au moins un type d’épreuve pour le jury de cette certification"
                        : undefined
                    }
                  />
                </div>

                <h4 className="m-0">Modalités de passage</h4>
                <div className="flex flex-row gap-4">
                  <Select
                    className="m-0"
                    label={`Fréquence des jurys${optionalJuryLabelSuffix} :`}
                    nativeSelectProps={{
                      defaultValue: "",
                      ...register("juryFrequency"),
                    }}
                    state={errors.juryFrequency ? "error" : "default"}
                    stateRelatedMessage={errors.juryFrequency?.message}
                  >
                    <option value="" disabled>
                      Selectionnez une option
                    </option>

                    {JuryFrequencies.map((frequency) => (
                      <option key={frequency.id} value={frequency.id}>
                        {frequency.label}
                      </option>
                    ))}

                    <option key="Autre" value="Autre">
                      Autre
                    </option>
                  </Select>

                  <Input
                    className="lg:min-w-96"
                    data-testid="certification-description-jury_frequency_other-input"
                    label="Autre fréquence :"
                    disabled={juryFrequency != "Autre"}
                    nativeInputProps={{
                      ...register("juryFrequencyOther"),
                    }}
                    state={errors.juryFrequencyOther ? "error" : "default"}
                    stateRelatedMessage={errors.juryFrequencyOther?.message}
                  />
                </div>
                <Input
                  className="m-0"
                  data-testid="certification-description-jury_place-input"
                  label="Lieu où se déroulera le passage (optionnel) :"
                  hintText="À renseigner s’il existe peu de lieux de passage pour cette certification. Exemple : nom d’une ville, code postal, nom du service en région..."
                  nativeInputProps={{
                    placeholder: "ex : Angers, 49100, DDETS...",
                    ...register("juryPlace"),
                  }}
                />

                <h4 className="m-0">Coûts</h4>
                <Input
                  className="mr-auto"
                  label="Estimation des frais de certification (optionnel) :"
                  hintText="Veuillez saisir un nombre à 2 décimales."
                  nativeInputProps={{
                    type: "number",
                    step: "0.01",
                    min: 0,
                    inputMode: "decimal",
                    ...register("juryEstimatedCost", {
                      setValueAs: (v) => {
                        return v === "" || v === null ? null : parseFloat(v);
                      },
                    }),
                  }}
                  state={errors.juryEstimatedCost ? "error" : "default"}
                  stateRelatedMessage={
                    errors.juryEstimatedCost
                      ? "Veuillez renseigner une estimation valide"
                      : undefined
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <h3 className="m-0">
                Visibilité de la certification sur la plateforme
              </h3>
              <p className="m-0">
                La certification sera visible par les candidats et les AAP,
                permettant le dépôt de candidatures à partir des dates indiquées
                ci-dessous. La date de fin de mise en visibilité est non
                modifiable, et correspond à l'arrivée à échéance de la
                certification sur France Compétences
              </p>

              <div className="flex flex-row gap-6">
                <Input
                  label="À partir de quand sera-t-elle visible ?"
                  hintText="Les candidats pourront la voir et la choisir."
                  nativeInputProps={{
                    ...register("startOfVisibility"),
                    type: "date",
                  }}
                  state={errors.startOfVisibility ? "error" : "default"}
                  stateRelatedMessage={errors.startOfVisibility?.message}
                />

                <Input
                  label="Jusqu'à quand sera-t-elle visible"
                  nativeInputProps={{
                    type: "date",
                    value: certification.rncpExpiresAt
                      ? format(certification.rncpExpiresAt, "yyyy-MM-dd")
                      : undefined,
                  }}
                  disabled
                  className="flex flex-col justify-between"
                />
              </div>
            </div>
          </div>

          <FormButtons
            backUrl={`/responsable-certifications/certifications/${certification.id}`}
            formState={{ isDirty, isSubmitting }}
          />
        </form>
      </div>
    </div>
  );
};

const Info = ({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) => (
  <dl className={`${className || ""}`}>
    <dt className="mb-1">{title}</dt>
    <dd className="font-medium">{children}</dd>
  </dl>
);
