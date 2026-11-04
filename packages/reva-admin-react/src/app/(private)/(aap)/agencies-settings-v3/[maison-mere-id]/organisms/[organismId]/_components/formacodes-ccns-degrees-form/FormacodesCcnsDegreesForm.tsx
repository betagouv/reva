"use client";

import Accordion from "@codegouvfr/react-dsfr/Accordion";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { SmallNotice } from "@/components/small-notice/SmallNotice";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";

import {
  useActiveCertifications,
  useFormacodesCcnsDegreesForm,
} from "./formacodesCcnsDegreesForm.hook";

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

export const FormacodesCcnsDegreesForm = ({
  organismId,
  backButtonUrl,
}: {
  organismId: string;
  backButtonUrl: string;
}) => {
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
    isAdmin,
  } = useFormacodesCcnsDegreesForm({ organismId });

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, isDirty },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
  });

  const { fields: organismDegreesFields } = useFieldArray({
    control,
    name: "organismDegrees",
  });

  const { fields: organismConventionCollectivesFields } = useFieldArray({
    control,
    name: "organismConventionCollectives",
  });

  const watchedOrganismFormacodes = watch("organismFormacodes");
  const watchedOrganismConventionCollectives = watch(
    "organismConventionCollectives",
  );
  const watchedOrganismDegrees = watch("organismDegrees");

  const mainDomains = useMemo(
    () => formacodes.filter((formacode) => formacode.type == "MAIN_DOMAIN"),
    [formacodes],
  );

  const domains = useMemo(
    () => formacodes.filter((formacode) => formacode.type == "DOMAIN"),
    [formacodes],
  );

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
            label: `Niveau ${d.level}`,
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

  const canManageDomaines =
    organismTypology === "expertFiliere" ||
    organismTypology === "expertBrancheEtFiliere";

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
          className="flex flex-col gap-8 mt-6"
          onSubmit={handleFormSubmit}
          onReset={(e) => {
            e.preventDefault();
            resetForm();
          }}
        >
          <div
            className={`grid grid-cols-1 gap-8 md:grid-cols-${canManageBranches ? 2 : 1} md:col-span-2`}
          >
            <fieldset className="flex flex-col gap-4">
              <legend className="text-3xl font-bold mb-4">
                Niveaux de certification
              </legend>
              <Checkbox
                orientation={canManageBranches ? "vertical" : "horizontal"}
                legend={
                  <p className="text-sm">
                    Quels sont les niveaux de certification que vous couvrez ?
                  </p>
                }
                options={organismDegreesFields.map((od, odIndex) => ({
                  label: od.label,
                  nativeInputProps: {
                    ...register(`organismDegrees.${odIndex}.checked`),
                  },
                }))}
              />
            </fieldset>

            {canManageBranches && (
              <fieldset className="flex flex-col gap-4">
                <legend className="text-3xl font-bold mb-4">Branches</legend>
                <div className="flex flex-col">
                  <Checkbox
                    legend={
                      <p className="text-sm">
                        Quelles sont les branches que vous couvrez ?
                      </p>
                    }
                    disabled={!isAdmin}
                    options={organismConventionCollectivesFields.map(
                      (oc, ocIndex) => ({
                        label: oc.label,
                        nativeInputProps: {
                          ...register(
                            `organismConventionCollectives.${ocIndex}.checked`,
                          ),
                        },
                      }),
                    )}
                  />
                  <SmallNotice>
                    Vous souhaitez modifier vos branches ? <br />
                    Adressez-vous directement au support à support@vae.gouv.fr.
                  </SmallNotice>
                </div>
              </fieldset>
            )}
          </div>

          {canManageDomaines && (
            <fieldset className="flex flex-col gap-4">
              <legend className="text-3xl font-bold mb-4">Domaines</legend>

              <div className="flex flex-col">
                {mainDomains.map((mainDomain) => (
                  <div key={mainDomain.code} className="flex flex-col mb-8">
                    <div className="text-2xl font-bold mb-4">
                      {mainDomain.label}
                    </div>
                    {domains
                      .filter((domain) => domain.parentCode == mainDomain.code)
                      .map((domain) => {
                        const subDomainsForDomain = subDomains.filter(
                          (subDomain) => subDomain.parentCode == domain.code,
                        );
                        const isTotallySelected = subDomainsForDomain.every(
                          (d) =>
                            watchedOrganismFormacodes?.[d.id]?.checked == true,
                        );
                        const isPartiallySelected = subDomainsForDomain.some(
                          (d) =>
                            watchedOrganismFormacodes?.[d.id]?.checked == true,
                        );

                        return (
                          <div key={domain.code} className="relative">
                            <Checkbox
                              className={`absolute z-10 top-[1px] pl-2 pt-3 h-[48px] select-none ${isTotallySelected ? "checkbox-totally" : isPartiallySelected ? "checkbox-partial" : ""}`}
                              options={[
                                {
                                  label: (
                                    <ToolTip
                                      WrappedComponent={`${domain.label}`}
                                      WrappedChildren={
                                        <CertificationsList
                                          domaineIds={subDomainsForDomain.map(
                                            (d) => d.id,
                                          )}
                                          brancheIds={selectedBranches}
                                          levels={selectedLevels}
                                        />
                                      }
                                    />
                                  ),
                                  nativeInputProps: {
                                    checked: isTotallySelected,
                                    onChange: (e) => {
                                      setValue(
                                        "organismFormacodes",
                                        {
                                          ...watchedOrganismFormacodes,
                                          ...subDomainsForDomain.reduce(
                                            (acc, d) => ({
                                              ...acc,
                                              [d.id]: {
                                                id: d.id,
                                                code: d.code,
                                                checked: e.target.checked,
                                              },
                                            }),
                                            {},
                                          ),
                                        },
                                        { shouldDirty: true },
                                      );
                                    },
                                  },
                                },
                              ]}
                            />

                            <Accordion label="">
                              <Checkbox
                                className={`[&_label]:first-letter:uppercase mb-0 ${subDomainsForDomain.length > 1 ? "ml-4" : "ml-7"}`}
                                options={subDomainsForDomain.map((od) => ({
                                  label: (
                                    <ToolTip
                                      WrappedComponent={`${od.code} ${od.label}`}
                                      WrappedChildren={
                                        <CertificationsList
                                          domaineIds={[od.id]}
                                          brancheIds={selectedBranches}
                                          levels={selectedLevels}
                                        />
                                      }
                                    />
                                  ),
                                  nativeInputProps: {
                                    ...register(
                                      `organismFormacodes.${od.id}.checked`,
                                    ),
                                  },
                                }))}
                              />
                            </Accordion>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          {certifications.length > 0 && (
            <fieldset className="col-span-2 flex flex-col bg-neutral-100 p-6">
              <h3 className="mb-2">Certifications proposées aux candidats :</h3>
              <div className="text-sm italic mb-8">
                <strong>Important</strong>, les certifications sont filtrées en
                fonction des niveaux et branches sélectionnés.
              </div>

              {certifications.map((certification) => (
                <Link
                  key={certification.id}
                  href={`/certification-details/${certification.id}`}
                  target="_blank"
                  className="py-2 text-sm bg-none text-dsfr-blue-france-sun-113 border-dsfr-light-decisions-border-border-default-grey border-t last:border-b"
                >{`${certification.codeRncp} - ${certification.label}`}</Link>
              ))}
            </fieldset>
          )}

          <FormButtons
            className="col-span-2"
            formState={{ isSubmitting, isDirty }}
            backUrl={backButtonUrl}
          />
        </form>
      )}
    </div>
  );
};

const ToolTip = (props: {
  WrappedComponent: React.ReactNode;
  WrappedChildren: React.ReactNode;
}) => {
  const [hover, setHover] = useState(false);

  const tooltipRef = useRef<HTMLDivElement>(null);

  const getTooltipPosition = () => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top + window.scrollY,
        bottom: rect.bottom + window.scrollY,
        width: rect.width,
      };
    }
    return { left: 0, top: 0, bottom: 0, width: 0 };
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <div
      ref={tooltipRef}
      onMouseEnter={() => setHover(true)}
      onMouseOver={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {props.WrappedComponent}

      {hover &&
        createPortal(
          <div
            style={{
              position: "absolute",
              zIndex: 11,
              left: tooltipPosition.left + tooltipPosition.width,
              top: tooltipPosition.top,
              // bottom: window.innerHeight - tooltipPosition.bottom,
            }}
          >
            {props.WrappedChildren}
          </div>,
          document.body,
        )}
    </div>
  );
};

const CertificationsList = (props: {
  domaineIds: string[];
  brancheIds: string[];
  levels: number[];
}) => {
  const { certifications } = useActiveCertifications({
    domaines: props.domaineIds,
    branches: props.brancheIds,
    levels: props.levels,
  });

  return (
    <div className="relative mt-[-30px] ml-6 shadow-md rounded-md border-[0.5px] border-dsfr-light-decisions-border-border-default-grey">
      <div className="absolute z-1 top-8 left-[-10px] w-[20px] h-[20px] rotate-[-45deg] bg-white shadow-md border-[0.5px] border-dsfr-light-decisions-border-border-default-grey" />
      <div className="relative z-2 flex flex-col gap-2 p-4 bg-white rounded-md">
        <div>
          <div className="text-sm font-medium mb-1">
            Certifications proposées aux candidats :
          </div>
          <div className="text-xs italic mb-2">
            <strong>Important</strong>, les certifications sont filtrées en
            fonction des niveaux et branches sélectionnés.
          </div>
        </div>

        {certifications?.map((certification) => (
          <Link
            key={certification.id}
            href={`/certification-details/${certification.id}`}
            target="_blank"
            className="text-xs bg-none text-dsfr-blue-france-sun-113"
          >
            {certification.codeRncp} - {certification.label}
          </Link>
        ))}

        {certifications && certifications.length === 0 && (
          <div className="text-xs text-dsfr-light-text-mention-grey">
            Aucune certification référencée chez France VAE pour ce formacode.
          </div>
        )}
      </div>
    </div>
  );
};
