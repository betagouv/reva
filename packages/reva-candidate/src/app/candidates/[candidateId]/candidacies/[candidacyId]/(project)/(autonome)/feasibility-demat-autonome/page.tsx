"use client";

import Alert from "@codegouvfr/react-dsfr/Alert";
import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { format, isBefore, toDate } from "date-fns";
import { deburr } from "lodash";
import { useRouter } from "next/navigation";

import { ExperiencesTile } from "@/app/_components/home/dashboard/tiles/ExperiencesTile";
import { FormationsTile } from "@/app/_components/home/dashboard/tiles/FormationsTile";
import { GoalsTile } from "@/app/_components/home/dashboard/tiles/GoalsTile";
import { Panel } from "@/components/layout/Panel";
import { PdfLink } from "@/components/legacy/organisms/DffSummary/components/PdfLink";
import { DffSummary } from "@/components/legacy/organisms/DffSummary/DffSummary";

import {
  Certification,
  CertificationCompetenceDetails,
  DematerializedFeasibilityFile,
  DffAttachment,
  DffCertificationCompetenceBloc,
  Prerequisite,
  Candidacy,
} from "@/graphql/generated/graphql";

import { AttachmentsSection } from "./_components/AttachmentsSection";
import { CertificationSection } from "./_components/CertificationSection";
import { CompetenciesBlocksSection } from "./_components/CompetenciesBlocksSection";
import { DecisionIncompleteAlert } from "./_components/DecisionIncompleteAlert";
import { EligibilitySection } from "./_components/EligibilitySection";
import { useFeasibilityDematAutonomePage } from "./_components/feasibility-demat-autonome.hook";
import { PrerequisitesSection } from "./_components/PrerequisitesSection";
import { SendFileCertificationAuthoritySection } from "./_components/SendFileCertificateurSection";
import { SwornStatementSection } from "./_components/SwornStatementSection";

const modalWhatIsTheFeasibilityFile = createModal({
  id: "what-is-the-feasibility-file",
  isOpenedByDefault: false,
});

const modalWhatToPayAttentionTo = createModal({
  id: "what-to-pay-attention-to",
  isOpenedByDefault: false,
});

const modalMissingData = createModal({
  id: "missing-data",
  isOpenedByDefault: false,
});

