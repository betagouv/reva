"use client";

import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import { Button } from "@codegouvfr/react-dsfr/Button";
import Input from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import {
  sanitizedOptionalEmail,
  sanitizedOptionalPhone,
  sanitizedOptionalText,
  sanitizedOptionalTextAllowSpecialCharacters,
  sanitizedOptionalUrl,
  sanitizedUrl,
} from "@/utils/input-sanitization";

import { File as GQLFile } from "@/graphql/generated/types";

import { useUpdateAdditionalInfoPage } from "./useCertificationAdditionalInfo.hook";

export default function CertificationAdditionalInfoPage() {
  const { certificationId } = useParams<{ certificationId: string }>();
  const { certification, getCertificationQueryStatus } =
    useUpdateAdditionalInfoPage({ certificationId });

  if (getCertificationQueryStatus === "pending" || !certification) {
    return null;
  }

  return (
    <div data-testid="update-certification-additional-info-page">
      <Breadcrumb
        currentPageLabel="Documentation"
        segments={[
          {
            label: `RNCP${certification.codeRncp} - ${certification.label}`,
            linkProps: {
              href: `/responsable-certifications/certifications/${certification.id}`,
            },
          },
        ]}
      />
      <h1>Documentation</h1>
      <FormOptionalFieldsDisclaimer />
      <p className="text-xl">
        La transmission de ces ressources aux AAP et aux candidats vous
        permettra de recevoir des dossiers de validation bien remplis et
        complets.
      </p>
      <AdditionalInfoForm certification={certification} />
    </div>
  );
}

const getSchema = ({
  hasReducedRequirements,
}: {
  hasReducedRequirements: boolean;
}) =>
  z
    .object({
      dossierDeValidationTemplate: z
        .object({
          0: z
            .instanceof(File, { message: "Merci de remplir ce champ" })
            .optional(),
        })
        .optional(),
      additionalDocuments: z
        .object({
          0: z.instanceof(File, { message: "Merci de remplir ce champ" }),
        })
        .array(),
      dossierDeValidationLink: sanitizedOptionalUrl(),
      linkToReferential: hasReducedRequirements
        ? sanitizedOptionalUrl()
        : sanitizedUrl(),
      linkToCorrespondenceTable: sanitizedOptionalUrl(),
      linkToJuryGuide: sanitizedOptionalUrl(),
      certificationExpertContactDetails: sanitizedOptionalText(),
      certificationExpertContactPhone: sanitizedOptionalPhone(),
      certificationExpertContactEmail: sanitizedOptionalEmail(),
      usefulResources: sanitizedOptionalTextAllowSpecialCharacters(),
      commentsForAAP: sanitizedOptionalTextAllowSpecialCharacters(),
    })
    .superRefine(
      (
        { dossierDeValidationTemplate, dossierDeValidationLink },
        { addIssue },
      ) => {
        if (
          !hasReducedRequirements &&
          !dossierDeValidationTemplate?.[0] &&
          !dossierDeValidationLink
        ) {
          addIssue({
            path: ["dossierDeValidationTemplate[0]"],
            message: "Vous devez renseigner au moins un de ces deux champs",
            code: "custom",
          });
          addIssue({
            path: ["dossierDeValidationLink"],
            message: "Vous devez renseigner au moins un de ces deux champs",
            code: "custom",
          });
        }
      },
    );

type FormData = z.infer<ReturnType<typeof getSchema>>;

