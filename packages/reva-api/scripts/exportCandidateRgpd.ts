// Le script d’export RGPD est dans packages/reva-api/scripts/exportCandidateRgpd.ts. Il lit la base, n’écrit rien dedans, et produit un dossier de CSV.

// Depuis packages/reva-api :

// npx tsx scripts/exportCandidateRgpd.ts candidat@example.com

// L’email est cherché tel quel sur Candidate.email. S’il n’existe pas, le script s’arrête sans créer de fichier. Sinon il écrit dans packages/reva-api/scripts/exports/rgpd/<email>-<horodatage>/, un CSV par entité qui contient des lignes (profil, candidatures, expériences, financement, dossiers en texte, logs, etc.). Les pièces déposées et la table File ne sont pas exportées. Ce dossier est ignoré par git.

import { mkdir } from "node:fs/promises";
import path from "node:path";

import { Prisma } from "@prisma/client";
import dotenv from "dotenv";
import ExcelJS from "exceljs";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const candidateInclude = {
  department: {
    select: {
      label: true,
      code: true,
      region: { select: { label: true } },
    },
  },
  birthDepartment: {
    select: { label: true, code: true },
  },
  country: {
    select: { label: true, isoCode: true },
  },
  highestDegree: {
    select: { label: true, longLabel: true, code: true, level: true },
  },
  niveauDeFormationLePlusEleve: {
    select: { label: true, longLabel: true, code: true, level: true },
  },
  vulnerabilityIndicator: {
    select: { label: true },
  },
  ccn: {
    select: { idcc: true, label: true },
  },
  candidacies: {
    orderBy: { createdAt: "asc" },
    include: {
      organism: { select: { label: true, nomPublic: true } },
      certification: { select: { label: true, rncpId: true } },
      certificationAuthority: { select: { label: true } },
      ccn: { select: { idcc: true, label: true } },
      reorientationReason: { select: { label: true } },
      endAccompagnementCandidateDropOutReason: { select: { label: true } },
      cohorteVaeCollective: { select: { nom: true } },
      candidacyCandidateInfo: true,
      candidacyStatuses: { orderBy: { createdAt: "asc" } },
      goals: { include: { goal: { select: { label: true } } } },
      experiences: { orderBy: { startedAt: "asc" } },
      trainings: { include: { training: { select: { label: true } } } },
      basicSkills: { include: { basicSkill: { select: { label: true } } } },
      candidacyOnCandidacyFinancingMethod: {
        include: { candidacyFinancingMethod: { select: { label: true } } },
      },
      appointments: { orderBy: { date: "asc" } },
      candidacyDropOut: {
        include: { dropOutReason: { select: { label: true } } },
      },
      admissibility: true,
      examInfo: true,
      accompagnements: {
        orderBy: { createdAt: "asc" },
        include: {
          organism: { select: { label: true, nomPublic: true } },
          endAccompagnementCandidateDropOutReason: { select: { label: true } },
        },
      },
      Feasibility: {
        orderBy: { createdAt: "asc" },
        include: {
          certificationAuthority: { select: { label: true } },
          feasibilityDecisionHistory: { orderBy: { decisionSentAt: "asc" } },
          dematerializedFeasibilityFile: {
            include: {
              dffCertificationCompetenceBlocs: {
                include: {
                  certificationCompetenceBloc: {
                    select: { label: true, code: true },
                  },
                },
              },
              dffCertificationCompetenceDetails: {
                include: {
                  certificationCompetence: {
                    select: {
                      label: true,
                      bloc: { select: { label: true, code: true } },
                    },
                  },
                },
              },
              prerequisites: {
                include: {
                  certificationPrerequisite: { select: { label: true } },
                },
              },
            },
          },
        },
      },
      dossierDeValidation: {
        orderBy: { createdAt: "asc" },
        include: {
          certificationAuthority: { select: { label: true } },
          amenagementSpecifique: true,
        },
      },
      Jury: {
        orderBy: { dateOfSession: "asc" },
        include: {
          certificationAuthority: { select: { label: true } },
          juryResultByCompetenceBlocs: {
            include: {
              competenceBloc: { select: { label: true, code: true } },
            },
          },
        },
      },
      CandidacyEmail: { orderBy: { sentAt: "asc" } },
      CandidacyLog: { orderBy: { createdAt: "asc" } },
    },
  },
} satisfies Prisma.CandidateInclude;