export default function FeasibilityDematAutonomeResourcesPage() {
  const router = useRouter();
  const { candidacy } = useFeasibilityDematAutonomePage();

  if (!candidacy) {
    return null;
  }

  const candidate = candidacy.candidate;
  const certification = candidacy.certification;

  const hasCompletedFormations =
    !!candidacy.candidate.highestDegree &&
    !!candidacy.candidate.niveauDeFormationLePlusEleve;
  const hasCompletedGoals =
    (candidacy?.goals && candidacy.goals.length > 0) || false;
  const hasCompletedExperience =
    (candidacy?.experiences && candidacy.experiences.length > 0) || false;

  const feasibility = candidacy.feasibility;
  const dematerializedFeasibilityFile =
    feasibility?.dematerializedFeasibilityFile;

  const feasibilityFileSentAt = feasibility?.feasibilityFileSentAt;
  const decision = feasibility?.decision;
  const decisionSentAt = feasibility?.decisionSentAt;
  const decisionComment = feasibility?.decisionComment;
  const history = feasibility?.history;
  const feasibilityDecisionIsIncomplete = decision === "INCOMPLETE";
  const hasCertificationRncpExpired =
    !!certification?.rncpExpiresAt &&
    isBefore(certification?.rncpExpiresAt, new Date());
  const isFeasibilityEditable =
    (!feasibilityFileSentAt && !hasCertificationRncpExpired) ||
    feasibilityDecisionIsIncomplete;

  const displayDecisionIncompleteAlert =
    feasibilityDecisionIsIncomplete && decisionSentAt;

  const isEligibilityRequirementPartial =
    dematerializedFeasibilityFile?.eligibilityRequirement ===
    "PARTIAL_ELIGIBILITY_REQUIREMENT";

  // ne pas afficher l'alerte d'expiration de la certification si la décision du dossier de faisabilité est incomplète
  const showCertificationExpiredAlert =
    hasCertificationRncpExpired &&
    !feasibilityDecisionIsIncomplete &&
    !feasibilityFileSentAt;

  const certificationAuthorityStructureHasReducedRequirements =
    !!certification?.certificationAuthorityStructure?.hasReducedRequirements;

  const isFeasibilityReceivedOrRejectedOrPendingOrComplete =
    decision === "ADMISSIBLE" ||
    decision === "REJECTED" ||
    decision === "PENDING" ||
    decision === "COMPLETE";

  if (isFeasibilityReceivedOrRejectedOrPendingOrComplete) {
    const candidate = candidacy.candidate;
    const candidateName = deburr(
      `${candidate?.givenName ? candidate?.givenName : candidate?.lastname}_${candidate?.firstname}`,
    ).toLowerCase();

    return (
      <Panel>
        <div className="flex flex-col">
          <Breadcrumb
            currentPageLabel="Dossier de faisabilité"
            className="mb-2"
            segments={[
              {
                label: "Ma candidature",
                linkProps: {
                  href: "../",
                },
              },
            ]}
          />
          <div className="flex justify-between">
            <h1 className="mb-0">Dossier de faisabilité</h1>

            {dematerializedFeasibilityFile?.dffFile ? (
              <PdfLink
                url={dematerializedFeasibilityFile.dffFile.url}
                fileName={`dossier_de_faisabilite_${candidateName}.pdf`}
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-8">
            <DffSummary candidacy={candidacy as Candidacy} />

            <div className="flex justify-between">
              <Button priority="secondary" onClick={() => router.push("../")}>
                Retour
              </Button>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="flex flex-col w-full">
        <Breadcrumb
          currentPageLabel="Dossier de faisabilité"
          className="mb-2"
          segments={[
            {
              label: "Ma candidature",
              linkProps: {
                href: "../",
              },
            },
          ]}
        />
        <h1 className="mb-6">Dossier de faisabilité</h1>
        <p className="text-xl mb-12">
          Complétez toutes les sections du dossier de faisabilité avant de
          l'envoyer au certificateur.
        </p>

        {showCertificationExpiredAlert && (
          <Alert
            data-testid="certification-expired-alert"
            className="mt-6 mb-12"
            severity="error"
            title="La certification visée a expiré"
            description={
              <>
                <p className="mb-4">
                  La certification <em>{certification?.label}</em> a expiré le{" "}
                  {format(certification?.rncpExpiresAt, "dd/MM/yyyy")}.
                </p>
                <p>
                  Il est impossible d’envoyer le dossier de faisabilité du
                  candidat au certificateur. Vous devez attendre le
                  renouvellement de la certification, changer de certification
                  ou vous pouvez contacter le certificateur en charge de la
                  candidature.
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
            description={`${candidacy.candidate.lastname} ${candidacy.candidate.firstname} a déjà transmis une demande de recevabilité pour la certification ${certification?.label}, visée en totalité, en ${new Date().getFullYear()}. Vous pouvez reprendre la candidature existante si elle a été abandonnée, ou soumettre une nouvelle demande à partir de Janvier ${new Date().getFullYear() + 1}.`}
          />
        )}

        {candidacy.warningOnFeasibilitySubmission ===
          "MAX_SUBMISSIONS_CROSS_CERTIFICATION_REACHED" && (
          <Alert
            className="mt-6 mb-12"
            severity="error"
            title="Nombre maximum de demandes de recevabilité atteintes"
            description={`${candidacy.candidate.lastname} ${candidacy.candidate.firstname} a déjà transmis 3 demandes de recevabilité sur des certifications visées en totalité pour l’année ${new Date().getFullYear()}. Vous pourrez soumettre le dossier de faisabilité pour la certification ${certification?.label}, visée en totalité, à partir de Janvier ${new Date().getFullYear() + 1}.`}
          />
        )}

        {candidacy.warningOnFeasibilitySubmission ===
          "PREVIOUS_FEASIBILITY_ON_CERTIFICATION_REJECTED" && (
          <Alert
            className="mt-6 mb-12"
            severity="error"
            title="Une demande de recevabilité a été rejetée pour ce diplôme"
            description={`${candidacy.candidate.lastname} ${candidacy.candidate.firstname} a déjà transmis une demande de recevabilité pour la certification ${certification?.label} en ${new Date().getFullYear()}. Cette demande a été rejetée. Vous pouvez soumettre une nouvelle demande de recevabilité partielle dès à présent, ou une demande de recevabilité totale à partir de Janvier ${new Date().getFullYear() + 1}.`}
          />
        )}

        {displayDecisionIncompleteAlert && (
          <DecisionIncompleteAlert
            decisionSentAt={decisionSentAt}
            decisionComment={decisionComment || ""}
            history={history || []}
          />
        )}

        <div className="grid grid-cols-4">
          <div className="col-span-3 flex flex-col gap-8">
            <EligibilitySection
              eligibilityRequirement={
                dematerializedFeasibilityFile?.eligibilityRequirement
              }
              eligibilityValidUntil={
                dematerializedFeasibilityFile?.eligibilityValidUntil
                  ? toDate(dematerializedFeasibilityFile?.eligibilityValidUntil)
                  : null
              }
              isFeasibilityEditable={isFeasibilityEditable}
            />

            <CertificationSection
              isCertificationPartial={!!candidacy.isCertificationPartial}
              dematerializedFeasibilityFile={
                dematerializedFeasibilityFile as DematerializedFeasibilityFile
              }
              certification={certification as Certification}
              isFeasibilityEditable={isFeasibilityEditable}
            />

            <CompetenciesBlocksSection
              blocsDeCompetences={
                dematerializedFeasibilityFile?.blocsDeCompetences as DffCertificationCompetenceBloc[]
              }
              certificationCompetenceDetails={
                dematerializedFeasibilityFile?.certificationCompetenceDetails as CertificationCompetenceDetails[]
              }
              competenceBlocsPartCompletion={
                dematerializedFeasibilityFile?.competenceBlocsPartCompletion
              }
              disabled={
                !dematerializedFeasibilityFile?.certificationPartComplete ||
                isEligibilityRequirementPartial
              }
              hideCompleteBadge={isEligibilityRequirementPartial}
              disabledNoticeText={
                isEligibilityRequirementPartial
                  ? "Vous n'avez pas besoin de compléter cette catégorie car une recevabilité favorable est en cours."
                  : "Vous devez d'abord détailler la certification visée avant d'intégrer les blocs de compétences."
              }
              isEditable={isFeasibilityEditable}
              isEligibilityRequirementPartial={isEligibilityRequirementPartial}
              showComplementExperienceParcoursVise={
                certificationAuthorityStructureHasReducedRequirements
              }
              complementExperienceParcoursVise={
                dematerializedFeasibilityFile?.complementExperienceParcoursVise as string
              }
            />

            <PrerequisitesSection
              prerequisites={
                dematerializedFeasibilityFile?.prerequisites as Prerequisite[]
              }
              prerequisitesPartComplete={
                dematerializedFeasibilityFile?.prerequisitesPartComplete
              }
              disabled={
                !dematerializedFeasibilityFile?.certificationPartComplete
              }
              isEditable={isFeasibilityEditable}
            />

            <AttachmentsSection
              attachmentsPartComplete={
                dematerializedFeasibilityFile?.attachmentsPartComplete
              }
              isEditable={isFeasibilityEditable}
              attachments={
                dematerializedFeasibilityFile?.attachments as DffAttachment[]
              }
            />

            <SwornStatementSection
              isCompleted={!!dematerializedFeasibilityFile?.swornStatementFile}
              isEditable={isFeasibilityEditable}
            />

            <SendFileCertificationAuthoritySection
              sentToCertificationAuthorityAt={
                feasibilityFileSentAt ? toDate(feasibilityFileSentAt) : null
              }
              isReadyToBeSentToCertificationAuthority={
                !!dematerializedFeasibilityFile?.isReadyToBeSentToCertificationAuthority
              }
              disabled={candidacy.warningOnFeasibilitySubmission !== "NONE"}
              isIncomplete={feasibilityDecisionIsIncomplete}
              buttonProps={
                !hasCompletedFormations ||
                !hasCompletedGoals ||
                !hasCompletedExperience
                  ? {
                      onClick: modalMissingData.open,
                    }
                  : undefined
              }
            />
          </div>

          <div className="col-span-1 ml-6">
            <div className="flex flex-col px-4 pb-2 pt-6 bg-dsfr-light-decisions-background-background-alt-blue-france">
              <h6>Ressources :</h6>

              <div>
                <p className="font-medium mb-2">Besoin d'aide ?</p>
                <p>
                  Ces ressources vous guideront pour remplir au mieux le dossier
                  de faisabilité
                </p>

                <Button
                  type="button"
                  className="underline text-sm shadow-none m-0 p-0 mb-6 line-height-normal text-left font-normal underline-offset-4 hover:decoration-2 min-h-0"
                  priority="secondary"
                  onClick={modalWhatIsTheFeasibilityFile.open}
                >
                  En quoi consiste le dossier de faisabilité ?
                </Button>

                <Button
                  type="button"
                  className="underline text-sm shadow-none m-0 p-0 mb-6 line-height-normal text-left font-normal underline-offset-4 hover:decoration-2 min-h-0"
                  priority="secondary"
                  onClick={modalWhatToPayAttentionTo.open}
                >
                  À quoi faire attention ?
                </Button>

                <p>
                  <a
                    className="fr-link text-sm"
                    href={`https://vae.gouv.fr/savoir-plus/articles/comment-completer-votre-dossier-de-faisabilite/`}
                    target="_blank"
                  >
                    Comment compléter votre dossier de faisabilité ?
                  </a>
                </p>

                <p>
                  Informations liées à la certification :<br />
                  <a
                    className="fr-link text-sm"
                    href={`${window.location.origin}/candidat/candidates/${candidate?.id}/candidacies/${candidacy?.id}/certification/${certification?.id}`}
                    target="_blank"
                  >
                    Fiche de la certification
                  </a>
                </p>

                <hr />
                <p>
                  <a
                    className="fr-link text-sm"
                    href="https://scribehow.com/viewer/Tutoriel__Candidat_sans_accompagnement_autonome__0NQyq175SDaI0Epy7bdyLA?referrer=documents&mode=edit"
                    target="_blank"
                  >
                    Consultez le guide pas à pas
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <modalWhatIsTheFeasibilityFile.Component
        title={
          <div>
            <span className="fr-icon-info-fill mr-2" aria-hidden="true"></span>
            En quoi consiste le dossier de faisabilité ?
          </div>
        }
        size="large"
      >
        <p>
          Votre parcours de VAE comprend trois étapes importantes avec le
          certificateur :
        </p>

        <ol>
          <li>le dossier de faisabilité</li>
          <li>le dossier de validation</li>
          <li>le passage devant le jury</li>
        </ol>

        <p>Vous êtes ici à la première étape : le dossier de faisabilité. </p>

        <p>
          Le dossier de faisabilité permet de mettre en parallèle les
          expériences réalisées et les blocs de compétences visés pour
          l’obtention de la certification. Vous allez notamment devoir décrire
          précisément les activités que vous avez réalisées.
        </p>

        <p>
          Votre parcours de VAE comprend trois étapes importantes avec le
          certificateur : le dossier de faisabilité le dossier de validation le
          passage devant le jury Vous êtes ici à la première étape : le dossier
          de faisabilité. Le dossier de faisabilité permet de mettre en
          parallèle les expériences réalisées et les blocs de compétences visés
          pour l’obtention de la certification. Vous allez notamment devoir
          décrire précisément les activités que vous avez réalisées. Le
          certificateur étudiera votre dossier et vérifiera que votre projet est
          réaliste au regard de la qualité et de la diversité de vos
          expériences. Si c’est le cas, vous recevrez un avis "recevable" : cela
          signifie que vous pourrez commencer votre parcours.
        </p>
      </modalWhatIsTheFeasibilityFile.Component>

      <modalWhatToPayAttentionTo.Component
        title={
          <div>
            <span className="fr-icon-info-fill mr-2" aria-hidden="true"></span>À
            quoi faire attention ?
          </div>
        }
        size="large"
      >
        <p>
          Il est important d’écrire des réponses précises et de faire attention
          à l’orthographe et à la grammaire.
        </p>

        <p>
          Toutes les étapes à compléter sont sur votre espace France VAE : vous
          devez répondre aux questions directement ici, sur la plateforme. Vous
          pouvez le faire en plusieurs fois. Prenez le temps de bien formuler
          vos réponses et utilisez les ressources disponibles pour vous aider.
        </p>
      </modalWhatToPayAttentionTo.Component>

      <modalMissingData.Component
        title={
          <div>
            <span
              className="fr-icon-warning-fill mr-2"
              aria-hidden="true"
            ></span>
            Dossier incomplet
          </div>
        }
        size="large"
      >
        <p>
          Vous devez avoir renseigné toutes les sections précédent le dossier de
          faisabilité afin de pouvoir envoyer le dossier au certificateur.
        </p>

        <p>Vous avez oublié de compléter la (les) section(s) suivante(s) :</p>

        <div className="grid md:grid-cols-3 grid-rows-1">
          {!hasCompletedGoals && (
            <GoalsTile
              href="../set-goals"
              hasCompletedGoals={hasCompletedGoals}
              readOnly
            />
          )}
          {!hasCompletedFormations && (
            <FormationsTile
              href="../set-formations"
              hasCompletedFormations={hasCompletedFormations}
              readOnly
            />
          )}
          {!hasCompletedExperience && (
            <ExperiencesTile
              href="../experiences"
              experiences={candidacy.experiences}
              readOnly
            />
          )}
        </div>
      </modalMissingData.Component>
    </Panel>
  );
}
