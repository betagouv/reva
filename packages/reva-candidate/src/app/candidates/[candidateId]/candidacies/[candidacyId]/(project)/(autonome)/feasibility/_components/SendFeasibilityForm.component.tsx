import Alert from "@codegouvfr/react-dsfr/Alert";
import CallOut from "@codegouvfr/react-dsfr/CallOut";
import Select from "@codegouvfr/react-dsfr/Select";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format, isBefore } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import z from "zod";

import { DownloadTile } from "@/components/download-tile/DownloadTile";
import { FancyPreview } from "@/components/fancy-preview/FancyPreview";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { BackButton } from "@/components/legacy/molecules/BackButton";
import {
  errorToast,
  graphqlErrorToast,
  successToast,
} from "@/components/toast/toast";
import Tooltip from "@/components/tooltip/Tooltip";

import { useFeasibilityPage } from "../feasibility.hook";

import { FeasibilityBanner } from "./FeasibilityBanner";
import { useSendFeasibilityForm } from "./SendFeasibilityForm.hooks";
import { UploadForm } from "./UploadForm";

const schema = z.object({
  certificationAuthorityId: z.string(),
  feasibilityFile: z.object({
    0: z.instanceof(File, { message: "Merci de remplir ce champ" }),
  }),
  idFile: z.object({
    0: z.instanceof(File, { message: "Merci de remplir ce champ" }),
  }),
  documentaryProofFile: z.object({ 0: z.instanceof(File).optional() }),
  certificateOfAttendanceFile: z.object({ 0: z.instanceof(File).optional() }),
  requirements: z
    .object({ id: z.string(), label: z.string(), checked: z.boolean() })
    .array(),
});

export type FeasibilityFormData = z.infer<typeof schema>;