type ExportedCandidate = Prisma.CandidateGetPayload<{
  include: typeof candidateInclude;
}>;

type CsvRow = Record<string, string>;

type ExportFiles = {
  candidate: CsvRow[];
  candidacy: CsvRow[];
  candidacy_candidate_info: CsvRow[];
  candidacy_status: CsvRow[];
  candidacy_goal: CsvRow[];
  experience: CsvRow[];
  training: CsvRow[];
  basic_skill: CsvRow[];
  financing_method: CsvRow[];
  appointment: CsvRow[];
  candidacy_drop_out: CsvRow[];
  accompagnement: CsvRow[];
  admissibility: CsvRow[];
  exam_info: CsvRow[];
  jury: CsvRow[];
  jury_result: CsvRow[];
  feasibility: CsvRow[];
  feasibility_decision: CsvRow[];
  dematerialized_feasibility_file: CsvRow[];
  dff_competence_bloc: CsvRow[];
  dff_competence_detail: CsvRow[];
  dff_prerequisite: CsvRow[];
  dossier_de_validation: CsvRow[];
  amenagement_specifique: CsvRow[];
  candidacy_email: CsvRow[];
  candidacy_log: CsvRow[];
};

function cell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Prisma.Decimal.isDecimal(value)) {
    return value.toString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function row(values: Record<string, unknown>): CsvRow {
  const result: CsvRow = {};
  for (const [key, value] of Object.entries(values)) {
    result[key] = cell(value);
  }
  return result;
}

function organismName(
  organism: { label: string; nomPublic: string | null } | null,
): string {
  if (!organism) {
    return "";
  }
  return organism.nomPublic || organism.label;
}

function sanitizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/@/g, "_at_")
    .replace(/[^a-z0-9._+-]+/g, "_");
}

function createExportFiles(): ExportFiles {
  return {
    candidate: [],
    candidacy: [],
    candidacy_candidate_info: [],
    candidacy_status: [],
    candidacy_goal: [],
    experience: [],
    training: [],
    basic_skill: [],
    financing_method: [],
    appointment: [],
    candidacy_drop_out: [],
    accompagnement: [],
    admissibility: [],
    exam_info: [],
    jury: [],
    jury_result: [],
    feasibility: [],
    feasibility_decision: [],
    dematerialized_feasibility_file: [],
    dff_competence_bloc: [],
    dff_competence_detail: [],
    dff_prerequisite: [],
    dossier_de_validation: [],
    amenagement_specifique: [],
    candidacy_email: [],
    candidacy_log: [],
  };
}

