"use client";

import { Alert } from "@codegouvfr/react-dsfr/Alert";
import Button from "@codegouvfr/react-dsfr/Button";
import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import Tag from "@codegouvfr/react-dsfr/Tag";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { SmallNotice } from "@/components/small-notice/SmallNotice";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";

import {
  useActiveCertifications,
  usePerimetreAccompagnementForm,
} from "./perimetreAccompagnementForm.hook";

const schema = z.object({
  organismDegrees: z
    .object({
      id: z.string(),
      label: z.string(),
      level: z.number(),
      checked: z.boolean(),
    })
    .array(),
  organismConventionCollectives: z
    .object({ id: z.string(), label: z.string(), checked: z.boolean() })
    .array(),
  organismFormacodes: z.record(
    z.string(),
    z.object({
      id: z.string(),
      code: z.string(),
      checked: z.boolean(),
    }),
  ),
});

type FormData = z.infer<typeof schema>;

export const PerimetreAccompagnementForm = ({
  organismId,
}: {
  organismId: string;
}) => {
  const router = useRouter();

  const {
    degrees,
    conventionCollectives,
    formacodes,
    organismManagedDegrees,
    organismConventionCollectives,
    organismFormacodes,
    organismTypology,
    organismAndReferentialStatus,
    updateOrganismDegreesAndFormacodes,
  } = usePerimetreAccompagnementForm({ organismId });

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
    watch,
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
  });

  const { fields: organismDegreesFields } = useFieldArray({
    control,
    name: "organismDegrees",
  });

  const watchedOrganismFormacodes = watch("organismFormacodes");
  const watchedOrganismConventionCollectives = watch(
    "organismConventionCollectives",
  );
  const watchedOrganismDegrees = watch("organismDegrees");

  const subDomains = useMemo(
    () => formacodes.filter((formacode) => formacode.type == "SUB_DOMAIN"),
    [formacodes],
  );

  const resetForm = useCallback(() => {
    if (organismAndReferentialStatus === "success") {
      reset({
        organismDegrees: degrees
          .filter((d) => d.level > 2)
          .map((d) => ({
            id: d.id,
            label: `${d.level}`,
            level: d.level,
            checked: !!organismManagedDegrees.find((omd) => omd.id === d.id),
          })),
        organismConventionCollectives: conventionCollectives.map((c) => ({
          id: c.id,
          label: c.label,
          checked: !!organismConventionCollectives.find((oc) => oc.id === c.id),
        })),
        organismFormacodes: subDomains.reduce(
          (acc, d) => ({
            ...acc,
            [d.id]: {
              id: d.id,
              code: d.code,
              checked: !!organismFormacodes.find((od) => od.code === d.code),
            },
          }),
          {},
        ),
      });
    }
  }, [
    organismAndReferentialStatus,
    reset,
    degrees,
    conventionCollectives,
    subDomains,
    organismManagedDegrees,
    organismConventionCollectives,
    organismFormacodes,
  ]);

  useEffect(resetForm, [resetForm]);

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      await updateOrganismDegreesAndFormacodes.mutateAsync({
        organismId,
        degreeIds: data.organismDegrees
          .filter((od) => od.checked)
          .map((od) => od.id),
        formacodeIds: Object.keys(data.organismFormacodes)
          .map((key) => data.organismFormacodes[key])
          .filter((od) => od.checked)
          .map((od) => od.code),
        conventionCollectiveIds: data.organismConventionCollectives
          .filter((oc) => oc.checked)
          .map((oc) => oc.id),
      });
      queryClient.invalidateQueries({
        queryKey: [organismId],
      });
      successToast("modifications enregistrées");
    } catch (e) {
      graphqlErrorToast(e);
    }
  });

  const selectedFormacodes = Object.keys(
    watchedOrganismFormacodes || {},
  ).filter((key) => watchedOrganismFormacodes[key].checked);

  const selectedLevels = (watchedOrganismDegrees || [])
    .filter((degree) => degree.checked)
    .map((degree) => degree.level);

  const selectedBranches = (watchedOrganismConventionCollectives || [])
    .filter((ccn) => ccn.checked)
    .map((ccn) => ccn.id);

  const canManageBranches =
    organismTypology === "expertBranche" ||
    organismTypology === "expertBrancheEtFiliere";

  const { certifications: activeCertifications } = useActiveCertifications({
    domaines: selectedFormacodes,
    branches: selectedBranches,
    levels: selectedLevels,
  });

  const [certifications, setCertifications] = useState(
    activeCertifications || [],
  );

  useEffect(() => {
    if (activeCertifications) {
      setCertifications(activeCertifications);
    }
  }, [activeCertifications]);

  const domainsFromSubDomains = useMemo(() => {
    return formacodes.filter((formacode) =>
      organismFormacodes.some(
        (subDomain) => subDomain.parentCode === formacode.code,
      ),
    );
  }, [formacodes, organismFormacodes]);

  return (
    <div className="flex flex-col flex-1">
      {organismAndReferentialStatus === "error" && (
        <Alert
          className="my-6"
          severity="error"
          title="Une erreur est survenue pendant la récupération des niveaux de diplôme."
        />
      )}

      {updateOrganismDegreesAndFormacodes.status === "error" && (
        <Alert
          className="my-6"
          severity="error"
          title="Une erreur est survenue pendant l'enregistrement des niveaux de diplôme."
        />
      )}

      {organismAndReferentialStatus === "success" && (
        <form
          className="flex flex-col mt-6"
          onSubmit={handleFormSubmit}
          onReset={(e) => {
            e.preventDefault();
            resetForm();
          }}
        >
          <div className="grid grid-cols-4">
            <div className="col-span-3">
              <div>
                <hr className="pb-4" />

                <fieldset className="flex flex-col gap-4">
                  <p className="m-0 text-md">
                    Sélectionnez les niveaux de certification associés à cet
                    organisme :
                  </p>

                  <Checkbox
                    className="mt-0 mb-1"
                    orientation={canManageBranches ? "vertical" : "horizontal"}
                    small
                    options={organismDegreesFields.map((od, odIndex) => ({
                      label: od.label,
                      nativeInputProps: {
                        ...register(`organismDegrees.${odIndex}.checked`),
                      },
                    }))}
                  />
                </fieldset>

                <hr className="pb-4" />

                <fieldset className="flex flex-col gap-4 mb-4">
                  <p className="m-0 text-md">Cet organisme couvre :</p>

                  <div className="flex flex-row justify-between gap-4 mb-4">
                    <div className="flex flex-wrap gap-2">
                      <Tag>{`${domainsFromSubDomains.length} champs sémantiques`}</Tag>

                      <Tag>{`${organismFormacodes.length} mots clés / descripteurs`}</Tag>
                    </div>

                    <Button
                      size="small"
                      priority="secondary"
                      type="button"
                      onClick={() => {
                        router.push("./formacode");
                      }}
                    >
                      Modifier
                    </Button>
                  </div>
                </fieldset>

                <hr className="pb-4" />

                <fieldset className="flex flex-row justify-between gap-4 mb-4">
                  <p className="m-0 text-md">
                    Cet organisme est visible dans les recherches des candidats
                    pour {certifications.length} certifications.
                  </p>

                  <Button
                    size="small"
                    priority="tertiary no outline"
                    className="min-w-64 justify-center m-auto"
                    type="button"
                    onClick={() => {
                      router.push("./certifications");
                    }}
                  >
                    Voir les certifications concernées
                  </Button>
                </fieldset>

                <hr className="pb-4" />

                {canManageBranches && (
                  <fieldset className="flex flex-col gap-2 mt-9 p-4 border border-dsfr-light-decisions-border-border-default-grey">
                    <p className="m-0 text-md">
                      Suite à une contractualisation avec un certificateur, cet
                      organisme apparaît également dans les recherches des
                      candidats pour les certifications suivantes :
                    </p>
                    <div className="flex flex-col">
                      {organismConventionCollectives.map((ccn) => (
                        <label
                          className="py-2 px-4 border-b border-dsfr-light-decisions-border-border-default-grey pb-2 first:border-t"
                          key={ccn.id}
                        >
                          {ccn.label}
                        </label>
                      ))}
                    </div>
                    <SmallNotice>
                      <span className="text-sm inline font-normal">
                        Pour plus d’informations contactez le{" "}
                        <a
                          href="https://francevae.crisp.help/fr/?contact"
                          target="_blank"
                        >
                          support France VAE
                        </a>
                        .
                      </span>
                    </SmallNotice>
                  </fieldset>
                )}
              </div>
            </div>

            <div className="col-span-1 ml-6">
              <div className="flex flex-col px-4 pb-2 pt-6 bg-dsfr-light-decisions-background-background-alt-blue-france">
                <h6>Ressources :</h6>

                <div>
                  <p className="text-sm">
                    Les domaines d'accompagnement sont organisés selon la{" "}
                    <a
                      className="fr-link text-sm"
                      href={`https://francevae.notion.site/Guide-de-s-lection-des-domaines-d-accompagnement-bdd100b69ece834fb86781d517883537`}
                      target="_blank"
                    >
                      nomenclature du Formacode
                    </a>
                  </p>

                  <p className="text-sm">
                    <a
                      className="fr-link text-sm"
                      href={`https://vae.gouv.fr/espace-candidat/`}
                      target="_blank"
                    >
                      Liste des certifications
                    </a>
                  </p>

                  <hr />
                  <p className="text-sm">
                    <a
                      className="fr-link text-sm"
                      href="https://scribehow.com/o/BKyFuGicTyWaF4_KfL-uQA/viewer/Parametres_de_compte_de_lespace_professionnel_AAP__L1t9XG60QgORY97mqc-7tw"
                      target="_blank"
                    >
                      Guide pas à pas{" "}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <FormButtons
            hideResetButton
            className="col-span-2"
            formState={{ isSubmitting }}
            backUrl="../"
          />
        </form>
      )}
    </div>
  );
};
