import Badge from "@codegouvfr/react-dsfr/Badge";
import { format } from "date-fns";
import Image from "next/image";
import { redirect } from "next/navigation";

import { UseValidateFeasibilityCandidacy } from "@/app/candidates/[candidateId]/candidacies/[candidacyId]/(project)/(accompagne)/validate-feasibility/validate-feasibility.hooks";
import { CertificationCard } from "@/components/certification-card/CertificationCard";
import { PICTOGRAMS } from "@/components/pictograms/Pictograms";

import {
  Candidate,
  DffAttachment,
  DffEligibilityCandidateSituation,
  DffEligibilityRequirement,
  Prerequisite,
} from "@/graphql/generated/graphql";

import AttachmentsSection from "./components/AttachmentsSection";
import { BannerSummary } from "./components/BannerSummary";
import CandidateDecisionCommentSection from "./components/CandidateDecisionCommentSection";
import CandidateSection from "./components/CandidateSection";
import CertificationSection from "./components/CertificationSection";
import { ContactInfosSection } from "./components/ContactInfosSection";
import DecisionSection from "./components/DecisionSection";
import ExperiencesSection from "./components/ExperiencesSection";
import GoalsSection from "./components/GoalsSection";
import ParcoursSection from "./components/ParcoursSection";

type DffSummaryProps = {
  candidacy: UseValidateFeasibilityCandidacy;
  candidateDecisionComment: string;
  setCandidateDecisionComment: (comment: string) => void;
};

const eligibilityCandidateSituationMap = {
  PREMIERE_DEMANDE_RECEVABILITE: "Première demande de recevabilité",
  DETENTEUR_RECEVABILITE: "Détenteur d'une recevabilité",
  DETENTEUR_RECEVABILITE_AVEC_CHGT_CODE_RNCP_ET_REV_REFERENTIEL:
    "Détenteur d'une recevabilité avec changement de code RNCP et révision du référentiel",
  DETENTEUR_RECEVABILITE_AVEC_REV_SANS_CHGT_REFERENTIEL:
    "Détenteur d'une recevabilité avec révision sans changement de référentiel",
};

const EligibiltyBadge = ({
  eligibilityRequirement,
  eligibilityCandidateSituation,
}: {
  eligibilityRequirement?: DffEligibilityRequirement | null;
  eligibilityCandidateSituation?: DffEligibilityCandidateSituation | null;
}) => {
  if (
    eligibilityCandidateSituation &&
    eligibilityCandidateSituationMap[eligibilityCandidateSituation]
  ) {
    return (
      <Badge severity="info">
        {eligibilityCandidateSituationMap[eligibilityCandidateSituation]}
      </Badge>
    );
  }
  if (eligibilityRequirement === "FULL_ELIGIBILITY_REQUIREMENT") {
    return (
      <Badge severity="info">Accès au dossier de faisabilité intégral</Badge>
    );
  }
  if (eligibilityRequirement === "PARTIAL_ELIGIBILITY_REQUIREMENT") {
    return <Badge severity="new">Accès au dossier de faisabilité adapté</Badge>;
  }
  return null;
};

