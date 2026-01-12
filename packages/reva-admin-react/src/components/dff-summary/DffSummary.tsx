"use client";

import Badge from "@codegouvfr/react-dsfr/Badge";
import { format } from "date-fns";
import { deburr } from "lodash";
import Image from "next/image";

import { CertificationCard } from "@/app/(aap)/candidacies/[candidacyId]/_components/CertificationCard";
import { REST_API_URL } from "@/config/config";

import {
  Candidacy,
  Candidate,
  DematerializedFeasibilityFile,
  DffAttachment,
  DffEligibilityCandidateSituation,
  DffEligibilityRequirement,
  Prerequisite,
} from "@/graphql/generated/graphql";

import { ContactInfosSection } from "../../app/contact-infos-section/ContactInfosSection";
import { useFeatureflipping } from "../feature-flipping/featureFlipping";
import { PICTOGRAMS } from "../pictograms/Pictograms";

import AttachmentsSection from "./_components/AttachmentsSection";
import CandidateDecisionCommentSection from "./_components/CandidateDecisionCommentSection";
import CandidateSection from "./_components/CandidateSection";
import CertificationSection from "./_components/CertificationSection";
import DecisionSection from "./_components/DecisionSection";
import ExperiencesSection from "./_components/ExperiencesSection";
import GoalsSection from "./_components/GoalsSection";
import ParcoursSection from "./_components/ParcoursSection";
import { PdfLink } from "./_components/PdfLink";

const eligibilityCandidateSituationMap = {
  PREMIERE_DEMANDE_RECEVABILITE: "Première demande de recevabilité",
  DETENTEUR_RECEVABILITE: "Détenteur d'une recevabilité",
  DETENTEUR_RECEVABILITE_AVEC_CHGT_CODE_RNCP_ET_REV_REFERENTIEL:
    "Détenteur d'une recevabilité avec changement de code RNCP et révision duréférentiel",
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
  dematerializedFeasibilityFile,
  candidacy,
  FeasibilityBanner,
  displayGiveYourDecisionSubtitle = false,
}: {
  dematerializedFeasibilityFile?: DematerializedFeasibilityFile;
  candidacy: Candidacy;
  FeasibilityBanner?: React.ReactNode;
  displayGiveYourDecisionSubtitle?: boolean;
}) {
  const { isFeatureActive } = useFeatureflipping();

  if (!dematerializedFeasibilityFile || !candidacy) {
    return null;
  }

  const {
    option,
    firstForeignLanguage,
    secondForeignLanguage,
    aapDecision,
    aapDecisionComment,
    attachments,
    prerequisites,
    blocsDeCompetences,
    certificationCompetenceDetails,
    swornStatementFile,
    eligibilityRequirement,
    eligibilityValidUntil,
    eligibilityCandidateSituation,
    candidateDecisionComment,
  } = dematerializedFeasibilityFile;
  const {
    experiences,
    goals,
    basicSkills,
    mandatoryTrainings,
    additionalHourCount,
    individualHourCount,
    collectiveHourCount,
  } = candidacy as Candidacy;
  const isEligibilityRequirementPartial =
    eligibilityRequirement === "PARTIAL_ELIGIBILITY_REQUIREMENT";

  const isUseGeneratedDffFileFromFileServerActive = isFeatureActive(
    "USE_GENERATED_DFF_FILE_FROM_FILE_SERVER",
  );

  const { candidate } = candidacy;

  const candidateName = deburr(
    `${candidate?.givenName ? candidate?.givenName : candidate?.lastname}_${candidate?.firstname}`,
  ).toLowerCase();

  const getPdfUrl = () => {
    return `${REST_API_URL}/candidacy/${candidacy.id}/feasibility/file-demat/${dematerializedFeasibilityFile.id}`;
  };

  return (
    <div className="flex flex-col mb-8" data-testid="dff-summary">
      <div className="flex justify-between mb-4">
        <h1 className="mb-0">Dossier de faisabilité</h1>

        {isUseGeneratedDffFileFromFileServerActive ? (
          <>
            {dematerializedFeasibilityFile.dffFile ? (
              <PdfLink
                url={dematerializedFeasibilityFile.dffFile.url}
                fileName={`dossier_de_faisabilite_${candidateName}.pdf`}
              />
            ) : null}
          </>
        ) : (
          <PdfLink
            url={getPdfUrl()}
            isBlobUrl
            fileName={`dossier_de_faisabilite_${candidateName}.pdf`}
          />
        )}
      </div>
      {displayGiveYourDecisionSubtitle && (
        <p>
          Retrouvez les informations liées à la faisabilité de ce parcours VAE
          et donnez votre décision sur la recevabilité du dossier
        </p>
      )}

      {FeasibilityBanner}

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
                src="/admin2/components/ecosystem.svg"
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
    </div>
  );
}
