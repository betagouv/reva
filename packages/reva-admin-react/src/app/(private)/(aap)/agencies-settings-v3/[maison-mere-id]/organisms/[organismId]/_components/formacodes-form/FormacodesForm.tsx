"use client";

import Accordion from "@codegouvfr/react-dsfr/Accordion";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import SearchBar from "@codegouvfr/react-dsfr/SearchBar";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";

import {
  useActiveCertifications,
  useFormacodesForm,
} from "./formacodesForm.hook";

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

export const FormacodesForm = ({ organismId }: { organismId: string }) => {
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
  } = useFormacodesForm({ organismId });

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
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

  const selectedLevels = (watchedOrganismDegrees || [])
    .filter((degree) => degree.checked)
    .map((degree) => degree.level);

  const selectedBranches = (watchedOrganismConventionCollectives || [])
    .filter((ccn) => ccn.checked)
    .map((ccn) => ccn.id);

  const canManageDomaines =
    organismTypology === "expertFiliere" ||
    organismTypology === "expertBrancheEtFiliere";

  const [filter, setFilter] = useState("");

  const filters = filter.split(" ").filter((filter) => filter.length > 0);

  let filteredSubDomains = [...subDomains];
  let filteredDomains = [...domains];
  let filteredMainDomains = [...mainDomains];

  if (filters.length > 0) {
    filteredSubDomains = subDomains.filter((subDomain) =>
      filters.some(
        (filter) =>
          subDomain.label.toLowerCase().includes(filter.toLowerCase()) ||
          subDomain.code.toLowerCase().includes(filter.toLowerCase()),
      ),
    );

    filteredDomains = domains.filter(
      (domain) =>
        filters.some(
          (filter) =>
            domain.label.toLowerCase().includes(filter.toLowerCase()) ||
            domain.code.toLowerCase().includes(filter.toLowerCase()),
        ) ||
        filteredSubDomains.some(
          (subDomain) => subDomain.parentCode == domain.code,
        ),
    );

    filteredMainDomains = mainDomains.filter((mainDomain) =>
      filteredDomains.some((domain) => domain.parentCode == mainDomain.code),
    );
  }

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
        <div>
          <div className="mt-6 mb-12">
            <SearchBar
              label="Rechercher par champs sémantique, mot clé ou formacode"
              allowEmptySearch
              big
              onButtonClick={() => setFilter(filter)}
              renderInput={({ className, id, placeholder, type }) => (
                <input
                  className={className}
                  id={id}
                  placeholder={placeholder}
                  type={type}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              )}
            />
          </div>

          <form
            className="flex flex-col gap-8 mt-6"
            onSubmit={handleFormSubmit}
            onReset={(e) => {
              e.preventDefault();
              resetForm();
            }}
          >
            <div className="grid grid-cols-4">
              <div className="col-span-3">
                {canManageDomaines && (
                  <fieldset className="flex flex-col gap-4">
                    <div className="flex flex-col">
                      {filteredMainDomains.map((mainDomain) => (
                        <div
                          key={mainDomain.code}
                          className="flex flex-col mb-8"
                        >
                          <div className="text-2xl font-bold mb-4">
                            {mainDomain.label}
                          </div>
                          {filteredDomains
                            .filter(
                              (domain) => domain.parentCode == mainDomain.code,
                            )
                            .map((domain) => {
                              const subDomainsForDomain =
                                filteredSubDomains.filter(
                                  (subDomain) =>
                                    subDomain.parentCode == domain.code,
                                );
                              const isTotallySelected =
                                subDomainsForDomain.every(
                                  (d) =>
                                    watchedOrganismFormacodes?.[d.id]
                                      ?.checked == true,
                                );
                              const isPartiallySelected =
                                subDomainsForDomain.some(
                                  (d) =>
                                    watchedOrganismFormacodes?.[d.id]
                                      ?.checked == true,
                                );

                              return (
                                <div key={domain.code} className="relative">
                                  <Checkbox
                                    small
                                    className={`absolute z-10 top-[1px] pl-2 pt-3 h-[48px] select-none ${isTotallySelected ? "checkbox-totally" : isPartiallySelected ? "checkbox-partial" : ""}`}
                                    options={[
                                      {
                                        label: (
                                          <ToolTip
                                            WrappedComponent={`${domain.code} ${domain.label}`}
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

                                  {subDomainsForDomain.length === 0 ? (
                                    <div className="h-12" />
                                  ) : (
                                    <Accordion
                                      label=""
                                      onExpandedChange={() => {}}
                                      expanded={filters.length > 0}
                                    >
                                      <Checkbox
                                        small
                                        className={`[&_label]:first-letter:uppercase mb-0 ${subDomainsForDomain.length > 1 ? "ml-4" : "ml-7"}`}
                                        options={subDomainsForDomain.map(
                                          (od) => ({
                                            label: (
                                              <ToolTip
                                                WrappedComponent={`${od.code} ${od.label}`}
                                                WrappedChildren={
                                                  <CertificationsList
                                                    domaineIds={[od.id]}
                                                    brancheIds={
                                                      selectedBranches
                                                    }
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
                                          }),
                                        )}
                                      />
                                    </Accordion>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      ))}
                    </div>
                  </fieldset>
                )}
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
        </div>
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
