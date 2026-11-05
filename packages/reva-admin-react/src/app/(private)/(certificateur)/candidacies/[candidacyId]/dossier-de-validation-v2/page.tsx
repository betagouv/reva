"use client";

import { Button } from "@codegouvfr/react-dsfr/Button";
import { CallOut } from "@codegouvfr/react-dsfr/CallOut";

import { formatIso8601Date } from "@/utils/formatIso8601Date";

import { DossierDeValidationCard } from "./_components/DossierDeValidationCard";
import { HistoryDossierDeValidationView } from "./_components/HistoryDossierDeValidationView";
import { useDossierDeValidationPageLogic } from "./dossierDeValidationPageLogic";

const DossierDeValidationPage = () => {
  const {
    readyForJuryEstimatedAt,
    dossierDeValidation,
    historyDossierDeValidation,
    candidacy,
    getDossierDeValidationStatus,
    canSignalProblem,
  } = useDossierDeValidationPageLogic();

  let pageStatus:
    | "SHOW_FULL_WARNING"
    | "SHOW_DV_WARNING_AND_READY_FOR_JURY_ESTIMATED_DATE"
    | "SHOW_DV" = "SHOW_FULL_WARNING";

  if (readyForJuryEstimatedAt) {
    if (dossierDeValidation) {
      pageStatus = "SHOW_DV";
    } else {
      pageStatus = "SHOW_DV_WARNING_AND_READY_FOR_JURY_ESTIMATED_DATE";
    }
  } else {
    pageStatus = "SHOW_FULL_WARNING";
  }

  return (
    <div className="flex flex-col w-full">
      <h1 className="mb-10">Dossier de validation</h1>

      {pageStatus === "SHOW_FULL_WARNING" && (
        <CallOut
          title="Dossier de validation en attente"
          colorVariant="blue-ecume"
        >
          Dès lors que la recevabilité est prononcée favorablement, une date
          prévisionnelle de dépôt du dossier de validation peut être renseignée.
          Cette date peut vous aider à anticiper l’organisation du passage
          devant le jury. Elle reste toutefois facultative et n’a pas de
          caractère engageant.
        </CallOut>
      )}

      {pageStatus === "SHOW_DV_WARNING_AND_READY_FOR_JURY_ESTIMATED_DATE" && (
        <>
          <hr className="pb-2" />
          <div className="flex flex-col md:flex-row justify-between mx-4">
            <span>Date prévisionnelle de dépôt du dossier de validation :</span>
            <span>
              {readyForJuryEstimatedAt && (
                <strong>{formatIso8601Date(readyForJuryEstimatedAt)}</strong>
              )}
            </span>
          </div>
          <hr className="mt-2 pb-3" />
          <p className="mb-12">
            Cette date est une estimation et permet d'anticiper l'organisation
            du passage devant le jury.
          </p>
          <CallOut
            title="Dossier de validation en attente"
            colorVariant="blue-ecume"
          >
            Une fois le dossier transmis par le candidat, vous devrez lui
            communiquer une date de passage devant le jury. Si vous n’exigez pas
            de recevoir ce document, vous recevrez une attestation de
            finalisation du dossier de validation lorsque le candidat sera prêt
            pour un passage devant le jury.
          </CallOut>
        </>
      )}

      {pageStatus === "SHOW_DV" &&
        getDossierDeValidationStatus === "success" &&
        dossierDeValidation && (
          <div className="flex flex-col gap-10 flex-1 mb-2 overflow-auto">
            <DossierDeValidationCard
              dossierDeValidation={{
                id: dossierDeValidation.id,
                sentAt: dossierDeValidation.dossierDeValidationSentAt,
                file: dossierDeValidation.dossierDeValidationFile,
                otherFiles: dossierDeValidation.dossierDeValidationOtherFiles,
                decision: dossierDeValidation.decision,
                decisionSentAt: dossierDeValidation.decisionSentAt,
                decisionComment: dossierDeValidation.decisionComment,
              }}
            />

            {canSignalProblem && (
              <Button
                priority="secondary"
                className="mt-10 ml-auto"
                linkProps={{
                  href: `/candidacies/${candidacy?.id}/dossier-de-validation-v2/problem`,
                }}
              >
                Demander une correction
              </Button>
            )}

            <HistoryDossierDeValidationView
              historyDossierDeValidation={historyDossierDeValidation.map(
                (dossierDeValidation) => ({
                  id: dossierDeValidation.id,
                  sentAt: dossierDeValidation.dossierDeValidationSentAt,
                  file: dossierDeValidation.dossierDeValidationFile,
                  otherFiles: dossierDeValidation.dossierDeValidationOtherFiles,
                  decision: dossierDeValidation.decision,
                  decisionSentAt: dossierDeValidation.decisionSentAt,
                  decisionComment: dossierDeValidation.decisionComment,
                }),
              )}
            />
          </div>
        )}
      <Button
        priority="secondary"
        className="mt-6"
        linkProps={{
          href: `/candidacies/annuaire`,
        }}
      >
        Retour
      </Button>
    </div>
  );
};

export default DossierDeValidationPage;
