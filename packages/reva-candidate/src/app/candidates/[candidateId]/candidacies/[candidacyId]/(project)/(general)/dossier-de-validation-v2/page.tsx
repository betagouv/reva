"use client";

import Accordion from "@codegouvfr/react-dsfr/Accordion";
import Alert from "@codegouvfr/react-dsfr/Alert";
import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import { format, toDate } from "date-fns";

import { GrayCard } from "@/components/card/gray-card/GrayCard";
import { Panel } from "@/components/layout/Panel";

import { JuryResult } from "@/graphql/generated/graphql";

import { DateAndSubmissionTiles } from "./_components/DateAndSubmissionTiles";
import { ReadOnlyDossierDeValidationScreen } from "./_components/read-only-dossier-de-validation-screen/ReadOnlyDossierDeValidationScreen";
import { ResourcesSection } from "./_components/ResourcesSection";
import { PreviousDossierAccordion } from "./depot-dv/_components/PreviousDossierAccordion";
import { useDossierDeValidationPage } from "./dossierDeValidation.hook";

const failedJuryResults: JuryResult[] = [
  "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION",
  "PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION",
  "PARTIAL_SUCCESS_PENDING_CONFIRMATION",
  "FAILURE",
  "CANDIDATE_EXCUSED",
  "CANDIDATE_ABSENT",
];

export default function DossierDeValidationPag() {
  const {
    readyForJuryEstimatedAt,
    certification,
    dossierDeValidation,
    queryStatus,
    jury,
    dossierDeValidationProblems,
  } = useDossierDeValidationPage();

  const [currentProblem, ...previousProblems] = dossierDeValidationProblems;

  const hasFailedJuryResult =
    jury?.result && failedJuryResults.includes(jury.result);

  const readOnlyView =
    dossierDeValidation &&
    dossierDeValidation.decision !== "INCOMPLETE" &&
    !hasFailedJuryResult;

  return (
    <Panel>
      <div className="flex flex-col">
        <Breadcrumb
          currentPageLabel="Dossier de validation"
          className="mb-0"
          segments={[
            {
              label: "Ma candidature",
              linkProps: {
                href: "../",
              },
            },
          ]}
        />
        <h1 className="mt-6 mb-4">Dossier de validation</h1>
        <p className="text-lg">
          Une fois le dossier déposé, le certificateur pourra procéder à
          l’organisation du passage devant le jury.
        </p>
        {queryStatus === "success" && (
          <>
            {readOnlyView ? (
              <ReadOnlyDossierDeValidationScreen
                amenagementSpecifique={
                  dossierDeValidation.amenagementSpecifique
                }
                dossierDeValidationSentAt={
                  dossierDeValidation.dossierDeValidationSentAt
                    ? toDate(dossierDeValidation.dossierDeValidationSentAt)
                    : undefined
                }
                dossierDeValidationFile={
                  dossierDeValidation.dossierDeValidationFile
                }
                dossierDeValidationOtherFiles={
                  dossierDeValidation.dossierDeValidationOtherFiles
                }
              />
            ) : (
              <>
                <div>
                  {hasFailedJuryResult && (
                    <>
                      <Alert
                        severity="info"
                        className="mb-6"
                        title={`Vous n’avez pas validé la totalité de votre VAE à la suite de votre passage devant le jury${jury?.dateOfSession ? ` le ${format(toDate(jury.dateOfSession), "dd/MM/yyyy")}` : ""}`}
                        description={
                          <div className="flex flex-col gap-4">
                            {jury?.informationOfResult && (
                              <p>
                                <strong>
                                  Motif énoncé par le certificateur :
                                </strong>{" "}
                                {jury.informationOfResult}
                              </p>
                            )}
                            <p>
                              Suite à ce résultat, vous pouvez repasser devant
                              le jury. Vous devrez, en amont, retravailler sur
                              le dossier de validation et le renvoyer afin de le
                              faire parvenir au certificateur. Une fois reçu, le
                              certificateur pourra vous transmettre une nouvelle
                              date de passage devant le jury. Vous pouvez dès à
                              présent fournir une date prévisionnelle de dépot
                              de dossier.
                            </p>
                            <p>
                              Ce passage n'est pas une obligation et reste à
                              votre libre choix. N'hésitez pas à vous rapprocher
                              de votre certificateur pour avoir plus de détails
                              et connaître les délais.
                            </p>
                          </div>
                        }
                      />
                      {dossierDeValidation?.dossierDeValidationSentAt && (
                        <PreviousDossierAccordion
                          dossierDeValidation={dossierDeValidation}
                          juryDateOfResult={jury?.dateOfResult}
                        />
                      )}
                    </>
                  )}

                  {dossierDeValidation?.decision === "INCOMPLETE" &&
                    currentProblem && (
                      <>
                        <Alert
                          data-testid="dossier-de-validation-signale-alert"
                          className="mb-6"
                          severity="warning"
                          title={`Dossier de validation signalé par le certificateur le ${format(currentProblem.decisionSentAt, "dd/MM/yyyy")}`}
                          description={
                            <div className="flex flex-col gap-6">
                              <p>
                                Ce dossier de validation a été signalé comme
                                comportant des erreurs par le certificateur.
                              </p>
                              <p>
                                <span className="font-semibold">
                                  Motif du signalement :{" "}
                                </span>
                                {currentProblem.decisionComment}
                              </p>
                              <p className="font-semibold">
                                Nous vous invitons à retourner dès que possible
                                un dossier corrigé.
                              </p>
                            </div>
                          }
                        />
                        {previousProblems.length > 0 && (
                          <div className="fr-accordions-group mb-6">
                            <Accordion label="Voir les anciens dossiers de validation">
                              <ul className="flex flex-col gap-8 pl-0">
                                {previousProblems.map((p, i) => (
                                  <GrayCard key={i}>
                                    <dl>
                                      <dt className="font-bold text-xl">
                                        Dossier signalé :
                                      </dt>
                                      <dd>
                                        Dossier signalé le{" "}
                                        {format(p.decisionSentAt, "dd/MM/yyyy")}
                                      </dd>
                                      <br />
                                      <dt className="font-bold text-xl">
                                        Motif du signalement :
                                      </dt>
                                      <dd>{p.decisionComment}</dd>
                                    </dl>
                                  </GrayCard>
                                ))}
                              </ul>
                            </Accordion>
                          </div>
                        )}
                      </>
                    )}
                </div>
                <div className="flex flex-row gap-4">
                  <div className="lg:basis-9/12">
                    <DateAndSubmissionTiles
                      readyForJuryEstimatedAt={
                        readyForJuryEstimatedAt
                          ? format(readyForJuryEstimatedAt, "dd/MM/yyyy")
                          : undefined
                      }
                    />
                  </div>
                  <div className="lg:basis-3/12">
                    <ResourcesSection certification={certification} />
                  </div>
                </div>
              </>
            )}
          </>
        )}
        <Button
          priority="secondary"
          linkProps={{ href: "../" }}
          className="mt-12"
        >
          Retour
        </Button>
      </div>
    </Panel>
  );
}