function buildExport(candidate: ExportedCandidate): ExportFiles {
  const files = createExportFiles();
  const candidateId = candidate.id;

  files.candidate.push(
    row({
      id: candidate.id,
      email: candidate.email,
      gender: candidate.gender,
      firstname: candidate.firstname,
      firstname2: candidate.firstname2,
      firstname3: candidate.firstname3,
      middle_names: candidate.middleNames,
      lastname: candidate.lastname,
      given_name: candidate.givenName,
      phone: candidate.phone,
      street: candidate.street,
      address_complement: candidate.addressComplement,
      zip: candidate.zip,
      city: candidate.city,
      department_label: candidate.department?.label,
      department_code: candidate.department?.code,
      region_label: candidate.department?.region?.label,
      birthdate: candidate.birthdate,
      birth_city: candidate.birthCity,
      birth_department_label: candidate.birthDepartment?.label,
      birth_department_code: candidate.birthDepartment?.code,
      country_label: candidate.country?.label,
      country_iso_code: candidate.country?.isoCode,
      nationality: candidate.nationality,
      highest_degree_label: candidate.highestDegree?.label,
      highest_degree_long_label: candidate.highestDegree?.longLabel,
      highest_degree_code: candidate.highestDegree?.code,
      highest_degree_level: candidate.highestDegree?.level,
      highest_degree_free_label: candidate.highestDegreeLabel,
      niveau_de_formation_le_plus_eleve_label:
        candidate.niveauDeFormationLePlusEleve?.label,
      niveau_de_formation_le_plus_eleve_long_label:
        candidate.niveauDeFormationLePlusEleve?.longLabel,
      niveau_de_formation_le_plus_eleve_code:
        candidate.niveauDeFormationLePlusEleve?.code,
      niveau_de_formation_le_plus_eleve_level:
        candidate.niveauDeFormationLePlusEleve?.level,
      vulnerability_indicator_label: candidate.vulnerabilityIndicator?.label,
      typology: candidate.typology,
      typology_additional: candidate.typologyAdditional,
      ccn_idcc: candidate.ccn?.idcc,
      ccn_label: candidate.ccn?.label,
      france_connect_linked: candidate.franceConnectLinked,
      created_at: candidate.createdAt,
      updated_at: candidate.updatedAt,
    }),
  );

  for (const candidacy of candidate.candidacies) {
    const candidacyId = candidacy.id;
    const ids = { candidate_id: candidateId, candidacy_id: candidacyId };

    files.candidacy.push(
      row({
        id: candidacy.id,
        candidate_id: candidateId,
        status: candidacy.status,
        typology: candidacy.typology,
        typology_additional: candidacy.typologyAdditional,
        finance_module: candidacy.financeModule,
        type_accompagnement: candidacy.typeAccompagnement,
        is_certification_partial: candidacy.isCertificationPartial,
        organism_label: organismName(candidacy.organism),
        certification_label: candidacy.certification?.label,
        certification_rncp_id: candidacy.certification?.rncpId,
        certification_authority_label: candidacy.certificationAuthority?.label,
        ccn_idcc: candidacy.ccn?.idcc,
        ccn_label: candidacy.ccn?.label,
        cohorte_vae_collective_nom: candidacy.cohorteVaeCollective?.nom,
        reorientation_reason_label: candidacy.reorientationReason?.label,
        first_appointment_occured_at: candidacy.firstAppointmentOccuredAt,
        certificate_skills: candidacy.certificateSkills,
        other_training: candidacy.otherTraining,
        individual_hour_count: candidacy.individualHourCount,
        collective_hour_count: candidacy.collectiveHourCount,
        additional_hour_count: candidacy.additionalHourCount,
        ready_for_jury_estimated_at: candidacy.readyForJuryEstimatedAt,
        feasibility_format: candidacy.feasibilityFormat,
        certification_authority_transfer_reason:
          candidacy.certificationAuthorityTransferReason,
        feasibility_file_template_first_read_at:
          candidacy.feasibilityFileTemplateFirstReadAt,
        feasibility_file_demat_autonome_resource_hidden_at:
          candidacy.feasibilityFileDematAutonomeResourceHiddenAt,
        feasibility_file_demat_autonome_first_opening_at:
          candidacy.feasibilityFileDematAutonomeFirstOpeningAt,
        archiving_reason: candidacy.archivingReason,
        archiving_reason_additional_information:
          candidacy.archivingReasonAdditionalInformation,
        end_accompagnement_date: candidacy.endAccompagnementDate,
        end_accompagnement_status: candidacy.endAccompagnementStatus,
        end_accompagnement_reason: candidacy.endAccompagnementReason,
        end_accompagnement_candidate_drop_out_reason_label:
          candidacy.endAccompagnementCandidateDropOutReason?.label,
        payment_request_deadline_passed: candidacy.paymentRequestDeadlinePassed,
        financement_pris_en_charge_par_transitions_pro:
          candidacy.financementPrisEnChargeParTransitionsPro,
        reminder_to_organism_dv_deadline_exceeded_sent_at:
          candidacy.reminderToOrganismDVDeadlineExceededSentAt,
        created_at: candidacy.createdAt,
        updated_at: candidacy.updatedAt,
        sent_at: candidacy.sentAt,
        last_opened_at: candidacy.lastOpenedAt,
      }),
    );

    if (candidacy.candidacyCandidateInfo) {
      const info = candidacy.candidacyCandidateInfo;
      files.candidacy_candidate_info.push(
        row({
          id: info.id,
          ...ids,
          street: info.street,
          address_complement: info.addressComplement,
          zip: info.zip,
          city: info.city,
        }),
      );
    }

    for (const status of candidacy.candidacyStatuses) {
      files.candidacy_status.push(
        row({
          id: status.id,
          ...ids,
          status: status.status,
          created_at: status.createdAt,
          updated_at: status.updatedAt,
        }),
      );
    }

    for (const goal of candidacy.goals) {
      files.candidacy_goal.push(
        row({
          ...ids,
          goal_label: goal.goal.label,
          additional_information: goal.additionalInformation,
          created_at: goal.createdAt,
          updated_at: goal.updatedAt,
        }),
      );
    }

    for (const experience of candidacy.experiences) {
      files.experience.push(
        row({
          id: experience.id,
          ...ids,
          title: experience.title,
          description: experience.description,
          duration: experience.duration,
          started_at: experience.startedAt,
          created_at: experience.createdAt,
          updated_at: experience.updatedAt,
        }),
      );
    }

    for (const training of candidacy.trainings) {
      files.training.push(
        row({
          ...ids,
          accompagnement_id: training.accompagnementId,
          training_id: training.trainingId,
          training_label: training.training.label,
          created_at: training.createdAt,
          updated_at: training.updatedAt,
        }),
      );
    }

    for (const basicSkill of candidacy.basicSkills) {
      files.basic_skill.push(
        row({
          ...ids,
          accompagnement_id: basicSkill.accompagnementId,
          basic_skill_label: basicSkill.basicSkill.label,
          created_at: basicSkill.createdAt,
          updated_at: basicSkill.updatedAt,
        }),
      );
    }

    for (const financing of candidacy.candidacyOnCandidacyFinancingMethod) {
      files.financing_method.push(
        row({
          id: financing.id,
          ...ids,
          accompagnement_id: financing.accompagnementId,
          financing_method_label: financing.candidacyFinancingMethod.label,
          additional_information: financing.additionalInformation,
          amount: financing.amount,
          created_at: financing.createdAt,
          updated_at: financing.updatedAt,
        }),
      );
    }

    for (const appointment of candidacy.appointments) {
      files.appointment.push(
        row({
          id: appointment.id,
          ...ids,
          type: appointment.type,
          title: appointment.title,
          description: appointment.description,
          date: appointment.date,
          duration: appointment.duration,
          location: appointment.location,
          created_at: appointment.createdAt,
          updated_at: appointment.updatedAt,
        }),
      );
    }

    if (candidacy.candidacyDropOut) {
      const dropOut = candidacy.candidacyDropOut;
      files.candidacy_drop_out.push(
        row({
          ...ids,
          drop_out_reason_label: dropOut.dropOutReason.label,
          status: dropOut.status,
          other_reason_content: dropOut.otherReasonContent,
          proof_received_by_admin: dropOut.proofReceivedByAdmin,
          drop_out_confirmed_by_candidate: dropOut.dropOutConfirmedByCandidate,
          drop_out_by_candidate: dropOut.dropOutByCandidate,
          validated_at: dropOut.validatedAt,
          auto_drop_out_confirmation_emails_sent:
            dropOut.autoDropOutConfirmationEmailsSent,
          created_at: dropOut.createdAt,
          updated_at: dropOut.updatedAt,
        }),
      );
    }

    for (const accompagnement of candidacy.accompagnements) {
      files.accompagnement.push(
        row({
          id: accompagnement.id,
          ...ids,
          status: accompagnement.status,
          started_at: accompagnement.startedAt,
          ended_at: accompagnement.endedAt,
          candidacy_status_at_start: accompagnement.candidacyStatusAtStart,
          candidacy_status_at_end: accompagnement.candidacyStatusAtEnd,
          organism_label: organismName(accompagnement.organism),
          individual_hour_count: accompagnement.individualHourCount,
          collective_hour_count: accompagnement.collectiveHourCount,
          additional_hour_count: accompagnement.additionalHourCount,
          certificate_skills: accompagnement.certificateSkills,
          other_training: accompagnement.otherTraining,
          is_certification_partial: accompagnement.isCertificationPartial,
          first_appointment_occured_at:
            accompagnement.firstAppointmentOccuredAt,
          finance_module: accompagnement.financeModule,
          end_accompagnement_date: accompagnement.endAccompagnementDate,
          end_accompagnement_status: accompagnement.endAccompagnementStatus,
          end_accompagnement_reason: accompagnement.endAccompagnementReason,
          end_accompagnement_candidate_drop_out_reason_label:
            accompagnement.endAccompagnementCandidateDropOutReason?.label,
          created_at: accompagnement.createdAt,
          updated_at: accompagnement.updatedAt,
        }),
      );
    }

    if (candidacy.admissibility) {
      const admissibility = candidacy.admissibility;
      files.admissibility.push(
        row({
          id: admissibility.id,
          ...ids,
          is_candidate_already_admissible:
            admissibility.isCandidateAlreadyAdmissible,
          status: admissibility.status,
          report_sent_at: admissibility.reportSentAt,
          certifier_responded_at: admissibility.certifierRespondedAt,
          response_available_to_candidate_at:
            admissibility.responseAvailableToCandidateAt,
          created_at: admissibility.createdAt,
          updated_at: admissibility.updatedAt,
        }),
      );
    }

    if (candidacy.examInfo) {
      const examInfo = candidacy.examInfo;
      files.exam_info.push(
        row({
          id: examInfo.id,
          ...ids,
          exam_result: examInfo.examResult,
          estimated_exam_date: examInfo.estimatedExamDate,
          actual_exam_date: examInfo.actualExamDate,
          created_at: examInfo.createdAt,
          updated_at: examInfo.updatedAt,
        }),
      );
    }

    for (const jury of candidacy.Jury) {
      files.jury.push(
        row({
          id: jury.id,
          ...ids,
          certification_authority_label: jury.certificationAuthority.label,
          date_of_session: jury.dateOfSession,
          time_of_session: jury.timeOfSession,
          time_specified: jury.timeSpecified,
          address_of_session: jury.addressOfSession,
          information_of_session: jury.informationOfSession,
          result: jury.result,
          date_of_result: jury.dateOfResult,
          information_of_result: jury.informationOfResult,
          is_result_temporary: jury.isResultTemporary,
          is_active: jury.isActive,
          reminder_to_candidate_with_scheduled_jury_send_at:
            jury.reminderToCandidateWithScheduledJurySendAt,
          reminder_to_certification_authority_fill_jury_results_sent_at:
            jury.reminderToCertificationAuthorityFillJuryResultsSentAt,
          created_at: jury.createdAt,
          updated_at: jury.updatedAt,
        }),
      );

      for (const result of jury.juryResultByCompetenceBlocs) {
        files.jury_result.push(
          row({
            id: result.id,
            ...ids,
            jury_id: jury.id,
            competence_bloc_id: result.competenceBlocId,
            competence_bloc_label: result.competenceBloc.label,
            competence_bloc_code: result.competenceBloc.code,
            is_competence_bloc_validated: result.isCompetenceBlocValidated,
          }),
        );
      }
    }

    for (const feasibility of candidacy.Feasibility) {
      files.feasibility.push(
        row({
          id: feasibility.id,
          ...ids,
          certification_authority_label:
            feasibility.certificationAuthority?.label,
          feasibility_file_sent_at: feasibility.feasibilityFileSentAt,
          decision: feasibility.decision,
          decision_comment: feasibility.decisionComment,
          decision_sent_at: feasibility.decisionSentAt,
          is_active: feasibility.isActive,
          feasibility_format: feasibility.feasibilityFormat,
          created_at: feasibility.createdAt,
          updated_at: feasibility.updatedAt,
        }),
      );

      for (const decision of feasibility.feasibilityDecisionHistory) {
        files.feasibility_decision.push(
          row({
            id: decision.id,
            ...ids,
            feasibility_id: feasibility.id,
            decision: decision.decision,
            decision_comment: decision.decisionComment,
            decision_sent_at: decision.decisionSentAt,
          }),
        );
      }

      const dff = feasibility.dematerializedFeasibilityFile;
      if (dff) {
        files.dematerialized_feasibility_file.push(
          row({
            id: dff.id,
            ...ids,
            feasibility_id: feasibility.id,
            first_foreign_language: dff.firstForeignLanguage,
            second_foreign_language: dff.secondForeignLanguage,
            option: dff.option,
            certification_part_complete: dff.certificationPartComplete,
            prerequisites_part_complete: dff.prerequisitesPartComplete,
            attachments_part_complete: dff.attachmentsPartComplete,
            prerequisites_comment: dff.prerequisitesComment,
            competence_blocs_part_completion: dff.competenceBlocsPartCompletion,
            aap_decision: dff.aapDecision,
            aap_decision_comment: dff.aapDecisionComment,
            candidate_decision_comment: dff.candidateDecisionComment,
            complement_experience_parcours_vise:
              dff.complementExperienceParcoursVise,
            sent_to_candidate_at: dff.sentToCandidateAt,
            candidate_confirmation_at: dff.candidateConfirmationAt,
            eligibility_requirement: dff.eligibilityRequirement,
            eligibility_valid_until: dff.eligibilityValidUntil,
            eligibility_candidate_situation: dff.eligibilityCandidateSituation,
          }),
        );

        for (const bloc of dff.dffCertificationCompetenceBlocs) {
          files.dff_competence_bloc.push(
            row({
              id: bloc.id,
              ...ids,
              feasibility_id: feasibility.id,
              dematerialized_feasibility_file_id: dff.id,
              competence_bloc_label: bloc.certificationCompetenceBloc.label,
              competence_bloc_code: bloc.certificationCompetenceBloc.code,
              text: bloc.text,
              complete: bloc.complete,
              created_at: bloc.createdAt,
            }),
          );
        }

        for (const detail of dff.dffCertificationCompetenceDetails) {
          files.dff_competence_detail.push(
            row({
              id: detail.id,
              ...ids,
              feasibility_id: feasibility.id,
              dematerialized_feasibility_file_id: dff.id,
              competence_label: detail.certificationCompetence.label,
              competence_bloc_label: detail.certificationCompetence.bloc.label,
              competence_bloc_code: detail.certificationCompetence.bloc.code,
              state: detail.state,
              created_at: detail.createdAt,
            }),
          );
        }

        for (const prerequisite of dff.prerequisites) {
          files.dff_prerequisite.push(
            row({
              id: prerequisite.id,
              ...ids,
              feasibility_id: feasibility.id,
              dematerialized_feasibility_file_id: dff.id,
              label: prerequisite.label,
              certification_prerequisite_label:
                prerequisite.certificationPrerequisite?.label,
              state: prerequisite.state,
            }),
          );
        }
      }
    }

    for (const dossier of candidacy.dossierDeValidation) {
      files.dossier_de_validation.push(
        row({
          id: dossier.id,
          ...ids,
          certification_authority_label: dossier.certificationAuthority.label,
          dossier_de_validation_sent_at: dossier.dossierDeValidationSentAt,
          decision: dossier.decision,
          decision_comment: dossier.decisionComment,
          decision_sent_at: dossier.decisionSentAt,
          is_active: dossier.isActive,
          created_at: dossier.createdAt,
          updated_at: dossier.updatedAt,
        }),
      );

      if (dossier.amenagementSpecifique) {
        const amenagement = dossier.amenagementSpecifique;
        files.amenagement_specifique.push(
          row({
            id: amenagement.id,
            ...ids,
            dossier_de_validation_id: dossier.id,
            justification_description: amenagement.justificationDescription,
            created_at: amenagement.createdAt,
            updated_at: amenagement.updatedAt,
          }),
        );
      }
    }

    for (const email of candidacy.CandidacyEmail) {
      files.candidacy_email.push(
        row({
          id: email.id,
          ...ids,
          email_type: email.emailType,
          sent_at: email.sentAt,
        }),
      );
    }

    for (const log of candidacy.CandidacyLog) {
      files.candidacy_log.push(
        row({
          id: log.id,
          ...ids,
          user_profile: log.userProfile,
          event_type: log.eventType,
          created_at: log.createdAt,
          updated_at: log.updatedAt,
        }),
      );
    }
  }

  return files;
}

