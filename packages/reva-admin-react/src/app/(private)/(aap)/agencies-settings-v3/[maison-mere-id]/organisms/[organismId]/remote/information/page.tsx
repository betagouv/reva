"use client";

import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";

import { RemoteZone } from "@/graphql/generated/graphql";

import { useInformationRemotePage } from "./informationRemote.hook";
import {
  InformationRemoteFormData,
  informationRemoteFormSchema,
} from "./informationRemoteFormSchema";

const InformationsRemotePage = () => {
  const { organismId, "maison-mere-id": maisonMereAAPId } = useParams<{
    organismId: string;
    "maison-mere-id": string;
  }>();
  const {
    organism,
    getOrganismStatus,
    createOrUpdateInformationsCommercialesAndRemoteStatus,
    isAdmin,
  } = useInformationRemotePage({ organismId, maisonMereAAPId });

  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<InformationRemoteFormData>({
    resolver: standardSchemaResolver(informationRemoteFormSchema),
  });

  const handleReset = useCallback(() => {
    reset({
      ...organism,
      isRemoteFranceMetropolitaine: organism?.remoteZones?.includes(
        "FRANCE_METROPOLITAINE",
      ),
      isRemoteGuadeloupe: organism?.remoteZones?.includes("GUADELOUPE"),
      isRemoteGuyane: organism?.remoteZones?.includes("GUYANE"),
      isRemoteLaReunion: organism?.remoteZones?.includes("LA_REUNION"),
      isRemoteMartinique: organism?.remoteZones?.includes("MARTINIQUE"),
      isRemoteMayotte: organism?.remoteZones?.includes("MAYOTTE"),
      isRemoteSaintPierreEtMiquelon: organism?.remoteZones?.includes(
        "SAINT_PIERRE_ET_MIQUELON",
      ),
      isRemoteSainteLucieSaintMartin: organism?.remoteZones?.includes(
        "SAINTE_LUCIE_SAINT_MARTIN",
      ),
      isRemoteSaintBarthelemy:
        organism?.remoteZones?.includes("SAINT_BARTHELEMY"),
    } as InformationRemoteFormData);
  }, [organism, reset]);

  useEffect(() => handleReset(), [handleReset]);

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      const {
        isRemoteFranceMetropolitaine,
        isRemoteGuadeloupe,
        isRemoteGuyane,
        isRemoteLaReunion,
        isRemoteMartinique,
        isRemoteMayotte,
        isRemoteSaintPierreEtMiquelon,
        isRemoteSainteLucieSaintMartin,
        isRemoteSaintBarthelemy,
        ...informationsCommerciales
      } = data;

      const remoteZones: RemoteZone[] = [];

      if (isRemoteFranceMetropolitaine) {
        remoteZones.push("FRANCE_METROPOLITAINE");
      }
      if (isRemoteGuadeloupe) {
        remoteZones.push("GUADELOUPE");
      }
      if (isRemoteGuyane) {
        remoteZones.push("GUYANE");
      }
      if (isRemoteLaReunion) {
        remoteZones.push("LA_REUNION");
      }
      if (isRemoteMartinique) {
        remoteZones.push("MARTINIQUE");
      }
      if (isRemoteMayotte) {
        remoteZones.push("MAYOTTE");
      }
      if (isRemoteSaintPierreEtMiquelon) {
        remoteZones.push("SAINT_PIERRE_ET_MIQUELON");
      }
      if (isRemoteSainteLucieSaintMartin) {
        remoteZones.push("SAINTE_LUCIE_SAINT_MARTIN");
      }
      if (isRemoteSaintBarthelemy) {
        remoteZones.push("SAINT_BARTHELEMY");
      }
      await createOrUpdateInformationsCommercialesAndRemoteStatus.mutateAsync({
        organismId: organism?.id,
        remoteZones,
        informationsCommerciales,
      });
      queryClient.invalidateQueries({
        queryKey: [organism?.id],
      });
      successToast("modifications enregistrées");
    } catch (e) {
      graphqlErrorToast(e);
    }
  });

  return (
    <div className="flex flex-col w-full">
      <Breadcrumb
        currentPageLabel={"Informations affichées au candidat"}
        segments={[
          isAdmin
            ? {
                label: organism?.maisonMereAAP?.raisonSociale,
                linkProps: {
                  href: `/maison-mere-aap/${maisonMereAAPId}`,
                },
              }
            : {
                label: "Paramètres",
                linkProps: { href: "/agencies-settings-v3" },
              },
          {
            label: "Accompagnement à distance",
            linkProps: {
              href: `/agencies-settings-v3/${maisonMereAAPId}/organisms/${organismId}/remote`,
            },
          },
        ]}
      />
      <h1>Informations affichées au candidat</h1>
      <FormOptionalFieldsDisclaimer />
      <p>
        Renseignez les informations qui seront affichées dans les recherches des
        candidats pour un accompagnement à distance.
      </p>

      {getOrganismStatus === "success" && (
        <>
          <form
            className="flex flex-col mt-6"
            onSubmit={handleFormSubmit}
            onReset={(e) => {
              e.preventDefault();
              handleReset();
            }}
          >
            <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
              <Input
                className="col-span-3"
                label="Nom de la structure"
                state={errors.nomPublic ? "error" : "default"}
                stateRelatedMessage={errors.nomPublic?.message}
                nativeInputProps={{ ...register("nomPublic") }}
              />
              <Input
                label="Téléphone"
                nativeInputProps={{
                  ...register("telephone"),
                }}
                state={errors.telephone ? "error" : "default"}
                stateRelatedMessage={errors.telephone?.message}
              />
              <Input
                label="Adresse électronique de contact"
                state={errors.emailContact ? "error" : "default"}
                stateRelatedMessage={errors.emailContact?.message}
                nativeInputProps={{
                  ...register("emailContact"),
                }}
              />
              <Input
                label="Site internet (optionnel)"
                nativeInputProps={{
                  ...register("siteInternet"),
                }}
                state={errors.siteInternet ? "error" : "default"}
                stateRelatedMessage={errors.siteInternet?.message}
              />
            </fieldset>
            <fieldset className="flex flex-col mt-6">
              <Checkbox
                legend="Quelles sont les zones éligibles à l'accompagnement à distance ?"
                hintText="Vous pouvez sélectionner une ou plusieurs zones."
                options={[
                  {
                    label: "France métropolitaine (UTC+2)",
                    nativeInputProps: {
                      ...register("isRemoteFranceMetropolitaine"),
                    },
                  },
                  {
                    label: "Guadeloupe (UTC-4)",
                    nativeInputProps: {
                      ...register("isRemoteGuadeloupe"),
                    },
                  },
                  {
                    label: "Guyane (UTC-3)",
                    nativeInputProps: {
                      ...register("isRemoteGuyane"),
                    },
                  },
                  {
                    label: "Martinique (UTC-4)",
                    nativeInputProps: {
                      ...register("isRemoteMartinique"),
                    },
                  },
                  {
                    label: "Mayotte (UTC+3)",
                    nativeInputProps: {
                      ...register("isRemoteMayotte"),
                    },
                  },
                  {
                    label: "La Réunion (UTC+4)",
                    nativeInputProps: {
                      ...register("isRemoteLaReunion"),
                    },
                  },
                  {
                    label: "Saint-Pierre-et-Miquelon (UTC-2)",
                    nativeInputProps: {
                      ...register("isRemoteSaintPierreEtMiquelon"),
                    },
                  },
                  {
                    label: "Saint-Martin (UTC-4)",
                    nativeInputProps: {
                      ...register("isRemoteSainteLucieSaintMartin"),
                    },
                  },
                  {
                    label: "Saint-Barthélemy (UTC-4)",
                    nativeInputProps: {
                      ...register("isRemoteSaintBarthelemy"),
                    },
                  },
                ]}
                state={
                  errors.isRemoteFranceMetropolitaine ? "error" : "default"
                }
                stateRelatedMessage={
                  errors.isRemoteFranceMetropolitaine?.message
                }
              />
            </fieldset>
            <FormButtons
              backUrl={`/agencies-settings-v3/${maisonMereAAPId}/organisms/${organismId}/remote/`}
              formState={{ isSubmitting, isDirty }}
            />
          </form>
        </>
      )}
    </div>
  );
};

export default InformationsRemotePage;
