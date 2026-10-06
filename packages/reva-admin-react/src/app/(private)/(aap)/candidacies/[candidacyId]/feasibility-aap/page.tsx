"use client";

import Alert from "@codegouvfr/react-dsfr/Alert";
import { format, isBefore, toDate } from "date-fns";

import { useAapFeasibilityPageLogic } from "@/app/(private)/(aap)/candidacies/[candidacyId]/feasibility-aap/aapFeasibilityPageLogic";
import { DecisionSentComponent } from "@/components/alert-decision-sent-feasibility/DecisionSentComponent";
import { DffSummary } from "@/components/dff-summary/DffSummary";
import { FeasibilityDecisionHistory } from "@/components/feasibility-decision-history/FeasibilityDecisionHistory";

import {
  Candidacy,
  Certification,
  CertificationCompetenceDetails,
  DematerializedFeasibilityFile,
  DfFileAapDecision,
  DffAttachment,
  DffCertificationCompetenceBloc,
  FeasibilityDecision,
  Prerequisite,
} from "@/graphql/generated/graphql";

import { AttachmentsSection } from "./_components/AttachmentsSection";
import { CandidateDecisionCommentSection } from "./_components/CandidateDecisionCommentSection";
import { CertificationSection } from "./_components/CertificationSection";
import { CompetenciesBlocksSection } from "./_components/CompetenciesBlocksSection";
import { DecisionIncompleteAlert } from "./_components/DecisionIncompleteAlert";
import { DecisionSection } from "./_components/DecisionSection";
import { EligibilitySection } from "./_components/EligibilitySection";
import { PrerequisitesSection } from "./_components/PrerequisitesSection";
import { SendFileCandidateSection } from "./_components/SendFileCandidateSection";
import { SendFileCertificationAuthoritySection } from "./_components/SendFileCertificateurSection";
import { SwornStatementSection } from "./_components/SwornStatementSection";

const FeasibilityBanner = ({
  decisionSentAt,
  decision,
  decisionComment,
}: {
  decisionSentAt: number | null | undefined;
  decision: FeasibilityDecision;
  decisionComment?: string | null;
}) => (
  <DecisionSentComponent
    decisionSentAt={decisionSentAt ? toDate(decisionSentAt) : null}
    decision={decision}
    decisionComment={decisionComment}
  />
);

