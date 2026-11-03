"use client";

import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { CallOut } from "@codegouvfr/react-dsfr/CallOut";
import { Tabs } from "@codegouvfr/react-dsfr/Tabs";

import { BackButton } from "@/components/back-button/BackButton";
import { formatIso8601Date } from "@/utils/formatIso8601Date";

import { DossierDeValidationCard } from "./_components/DossierDeValidationCard";
import { HistoryDossierDeValidationView } from "./_components/HistoryDossierDeValidationView";
import { useDossierDeValidationPageLogic } from "./dossierDeValidationPageLogic";

const DossierDeValidationPage = () => {
  const candidaciesUrl = "/candidacies/annuaire";

  const { readyForJuryEstimatedAt, dossierDeValidation } =
    useDossierDeValidationPageLogic();

  let pageStatus: "SHOW_FULL_WARNING" | "SHOW_DV" = "SHOW_FULL_WARNING";

  if (readyForJuryEstimatedAt) {
    if (dossierDeValidation) {
      pageStatus = "SHOW_DV";
    }
  } else {
    pageStatus = "SHOW_FULL_WARNING";
  }

  return (
    <div className="flex flex-col w-full">
      <BackButton href={candidaciesUrl}>Tous les dossiers</BackButton>
      <h1 className="mb-8">Dossier de validation</h1>

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

      {pageStatus === "SHOW_DV" && (
        <Tabs
          tabs={[
            {
              label: "Date prévisionnelle",
              content: <ReadyForJuryEstimatedDateTab />,
            },
            {
              label: "Dossier",
              isDefault: true,
              content: <DossierDeValidationTab />,
            },
          ]}
        />
      )}
    </div>
  );
};

const ReadyForJuryEstimatedDateTab = () => {
  const { readyForJuryEstimatedAt, getDossierDeValidationStatus } =
    useDossierDeValidationPageLogic();

  const showContent = getDossierDeValidationStatus === "success";

  return (
    showContent && (
      <div className="flex flex-col gap-10 overflow-auto">
        {readyForJuryEstimatedAt ? (
          <>
            <h6 className="font-normal m-0">
              Pour faciliter l'organisation du jury, l’AAP a indiqué une date
              prévisionnelle de dépôt du dossier de validation. Cette date vous
              permet d’estimer la période à laquelle le candidat sera prêt pour
              un passage devant le jury.
            </h6>
            <div className="flex flex-col gap-2">
              <span className="uppercase font-bold text-sm">
                date prévisionnelle
              </span>
              <span className="text-base">
                {formatIso8601Date(readyForJuryEstimatedAt)}
              </span>
            </div>
          </>
        ) : (
          <Alert
            severity="info"
            title="Attente de la date prévisionnelle"
            description={
              <>
                <p className="mt-4">
                  Le candidat ou l’AAP (le cas échéant) renseignera
                  prochainement la date prévisionnelle qui correspond :
                </p>
                <br />
                <ul className="list-disc list-inside">
                  <li>
                    à la date à laquelle le candidat aura finalisé son dossier
                    de validation pour les certifications du Ministère du
                    Travail et des Branches Professionnelles
                  </li>
                  <li>
                    à la date de dépôt du dossier de validation pour les autres
                    certifications
                  </li>
                </ul>
                <p className="mt-4">
                  Une fois cette date communiquée, vous pourrez facilement
                  organiser le passage devant le jury.
                </p>
              </>
            }
          />
        )}
      </div>
    )
  );
};

const DossierDeValidationTab = () => {
  const {
    dossierDeValidation,
    historyDossierDeValidation,
    candidacy,
    getDossierDeValidationStatus,
    canSignalProblem,
  } = useDossierDeValidationPageLogic();

  const showContent = getDossierDeValidationStatus === "success";

  return (
    showContent && (
      <div className="flex flex-col gap-10 flex-1 mb-2 overflow-auto">
        {dossierDeValidation && (
          <h6 className="font-normal m-0">
            Retrouvez ici les documents liés au dossier de validation du
            candidat.
          </h6>
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

        {dossierDeValidation ? (
          <>
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
          </>
        ) : (
          <Alert
            severity="info"
            title="En attente du dossier de validation"
            description={
              <p>
                Le dossier de validation est en cours de rédaction. Une fois
                terminé, le candidat ou l’AAP vous le transmettra et vous
                pourrez programmer son passage devant le jury (dans un délai
                maximum de 3 mois à compter de la réception du dossier).
                <br />
                <br />
                Si vous n’exigez pas la transmission du dossier de validation,
                un courrier vous informant que le candidat sera prêt à se
                présenter devant le jury dans un délai de 3 mois vous sera
                transmis à la place.
              </p>
            }
          />
        )}
      </div>
    )
  );
};

export default DossierDeValidationPage;