export const SendFeasibilityForm = (): React.ReactNode => {
  const {
    candidacyId,
    candidacy,
    queryStatus,
    updateFeasibilityFileTemplateFirstReadAt,
  } = useFeasibilityPage();

  const { sendFeasibility } = useSendFeasibilityForm(candidacyId);
  const router = useRouter();

  const feasibility = candidacy?.feasibility;

  const certificationAuthorities = candidacy?.certificationAuthorities || [];
  const hasCertificationRncpExpired =
    !!candidacy?.certification?.rncpExpiresAt &&
    isBefore(candidacy?.certification?.rncpExpiresAt, new Date());
  const canUpload =
    !candidacy?.feasibility || candidacy.feasibility.decision == "INCOMPLETE";

  const handleFeasibilityFileTemplateDownload = () =>
    updateFeasibilityFileTemplateFirstReadAt.mutateAsync({ candidacyId });

  const feasibilityDecisionNotFinalOrIncomplete =
    feasibility?.decision !== "ADMISSIBLE" &&
    feasibility?.decision !== "REJECTED" &&
    feasibility?.decision !== "INCOMPLETE";

  const certificationValidOrDFIncomplete =
    !hasCertificationRncpExpired || feasibility?.decision === "INCOMPLETE";

  // Get the certification authority id from the candidacy.
  // This is the certification authority that can be selected by the user in the candidacy summary early in the candidacy process.
  const candidacyCertificationAuthorityId =
    candidacy?.certificationAuthority?.id;

  // Get the default certification authority for the candidacy.
  // If there is only one certification authority choice available, use it as the default
  // This will be used if there is no certification authority selected for the candidacy, but only if there is only one choice available.
  const defaultCertificationAuthorityId =
    certificationAuthorities.length === 1 ? certificationAuthorities[0].id : "";

  // if no certification authority is selected in this page, use the one from the candidacy if there is one. If not use the default one (if available)
  const certificationAuthoritySelectedId =
    candidacyCertificationAuthorityId ?? defaultCertificationAuthorityId;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<FeasibilityFormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      certificationAuthorityId: certificationAuthoritySelectedId,
      feasibilityFile: {},
      idFile: {},
      documentaryProofFile: {},
      certificateOfAttendanceFile: {},
      requirements: [
        {
          id: "0",
          label: "Mon dossier de faisabilité est correct, complet et signé.",
          checked: false,
        },
        {
          id: "1",
          label:
            "Ma pièce d’identité est conforme, en cours de validité et lisible.",
          checked: false,
        },
      ],
    },
  });

  const certificationAuthorityId = useWatch({
    control,
    name: "certificationAuthorityId",
  });

  // useForm's defaultValues is only read on the first render, so if the candidacy's
  // certification authority changes after mount (e.g. a stale cache entry gets
  // refreshed in the background), the select won't reflect it on its own. Re-sync
  // it here, unless the user has already picked a different one themselves.
  useEffect(() => {
    if (!dirtyFields.certificationAuthorityId) {
      setValue("certificationAuthorityId", certificationAuthoritySelectedId);
    }
  }, [
    certificationAuthoritySelectedId,
    dirtyFields.certificationAuthorityId,
    setValue,
  ]);

  const { fields: requirements } = useFieldArray({
    control,
    name: "requirements",
  });

  const requirementsFields = useWatch({ control, name: "requirements" });
  const areRequirementsChecked = requirementsFields.every(
    (requirement) => requirement.checked,
  );

  const CertificationContactCard = useMemo(() => {
    if (!certificationAuthorityId) {
      return null;
    }
    const selectedCertificationAuthority =
      candidacy?.certificationAuthorities.find(
        (c) => c.id === certificationAuthorityId,
      );

    return (
      <CallOut
        title={
          <>
            <span className="mb-2 inline-block">
              Comment contacter mon certificateur ?
            </span>
            <Tooltip tooltipText="Il vous informe sur les frais liés à votre parcours VAE, étudie votre dossier de faisabilité, prononce votre recevabilité et organise les jurys.">
              <span
                className="fr-icon-question-line text-dsfrBlue-500"
                aria-hidden="true"
              />
            </Tooltip>
          </>
        }
        className="w-full md:w-3/5"
      >
        {selectedCertificationAuthority?.label}
        <br />
        {selectedCertificationAuthority?.contactFullName}
        <br />
        {selectedCertificationAuthority?.contactEmail}
      </CallOut>
    );
  }, [candidacy?.certificationAuthorities, certificationAuthorityId]);

  if (queryStatus === "error") {
    return (
      <Alert
        severity="error"
        title="Une erreur est survenue."
        description="Impossible de charger la candidature. Veuillez réessayer."
        closable={false}
      />
    );
  }
  if (!candidacy) {
    return (
      <Alert
        severity="error"
        title="La candidature n'a pas été trouvée."
        closable={false}
      />
    );
  }

  const handleFormSubmit = handleSubmit(async (data) => {
    if (!candidacyId) {
      return;
    }

    try {
      const response = await sendFeasibility.mutateAsync({
        candidacyId,
        certificationAuthorityId: data.certificationAuthorityId,
        feasibilityFile: data.feasibilityFile[0],
        IDFile: data.idFile[0],
        documentaryProofFile: data.documentaryProofFile?.[0],
        certificateOfAttendanceFile: data.certificateOfAttendanceFile?.[0],
      });

      const textError = await response.text();
      if (textError) {
        if (response.status == 413) {
          errorToast(
            "Le fichier que vous tentez d'envoyer est trop volumineux. Veuillez soumettre un fichier d'une taille égale ou inférieure à 20 Mo.",
          );
        } else {
          errorToast(textError);
        }
      } else {
        successToast("Dossier de faisabilité envoyé");
        router.push("../");
      }
    } catch (error) {
      graphqlErrorToast(error);
    }
  });

  return (
    <div className="mt-12">
      <FeasibilityBanner feasibility={feasibility} />

      {hasCertificationRncpExpired &&
        feasibilityDecisionNotFinalOrIncomplete && (
          <Alert
            data-testid="certification-expired-alert"
            className="mt-6 mb-12"
            severity="error"
            title="Le diplôme visé a expiré"
            description={
              <>
                <p className="mb-4">
                  Le diplôme <em>{candidacy?.certification?.label}</em> a expiré
                  le{" "}
                  {format(candidacy.certification!.rncpExpiresAt, "dd/MM/yyyy")}
                  .
                </p>
                <p>
                  Il est impossible d’envoyer votre dossier de faisabilité au
                  certificateur. Vous devez attendre le renouvellement du
                  diplôme, changer de diplôme ou vous pouvez contacter le
                  certificateur en charge de votre candidature.
                </p>
              </>
            }
          />
        )}

      {candidacy.warningOnFeasibilitySubmission ===
        "MAX_SUBMISSIONS_UNIQUE_CERTIFICATION_REACHED" && (
        <Alert
          className="mt-6 mb-12"
          severity="error"
          title="Une demande de recevabilité existe déjà pour ce diplôme"
          description={`Vous avez déjà transmis une demande de recevabilité en cours pour ${candidacy?.certification?.label}, visée en totalité, en ${new Date().getFullYear()}. Si vous avez abandonné votre candidature, nous vous invitons à la reprendre ou à soumettre un nouveau dossier de faisabilité à partir de Janvier ${new Date().getFullYear() + 1}.`}
        />
      )}

      {candidacy.warningOnFeasibilitySubmission ===
        "MAX_SUBMISSIONS_CROSS_CERTIFICATION_REACHED" && (
        <Alert
          className="mt-6 mb-12"
          severity="error"
          title="Nombre maximum de demandes de recevabilité atteintes"
          description={`Vous avez déjà transmis 3 demandes de recevabilité sur des diplômes visés en totalité (l’ensemble des blocs) pour l’année ${new Date().getFullYear()}. Vous pourrez soumettre le dossier de faisabilité pour le diplôme ${candidacy?.certification?.label}, visé en totalité, à partir de Janvier ${new Date().getFullYear() + 1}.`}
        />
      )}

      <form
        onSubmit={handleFormSubmit}
        onReset={(e) => {
          e.preventDefault();
          reset();
        }}
        className="flex flex-col gap-6"
      >
        {certificationAuthorities.length > 1 && canUpload && (
          <>
            <Select
              data-testid="certification-authority-select"
              className="w-3/5 mb-0"
              label={
                <label className="block mt-[6px] mb-[10px]">
                  Sélectionnez la structure certificatrice :
                </label>
              }
              nativeSelectProps={{
                ...register("certificationAuthorityId"),
                required: true,
              }}
              disabled={
                candidacy?.warningOnFeasibilitySubmission !== "NONE" ||
                !certificationValidOrDFIncomplete
              }
            >
              <>
                <option disabled hidden value="">
                  Sélectionner
                </option>
                {certificationAuthorities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </>
            </Select>
          </>
        )}
        {CertificationContactCard}
        {certificationAuthorities.length === 0 && (
          <Alert
            severity="warning"
            title="Il n’y aucun certificateur rattaché à ce diplôme pour le moment"
            description="Pour en savoir plus, contactez le support à support@vae.gouv.fr."
            className="w-3/5"
          />
        )}
        <DownloadTile
          name="Trame du dossier de faisabilité"
          description="Pour compléter votre dossier, vous devez télécharger cette trame de dossier de faisabilité, le compléter, le signer et le joindre avec toutes les pièces justificatives nécessaires."
          url="/candidat/files/Dossier_faisabilité_candidat_autonome.pdf"
          mimeType="application/pdf"
          fileSizeInBytes={2407563}
          onUrlClick={handleFeasibilityFileTemplateDownload}
        />
        <hr className="pb-1" />
        {canUpload && (
          <>
            <UploadForm
              errors={errors}
              register={register}
              requirements={requirements}
              disabled={
                candidacy?.warningOnFeasibilitySubmission !== "NONE" ||
                !certificationValidOrDFIncomplete
              }
            />
            <FormButtons
              formState={{
                isDirty: isDirty,
                isSubmitting: isSubmitting,
                canSubmit:
                  certificationAuthorities.length > 0 &&
                  areRequirementsChecked &&
                  candidacy?.warningOnFeasibilitySubmission === "NONE" &&
                  certificationValidOrDFIncomplete,
              }}
              backUrl="../"
              submitButtonLabel="Envoyer"
            />
          </>
        )}

        {!canUpload && feasibility?.feasibilityUploadedPdf && (
          <>
            <div>
              {feasibility?.feasibilityUploadedPdf?.feasibilityFile
                .previewUrl && (
                <FancyPreview
                  defaultDisplay={false}
                  name="Dossier de faisabilité"
                  title={
                    feasibility?.feasibilityUploadedPdf?.feasibilityFile.name
                  }
                  src={
                    feasibility?.feasibilityUploadedPdf?.feasibilityFile
                      .previewUrl
                  }
                />
              )}
              {feasibility?.feasibilityUploadedPdf?.IDFile?.previewUrl && (
                <FancyPreview
                  defaultDisplay={false}
                  name="Pièce d'identité"
                  title={feasibility?.feasibilityUploadedPdf?.IDFile.name}
                  src={feasibility?.feasibilityUploadedPdf?.IDFile.previewUrl}
                />
              )}
              {feasibility?.feasibilityUploadedPdf?.documentaryProofFile
                ?.previewUrl && (
                <FancyPreview
                  defaultDisplay={false}
                  name="Justificatif équivalence"
                  title={
                    feasibility?.feasibilityUploadedPdf?.documentaryProofFile
                      .name
                  }
                  src={
                    feasibility?.feasibilityUploadedPdf?.documentaryProofFile
                      .previewUrl
                  }
                />
              )}
              {feasibility?.feasibilityUploadedPdf?.certificateOfAttendanceFile
                ?.previewUrl && (
                <FancyPreview
                  defaultDisplay={false}
                  name="Attestation ou certificat de formation"
                  title={
                    feasibility?.feasibilityUploadedPdf
                      ?.certificateOfAttendanceFile.name
                  }
                  src={
                    feasibility?.feasibilityUploadedPdf
                      ?.certificateOfAttendanceFile.previewUrl
                  }
                />
              )}
            </div>
            <BackButton label="Retour" />
          </>
        )}
      </form>
    </div>
  );
};