const AdditionalInfoForm = ({
  certification,
}: {
  certification: {
    id: string;
    certificationAuthorityStructure?: {
      hasReducedRequirements: boolean;
    } | null;
    additionalInfo?: {
      linkToReferential: string;
      linkToCorrespondenceTable?: string | null;
      linkToJuryGuide?: string | null;
      certificationExpertContactDetails?: string | null;
      certificationExpertContactPhone?: string | null;
      certificationExpertContactEmail?: string | null;
      usefulResources?: string | null;
      commentsForAAP?: string | null;
      dossierDeValidationTemplate?: {
        url: string;
        name: string;
        previewUrl?: string | null;
        mimeType: string;
      } | null;
      additionalDocuments?: {
        url: string;
        name: string;
        previewUrl?: string | null;
        mimeType: string;
      }[];
      dossierDeValidationLink?: string | null;
    } | null;
  };
}) => {
  const router = useRouter();
  const hasReducedRequirements =
    certification.certificationAuthorityStructure?.hasReducedRequirements ??
    false;
  const schema = useMemo(
    () => getSchema({ hasReducedRequirements }),
    [hasReducedRequirements],
  );
  const optionalReferentialLabelSuffix = hasReducedRequirements
    ? " (optionnel)"
    : "";
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty, isSubmitting },
    watch,
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      linkToReferential: certification.additionalInfo?.linkToReferential || "",
      linkToCorrespondenceTable:
        certification.additionalInfo?.linkToCorrespondenceTable || "",
      linkToJuryGuide: certification.additionalInfo?.linkToJuryGuide || "",
      certificationExpertContactDetails:
        certification.additionalInfo?.certificationExpertContactDetails || "",
      certificationExpertContactPhone:
        certification.additionalInfo?.certificationExpertContactPhone || "",
      certificationExpertContactEmail:
        certification.additionalInfo?.certificationExpertContactEmail || "",
      usefulResources: certification.additionalInfo?.usefulResources || "",
      commentsForAAP: certification.additionalInfo?.commentsForAAP || "",
      dossierDeValidationTemplate: undefined,
      dossierDeValidationLink:
        certification.additionalInfo?.dossierDeValidationLink || "",
      additionalDocuments:
        certification.additionalInfo?.additionalDocuments?.map((doc) => ({
          0: { name: doc.name } as File,
        })) || [],
    },
  });
  const defaultDossierDeValidationTemplate = useMemo(
    () =>
      getFancyDefaultFile(
        certification.additionalInfo?.dossierDeValidationTemplate,
      ),
    [certification.additionalInfo?.dossierDeValidationTemplate],
  );

  const {
    fields: additionalDocumentsFields,
    append: appendAdditionalDocument,
    remove: removeAdditionalDocument,
  } = useFieldArray<FormData>({
    control,
    name: "additionalDocuments",
  });

  const defaultAdditionalDocuments = useMemo(() => {
    // map defaultFile for the FancyUpload component
    // look for the file name of the FancyUpload and find a match in the certification additionalDocuments
    // if found, return the file
    return additionalDocumentsFields?.map((file) =>
      getFancyDefaultFile(
        certification?.additionalInfo?.additionalDocuments?.find(
          (doc) => doc.name === file[0]?.name,
        ),
      ),
    );
  }, [
    additionalDocumentsFields,
    certification.additionalInfo?.additionalDocuments,
  ]);

  const { updateCertificationAdditionalInfo } = useUpdateAdditionalInfoPage({
    certificationId: certification.id,
  });

  const onFormSubmit = async (data: FormData) => {
    try {
      const dossierDeValidationTemplate =
        data.dossierDeValidationTemplate?.[0] ?? null;
      const additionalDocuments = data.additionalDocuments.map((d) => d?.[0]);
      await updateCertificationAdditionalInfo.mutateAsync({
        certificationId: certification.id,
        additionalInfo: {
          ...data,
          linkToReferential: data.linkToReferential || "",
          dossierDeValidationTemplate,
          additionalDocuments,
        },
      });
      successToast("Les informations ont été enregistrées");
      router.push(
        `/responsable-certifications/certifications/${certification.id}`,
      );
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  const [watchedDossierDeValidationTemplate, watchedDossierDeValidationLink] =
    watch(["dossierDeValidationTemplate", "dossierDeValidationLink"]);

  const handleReset = () => {
    reset();
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      onReset={handleReset}
      className="flex flex-col gap-10"
    >
      <div>
        <h2>Documents essentiels</h2>
        <FancyUpload
          dataTest="dossier-de-validation-template-upload"
          title={"Importer un fichier de trame de dossier de validation"}
          hint="Formats supportés : jpg, png, pdf avec un poids maximum de 15Mo"
          state={errors.dossierDeValidationTemplate?.[0] ? "error" : "default"}
          stateRelatedMessage={errors.dossierDeValidationTemplate?.[0]?.message}
          nativeInputProps={{
            disabled: !!watchedDossierDeValidationLink,
            accept: "image/jpeg,image/png,application/pdf",
            ...register("dossierDeValidationTemplate"),
          }}
          defaultFile={defaultDossierDeValidationTemplate}
          className="mb-4"
        />
        <div className="flex flex-col gap-4 px-8 mb-10">
          <label className="font-bold text-lg">
            Ou renseigner le lien vers la trame du dossier
          </label>
          <Input
            data-testid="dossier-de-validation-link"
            label="Lien vers la trame :"
            className="flex-1"
            disabled={!!watchedDossierDeValidationTemplate?.[0]}
            state={errors.dossierDeValidationLink ? "error" : "default"}
            stateRelatedMessage={errors.dossierDeValidationLink?.message}
            nativeInputProps={{
              placeholder: "https://",
              ...register("dossierDeValidationLink"),
            }}
          />
        </div>
        <Input
          data-testid="referential-link-input"
          label={`Lien vers les référentiels d’activités et de compétences${optionalReferentialLabelSuffix} :`}
          state={errors.linkToReferential ? "error" : "default"}
          stateRelatedMessage={errors.linkToReferential?.message}
          nativeInputProps={{
            placeholder: "https://",
            ...register("linkToReferential"),
          }}
        />
        <Input
          label="Lien vers le référentiel d'évaluation (optionnel) :"
          nativeInputProps={{
            placeholder: "https://",
            ...register("linkToJuryGuide"),
          }}
          state={errors.linkToJuryGuide ? "error" : "default"}
          stateRelatedMessage={errors.linkToJuryGuide?.message}
        />
        <Input
          label="Lien vers le tableau des correspondances et dispenses de blocs (optionnel) :"
          state={errors.linkToCorrespondenceTable ? "error" : "default"}
          stateRelatedMessage={errors.linkToCorrespondenceTable?.message}
          nativeInputProps={{
            placeholder: "https://",
            ...register("linkToCorrespondenceTable"),
          }}
        />
      </div>

      <div>
        <h2>Documents complémentaires</h2>
        <p>
          Vous pouvez ajouter ici tous les documents complémentaires que vous
          jugez utiles pour accompagner les candidats et les AAP dans leur
          parcours VAE.
        </p>
        <div className="flex flex-col gap-4">
          {additionalDocumentsFields.map((field, index) => (
            <FancyUpload
              key={field.id}
              dataTest="additional-document-upload"
              title={
                defaultAdditionalDocuments?.[index]?.name ??
                "Ajouter une pièce jointe (optionnel)"
              }
              description="Exemples de documents utiles : référentiels d'activités et de compétences, guides pratiques, grilles d'évaluation, exemples de dossiers, fiches méthodologiques, etc."
              hint="Formats supportés : jpg, png, pdf avec un poids maximum de 15Mo"
              state={errors.additionalDocuments?.[index] ? "error" : "default"}
              stateRelatedMessage={
                errors.additionalDocuments?.[index]?.[0]?.message
              }
              nativeInputProps={{
                accept: "image/jpeg,image/png,application/pdf",
                ...register(`additionalDocuments.${index}`),
              }}
              onClickDelete={() => removeAdditionalDocument(index)}
              defaultFile={defaultAdditionalDocuments?.[index]}
            />
          ))}
          <hr className="py-0.5" />
          <Button
            priority="tertiary no outline"
            className="text-sm"
            type="button"
            iconId="fr-icon-add-line"
            onClick={() => appendAdditionalDocument({ 0: {} as File })}
          >
            Ajouter une pièce jointe
          </Button>
        </div>
      </div>

      <div>
        <h2>Informations complémentaires</h2>
        <div className="mb-8">
          <h3 className="text-2xl mb-6">
            Contact d’un expert de la certification (le cas échéant)
          </h3>
          <Input
            label="Personne ou Service concerné (optionnel) :"
            className="flex-1"
            nativeInputProps={{
              ...register("certificationExpertContactDetails"),
            }}
            state={
              errors.certificationExpertContactDetails ? "error" : "default"
            }
            stateRelatedMessage={
              errors.certificationExpertContactDetails?.message
            }
          />
          <div className="flex flex-col gap-0 lg:flex-row lg:gap-6">
            <Input
              label="Téléphone (optionnel) :"
              className="flex-1 lg:max-w-sm mb-0"
              nativeInputProps={{
                ...register("certificationExpertContactPhone"),
              }}
              state={
                errors.certificationExpertContactPhone ? "error" : "default"
              }
              stateRelatedMessage={
                errors.certificationExpertContactPhone?.message
              }
            />
            <Input
              label="Adresse électronique (optionnel) :"
              className="flex-1"
              nativeInputProps={{
                ...register("certificationExpertContactEmail"),
              }}
              state={
                errors.certificationExpertContactEmail ? "error" : "default"
              }
              stateRelatedMessage={
                errors.certificationExpertContactEmail?.message
              }
            />
          </div>
        </div>

        <div>
          <h3 className="text-2xl mb-6">Autres informations</h3>
          <Input
            label="Aide au parcours de VAE (optionnel) :"
            textArea
            nativeTextAreaProps={{ ...register("usefulResources") }}
            state={errors.usefulResources ? "error" : "default"}
            stateRelatedMessage={errors.usefulResources?.message}
          />
          <Input
            label="Remarques à destination des AAP et candidats (optionnel) :"
            textArea
            nativeTextAreaProps={{ ...register("commentsForAAP") }}
            state={errors.commentsForAAP ? "error" : "default"}
            stateRelatedMessage={errors.commentsForAAP?.message}
          />
        </div>
      </div>
      <FormButtons
        backUrl={`/responsable-certifications/certifications/${certification.id}`}
        formState={{ isDirty, isSubmitting }}
        className="mt-2"
      />
    </form>
  );
};

const getFancyDefaultFile = (file?: GQLFile | null) =>
  file?.previewUrl
    ? {
        name: file.name,
        mimeType: file.mimeType,
        url: file.previewUrl,
      }
    : undefined;