export function DffSummary({
  candidacy,
  candidateDecisionComment,
  setCandidateDecisionComment,
}: DffSummaryProps) {
  if (!candidacy) {
    return null;
  }

  const { feasibility } = candidacy;
  const dematerializedFeasibilityFile =
    feasibility?.dematerializedFeasibilityFile;

  if (!dematerializedFeasibilityFile) {
    redirect("/");
  }

  const {
    option,
    firstForeignLanguage,
    secondForeignLanguage,
    aapDecision,
    aapDecisionComment,
    prerequisites,
    blocsDeCompetences,
    certificationCompetenceDetails,
    eligibilityRequirement,
    eligibilityValidUntil,
    eligibilityCandidateSituation,
    candidateConfirmationAt,
    attachments,
    swornStatementFile,
  } = dematerializedFeasibilityFile;

  const {
    experiences,
    goals,
    basicSkills,
    mandatoryTrainings,
    additionalHourCount,
    individualHourCount,
    collectiveHourCount,
  } = candidacy;

  const isEligibilityRequirementPartial =
    eligibilityRequirement === "PARTIAL_ELIGIBILITY_REQUIREMENT";

  return (
    <div className="flex flex-col gap-12 mt-8" data-testid="dff-summary">
      <BannerSummary
        feasibilitySentToCertificationAuthorityAt={
          feasibility.feasibilityFileSentAt
        }
      />
      <div className="flex flex-col gap-8">
        <div className="border border-gray-200 p-10">
          <h2 className="mb-6">
            <span className="w-10 h-10 inline-block align-top mr-2">
              {PICTOGRAMS.dataVisualizationSmall}
            </span>
            Contexte de la demande
          </h2>
          <h3>Nature de la demande</h3>
          <EligibiltyBadge
            eligibilityRequirement={eligibilityRequirement}
            eligibilityCandidateSituation={eligibilityCandidateSituation}
          />
          {eligibilityValidUntil && (
            <dl className="mt-4 mb-4">
              <dt id="eligibility-valid-until-label" className="mb-0">
                Date de fin de validité
              </dt>
              <dd
                aria-labelledby="eligibility-valid-until-label"
                className="font-medium"
              >
                {format(eligibilityValidUntil, "dd/MM/yyyy")}
              </dd>
            </dl>
          )}
          <h3 className="mt-6">Certification professionnelle visée</h3>
          <CertificationCard candidacy={candidacy} />
          <CertificationSection
            option={option}
            firstForeignLanguage={firstForeignLanguage}
            secondForeignLanguage={secondForeignLanguage}
            prerequisites={prerequisites as Prerequisite[]}
            isCertificationPartial={candidacy.isCertificationPartial}
            certificationCompetenceBlocs={
              candidacy.certification?.competenceBlocs
            }
            blocsDeCompetencesDFF={blocsDeCompetences}
            certificationAuthorityStructureLabel={
              candidacy.certification?.certificationAuthorityStructure?.label
            }
          />
        </div>
        <div className="border border-gray-200 p-10">
          <h2 className="mb-6">
            <span className="w-10 h-10 inline-block align-top mr-2 my-auto">
              {PICTOGRAMS.avatarSmall}
            </span>
            Profil du candidat
          </h2>
          <CandidateSection
            candidate={{
              ...(candidacy?.candidate as Candidate),
              street: candidacy?.candidateInfo?.street,
              zip: candidacy?.candidateInfo?.zip,
              city: candidacy?.candidateInfo?.city,
              addressComplement: candidacy?.candidateInfo?.addressComplement,
            }}
            typology={candidacy?.typology}
            conventionCollective={candidacy?.conventionCollective?.label}
          />
          <GoalsSection goals={goals} />
          <ExperiencesSection
            experiences={experiences}
            blocsDeCompetences={blocsDeCompetences}
            certificationCompetenceDetails={certificationCompetenceDetails}
            isEligibilityRequirementPartial={isEligibilityRequirementPartial}
          />
        </div>

        <div className="border border-gray-200 p-10">
          <h2 className="mb-6">
            <span className="w-10 h-10 inline-block align-top mr-2 my-auto">
              <Image
                src="/candidat/images/pictograms/ecosystem.svg"
                alt="Accompagnement"
                width={40}
                height={40}
              />
            </span>
            Accompagnement proposé au candidat
          </h2>
          <ParcoursSection
            basicSkills={basicSkills}
            mandatoryTrainings={mandatoryTrainings}
            additionalHourCount={additionalHourCount}
            individualHourCount={individualHourCount}
            collectiveHourCount={collectiveHourCount}
          />
        </div>

        <div className="border border-gray-200 p-10">
          <h2 className="mb-6">
            <span className="w-10 h-10 inline-block align-top mr-2 my-auto">
              {PICTOGRAMS.contractSmall}
            </span>
            Avis et documents
          </h2>
          <DecisionSection
            decision={aapDecision}
            decisionComment={aapDecisionComment}
            candidateDecisionComment={candidateDecisionComment}
            setCandidateDecisionComment={setCandidateDecisionComment}
            candidateDecisionCommentDisabled={!!candidateConfirmationAt}
          />
          {candidateDecisionComment && (
            <CandidateDecisionCommentSection
              candidateDecisionComment={candidateDecisionComment}
            />
          )}
          <AttachmentsSection
            attachments={attachments as DffAttachment[]}
            swornStatementFile={swornStatementFile}
          />
        </div>
      </div>
      {candidacy.feasibility?.certificationAuthority && (
        <div className="mb-4">
          <ContactInfosSection
            certificationAuthority={
              candidacy.feasibility?.certificationAuthority
            }
            certificationAuthorityLocalAccounts={
              candidacy.certificationAuthorityLocalAccounts
            }
            organism={candidacy.organism}
          />
        </div>
      )}
    </div>
  );
}