const EXCEL_MAX_CELL_LENGTH = 32767;

const SHEET_NAME_ALIASES: Record<string, string> = {
  funding_request_unifvae_basic_skill: "unifvae_basic_skill",
  funding_request_unifvae_training: "unifvae_training",
};

function sheetName(name: string): string {
  return (SHEET_NAME_ALIASES[name] ?? name).slice(0, 31);
}

function excelValue(value: string): string {
  if (value.length <= EXCEL_MAX_CELL_LENGTH) {
    return value;
  }
  const suffix = " [tronqué]";
  return `${value.slice(0, EXCEL_MAX_CELL_LENGTH - suffix.length)}${suffix}`;
}

async function writeWorkbook(
  filePath: string,
  files: ExportFiles,
): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  const written: string[] = [];

  for (const [name, rows] of Object.entries(files)) {
    if (rows.length === 0) {
      continue;
    }

    const headers = Object.keys(rows[0]);
    const sheet = workbook.addWorksheet(sheetName(name));
    sheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(40, Math.max(14, header.length + 2)),
    }));

    for (const data of rows) {
      const values: CsvRow = {};
      for (const header of headers) {
        values[header] = excelValue(data[header] ?? "");
      }
      sheet.addRow(values);
    }

    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    written.push(`${sheet.name} (${rows.length})`);
  }

  await workbook.xlsx.writeFile(filePath);
  return written;
}

async function main(): Promise<void> {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error(
      "Usage: npx tsx scripts/exportCandidateRgpd.ts <email-candidat>",
    );
    process.exitCode = 1;
    return;
  }

  // Chargé après dotenv : PrismaClient lit DATABASE_URL à l'instanciation.
  const { prismaClient } = await import("../prisma/client");

  try {
    const candidate = await prismaClient.candidate.findUnique({
      where: { email },
      include: candidateInclude,
    });

    if (!candidate) {
      console.error(`Aucun candidat trouvé pour l'email ${email}.`);
      process.exitCode = 1;
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputDir = path.join(__dirname, "exports", "rgpd");
    await mkdir(outputDir, { recursive: true });
    const outputPath = path.join(
      outputDir,
      `${sanitizeEmail(email)}-${stamp}.xlsx`,
    );

    const written = await writeWorkbook(outputPath, buildExport(candidate));

    console.log(`Export écrit dans ${outputPath}`);
    for (const line of written) {
      console.log(`- ${line}`);
    }
  } finally {
    await prismaClient.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