const AapFeasibilityPage = () => {
  const {
    certification,
    dematerializedFeasibilityFile,
    queryStatus,
    feasibility,
    candidacy,
  } = useAapFeasibilityPageLogic();

  const feasibilityFileSentAt = feasibility?.feasibilityFileSentAt;
  const decision = feasibility?.decision;
  const decisionSentAt = feasibility?.decisionSentAt;
  const decisionComment = feasibility?.decisionComment;
  const history = feasibility?.history;
  const feasibilityDecisionIsIncomplete = decision === "INCOMPLETE";
  const decisionSentAtDate = decisionSentAt ? toDate(decisionSentAt) : null;
  const hasCertificationRncpExpired =
    !!certification?.rncpExpiresAt &&
    isBefore(certification?.rncpExpiresAt, new Date());
  const isFeasibilityEditable =
    (!feasibilityFileSentAt && !hasCertificationRncpExpired) ||
    feasibilityDecisionIsIncomplete;
  const isFeasibilityReceivedOrRejected =
    decision === "ADMISSIBLE" || decision === "REJECTED";
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

  const canSendFeasibilityFileToCandidate =
    !!dematerializedFeasibilityFile?.isReadyToBeSentToCandidate &&
    (!hasCertificationRncpExpired || feasibilityDecisionIsIncomplete);

  const certificationAuthorityStructureHasReducedRequirements =
    !!certification?.certificationAuthorityStructure?.hasReducedRequirements;

  if (!candidacy || !feasibility) {
    return null;
  }

  if (isFeasibilityReceivedOrRejected) {
    return (
      <DffSummary
        dematerializedFeasibilityFile={
          dematerializedFeasibilityFile as DematerializedFeasibilityFile
        }
        candidacy={candidacy as Candidacy}
        FeasibilityBanner={
          <>
            <FeasibilityBanner
              decisionSentAt={decisionSentAt}
              decision={decision as FeasibilityDecision}
              decisionComment={decisionComment}
            />
            <FeasibilityDecisionHistory
              className="mb-6"
              history={history?.slice(1)}
            />
          </>
        }
      />
    );
  }

  return (
    <div className="flex flex-col">
      <h1>Dossier de faisabilité</h1>
      <p>
        Remplissez toutes les catégories afin de pouvoir envoyer le dossier au
        certificateur.
      </p>

      {showCertificationExpiredAlert && (
        <Alert
          data-testid="certification-expired-alert"
          className="my-6"
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
                candidat au certificateur. Vous devez attendre le renouvellement
                de la certification, changer de certification ou vous pouvez
                contacter le certificateur en charge de la candidature.
              </p>
            </>
          }
        />
      )}

      {candidacy.warningOnFeasibilitySubmission ===
        "MAX_SUBMISSIONS_UNIQUE_CERTIFICATION_REACHED" && (
        <Alert
          className="my-6"
          severity="error"
          title="Une demande de recevabilité existe déjà pour ce diplôme"
          description={`${candidacy.candidate.lastname} ${candidacy.candidate.firstname} a déjà transmis une demande de recevabilité pour la certification ${certification?.label}, visée en totalité, en ${new Date().getFullYear()}. Vous pouvez reprendre la candidature existante si elle a été abandonnée, ou soumettre une nouvelle demande à partir de Janvier ${new Date().getFullYear() + 1}.`}
        />
      )}

      {candidacy.warningOnFeasibilitySubmission ===
        "MAX_SUBMISSIONS_CROSS_CERTIFICATION_REACHED" && (
        <Alert
          className="my-6"
          severity="error"
          title="Nombre maximum de demandes de recevabilité atteintes"
          description={`${candidacy.candidate.lastname} ${candidacy.candidate.firstname} a déjà transmis 3 demandes de recevabilité sur des certifications visées en totalité pour l’année ${new Date().getFullYear()}. Vous pourrez soumettre le dossier de faisabilité pour la certification ${certification?.label}, visée en totalité, à partir de Janvier ${new Date().getFullYear() + 1}.`}
        />
      )}

      {candidacy.warningOnFeasibilitySubmission ===
        "PREVIOUS_FEASIBILITY_ON_CERTIFICATION_REJECTED" && (
        <Alert
          className="my-6"
          severity="error"
          title="Une demande de recevabilité a été rejetée pour ce diplôme"
          description={`${candidacy.candidate.lastname} ${candidacy.candidate.firstname} a déjà transmis une demande de recevabilité pour la certification ${certification?.label} en ${new Date().getFullYear()}. Cette demande a été rejetée. Vous pouvez soumettre une nouvelle demande de recevabilité partielle dès à présent, ou une demande de recevabilité totale à partir de Janvier ${new Date().getFullYear() + 1}.`}
        />
      )}

      {displayDecisionIncompleteAlert && (
        <DecisionIncompleteAlert
          decisionSentAt={decisionSentAt}
          decisionComment={decisionComment || ""}
        />
      )}

      <FeasibilityDecisionHistory
        className="mb-6"
        history={history?.slice(1)}
      />

      {queryStatus === "success" && (
        <ul className="p-0 flex flex-col gap-8">
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
            disabled={!dematerializedFeasibilityFile?.certificationPartComplete}
            isEditable={isFeasibilityEditable}
          />
          {candidacy.typeAccompagnement === "ACCOMPAGNE" && (
            <DecisionSection
              aapDecision={
                dematerializedFeasibilityFile?.aapDecision as DfFileAapDecision | null
              }
              aapDecisionComment={
                dematerializedFeasibilityFile?.aapDecisionComment as
                  | string
                  | null
              }
              isEditable={isFeasibilityEditable}
              disabled={isEligibilityRequirementPartial}
            />
          )}
          <AttachmentsSection
            attachmentsPartComplete={
              dematerializedFeasibilityFile?.attachmentsPartComplete
            }
            isEditable={isFeasibilityEditable}
            attachments={
              dematerializedFeasibilityFile?.attachments as DffAttachment[]
            }
          />

          <hr className="pb-0.5" />

          {candidacy.typeAccompagnement === "ACCOMPAGNE" && (
            <>
              <SendFileCandidateSection
                sentToCandidateAt={
                  dematerializedFeasibilityFile?.sentToCandidateAt
                    ? toDate(dematerializedFeasibilityFile.sentToCandidateAt)
                    : null
                }
                isReadyToBeSentToCandidate={canSendFeasibilityFileToCandidate}
                isIncomplete={feasibilityDecisionIsIncomplete}
                decisionSentAt={decisionSentAtDate}
              />

              {dematerializedFeasibilityFile?.candidateDecisionComment && (
                <CandidateDecisionCommentSection
                  candidateDecisionComment={
                    dematerializedFeasibilityFile.candidateDecisionComment as string
                  }
                />
              )}
            </>
          )}

          <SwornStatementSection
            sentToCandidateAt={
              dematerializedFeasibilityFile?.sentToCandidateAt
                ? toDate(dematerializedFeasibilityFile.sentToCandidateAt)
                : null
            }
            isCompleted={!!dematerializedFeasibilityFile?.swornStatementFile}
            isEditable={isFeasibilityEditable}
          />

          <hr className="pb-0.5" />

          <SendFileCertificationAuthoritySection
            sentToCertificationAuthorityAt={
              feasibilityFileSentAt ? toDate(feasibilityFileSentAt) : null
            }
            isReadyToBeSentToCertificationAuthority={
              !!dematerializedFeasibilityFile?.isReadyToBeSentToCertificationAuthority
            }
            disabled={candidacy.warningOnFeasibilitySubmission !== "NONE"}
            isIncomplete={feasibilityDecisionIsIncomplete}
          />
        </ul>
      )}
    </div>
  );
};

export default AapFeasibilityPage;
