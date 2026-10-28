import {
  CandidacyTypeAccompagnement,
  CompetenceBlocsPartCompletionEnum,
  DFFCertificationCompetenceDetailsState,
  DFFDecision,
  DFFEligibilityRequirement,
  PrerequisiteState,
} from "@prisma/client";
import PDFDocument from "pdfkit";

import { isAapAvailableForCertificationId } from "@/modules/referential/features/isAapAvailableForCertificationId";
import { formatDateWithoutTimestamp } from "@/modules/shared/date/formatDateWithoutTimestamp";
import {
  CANDIDATURE_NON_TROUVEE,
  CANDIDAT_NON_TROUVE,
  CERTIFICATION_NON_TROUVEE,
  DOSSIER_FAISABILITE_DEMATERIALISE_NON_TROUVE,
  DOSSIER_FAISABILITE_NON_TROUVE,
} from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";

import {
  addSubSection,
  getEligibilityLabelAndType,
  pxToPt,
  addSection,
  addFrame,
  addTag,
  addInfoText,
  addCallout,
  addTitledBlock,
  addDisabledCheckbox,
  addDocumentHeader,
  addInfoTable,
  getCourtesyTitleFromGender,
  getCandidateTypologyLabel,
  getExperienceDurationLabel,
  addCompetence,
  addDecision,
} from "../helpers/df-demat-pdf-helper/dfDematPdfHelper";

const ASSETS_PATH =
  "modules/feasibility/dematerialized-feasibility-file/assets/df-demat-pdf";

export const generateFeasibilityFileByCandidacyId = async (
  candidacyId: string,
): Promise<Buffer | undefined> => {
  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
    include: {
      certification: {
        include: {
          competenceBlocs: true,
          certificationAuthorityStructure: true,
        },
      },
      candidate: {
        include: {
          highestDegree: true,
          niveauDeFormationLePlusEleve: true,
          country: true,
        },
      },
      Feasibility: {
        where: {
          isActive: true,
        },
        include: {
          dematerializedFeasibilityFile: {
            include: {
              dffCertificationCompetenceBlocs: {
                include: {
                  certificationCompetenceBloc: {
                    include: { competences: true },
                  },
                },
              },
              prerequisites: true,
              dffCertificationCompetenceDetails: true,
              attachments: { include: { file: true } },
              swornStatementFile: true,
            },
          },
          certificationAuthority: true,
        },
      },
      ccn: true,
      goals: { include: { goal: true } },
      experiences: true,
      basicSkills: { include: { basicSkill: true } },
      trainings: { include: { training: true } },
      organism: true,
    },
  });

  if (!candidacy) {
    throw new Error(CANDIDATURE_NON_TROUVEE);
  }

  const { certification, candidate } = candidacy;

  if (!certification) {
    throw new Error(CERTIFICATION_NON_TROUVEE);
  }

  if (!candidate) {
    throw new Error(CANDIDAT_NON_TROUVE);
  }

  const feasibility = candidacy.Feasibility[0];
  if (!feasibility) {
    throw new Error(DOSSIER_FAISABILITE_NON_TROUVE);
  }

  const { dematerializedFeasibilityFile } = feasibility;
  if (!dematerializedFeasibilityFile) {
    throw new Error(DOSSIER_FAISABILITE_DEMATERIALISE_NON_TROUVE);
  }

  const isDFFReady = checkIsDFFReady({
    attachmentsPartComplete:
      dematerializedFeasibilityFile.attachmentsPartComplete,
    certificationPartComplete:
      dematerializedFeasibilityFile.certificationPartComplete,
    competenceBlocsPartCompletion:
      dematerializedFeasibilityFile.competenceBlocsPartCompletion,
    prerequisitesPartComplete:
      dematerializedFeasibilityFile.prerequisitesPartComplete,
    aapDecision: dematerializedFeasibilityFile.aapDecision,
    eligibilityRequirement:
      dematerializedFeasibilityFile.eligibilityRequirement,
  });

  if (!isDFFReady) {
    throw new Error(
      "Dossier de faisabilité incomplet pour la génération du pdf",
    );
  }

  const organism = candidacy.organism;
  if (candidacy.typeAccompagnement === "ACCOMPAGNE" && !organism) {
    throw new Error("Organisme d'accompagnement non trouvé");
  }

  const { certificationAuthority } = feasibility;

  const aapAvailableForCertification = await isAapAvailableForCertificationId({
    certificationId: certification.id,
  });

  const middleNamesFeature = await prismaClient.feature.findFirst({
    where: {
      key: "MIDDLE_NAMES",
    },
  });
  const isMiddleNamesFeatureEnabled = middleNamesFeature?.isActive ?? false;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "portrait",
      autoFirstPage: true,
      bufferPages: false,
      compress: true,
      margins: {
        top: pxToPt(40),
        bottom: "80px",
        left: pxToPt(100),
        right: "40px",
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const data = Buffer.concat(buffers);

      if (data) {
        resolve(data);
      } else {
        reject(undefined);
      }
    });

    addDocumentHeader(doc);

    const eligibilityLabelAndType = getEligibilityLabelAndType({
      eligibilityRequirement:
        dematerializedFeasibilityFile.eligibilityRequirement,
      eligibilitySituation:
        dematerializedFeasibilityFile.eligibilityCandidateSituation,
    });

    const dffBlocCompetenceBlocsIds =
      dematerializedFeasibilityFile.dffCertificationCompetenceBlocs.map(
        (bloc) => bloc.certificationCompetenceBlocId,
      );

    const certificationCompetenceBlocsWithSelectionStatus =
      certification.competenceBlocs
        .map((bloc) => ({
          code: bloc.code ?? "",
          label: bloc.label ?? "",
          selected: dffBlocCompetenceBlocsIds.includes(bloc.id ?? false),
        }))
        .sort((a, b) =>
          a.code.localeCompare(b.code, "fr", {
            sensitivity: "base",
          }),
        );

    addContexteDemandeSection({
      doc,
      eligibilityLabelAndType,
      certification,
      aapAvailableForCertification,
      option: dematerializedFeasibilityFile.option,
      firstForeignLanguage: dematerializedFeasibilityFile.firstForeignLanguage,
      secondForeignLanguage:
        dematerializedFeasibilityFile.secondForeignLanguage,
      isCertificationPartial: !!candidacy.isCertificationPartial,
      certificationCompetenceBlocsWithSelectionStatus,
      prerequisites:
        dematerializedFeasibilityFile.prerequisites.map((p) => ({
          label: p.label,
          state: p.state,
        })) ?? [],
      prerequisitesComment: dematerializedFeasibilityFile.prerequisitesComment,
    });

    //dff competences blocs with competences (label and state)
    const dffCompetenceBlocsWithCompetencesAndStates =
      dematerializedFeasibilityFile.dffCertificationCompetenceBlocs.map(
        (bloc) => {
          const competences = bloc.certificationCompetenceBloc.competences
            .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
            .map((competence) => {
              const details =
                dematerializedFeasibilityFile.dffCertificationCompetenceDetails.find(
                  (detail) =>
                    detail.certificationCompetenceId === competence.id,
                );
              return {
                label: competence.label,
                state: details?.state as
                  | DFFCertificationCompetenceDetailsState
                  | "TO_COMPLETE",
              };
            });
          return {
            code: bloc.certificationCompetenceBloc.code ?? "",
            label: bloc.certificationCompetenceBloc.label,
            text: bloc.text ?? "",
            competences,
          };
        },
      );

    let firstAndMiddleNames = [
      candidate.firstname,
      candidate.firstname2,
      candidate.firstname3,
    ]
      .filter(Boolean)
      .join(", ");

    if (isMiddleNamesFeatureEnabled) {
      firstAndMiddleNames = [candidate.firstname, candidate.middleNames]
        .filter(Boolean)
        .join(", ");
    }

    addProfilCandidatSection({
      candidate: {
        courtesyTitle: getCourtesyTitleFromGender(candidate.gender),
        firstAndMiddleNames,
        lastname: candidate.lastname,
        birthdate: candidate.birthdate
          ? formatDateWithoutTimestamp(candidate.birthdate)
          : "",
        givenName: candidate.givenName ?? "",
        birthcity: candidate.birthCity ?? "",
        birthcountry: candidate.country?.label ?? "",
        nationality: candidate.nationality ?? "",
        highestDegreeLevel: candidate.highestDegree?.level?.toString() ?? "",
        highestDegreeLabel: candidate.highestDegreeLabel ?? "",
        niveauDeFormationLePlusEleveLevel:
          candidate.niveauDeFormationLePlusEleve?.level?.toString() ?? "",
        address: [
          candidate.street,
          candidate.addressComplement,
          candidate.zip,
          candidate.city,
        ]
          .filter(Boolean)
          .join(" "),
        email: candidate.email ?? "",
        phone: candidate.phone ?? "",
        candidacyCcnLabel: candidacy.ccn?.label ?? "",
        candidacyCandidateTypologyLabel: getCandidateTypologyLabel(
          candidacy.typology,
        ),
        goals: candidacy.goals.map((goal) => goal.goal.label),
        experiences: candidacy.experiences.map((experience) => ({
          title: experience.title,
          description: experience.description,
          durationLabel: getExperienceDurationLabel(experience.duration),
          startedAtLabel: `Démarrée le ${formatDateWithoutTimestamp(experience.startedAt)}`,
        })),
        dffCompetenceBlocsWithCompetencesAndStates,
        complementExperienceParcoursVise: certification
          .certificationAuthorityStructure?.hasReducedRequirements
          ? dematerializedFeasibilityFile.complementExperienceParcoursVise
          : null,
      },
      doc,
    });

    if (candidacy.typeAccompagnement === "ACCOMPAGNE") {
      const {
        basicSkills,
        trainings,
        additionalHourCount,
        individualHourCount,
        collectiveHourCount,
      } = candidacy;

      const sortedBasicSkills = [...basicSkills]
        .map(({ basicSkill }) => basicSkill.label)
        .sort((first, second) =>
          first.localeCompare(second, "fr", {
            sensitivity: "base",
          }),
        );

      const sortedTrainings = [...trainings]
        .map(({ training }) => training.label)
        .sort((first, second) =>
          first.localeCompare(second, "fr", {
            sensitivity: "base",
          }),
        );

      addAccompagnementCandidatSection({
        additionalHourCount: additionalHourCount ?? 0,
        individualHourCount: individualHourCount ?? 0,
        collectiveHourCount: collectiveHourCount ?? 0,
        basicSkills: sortedBasicSkills,
        trainings: sortedTrainings,
        doc,
      });
    }

    addAvisEtDocumentsSection({
      doc,
      typeAccompagnement: candidacy.typeAccompagnement,
      aapDecision: dematerializedFeasibilityFile.aapDecision,
      aapDecisionComment:
        dematerializedFeasibilityFile.aapDecisionComment ?? "",
      candidateDecisionComment:
        dematerializedFeasibilityFile.candidateDecisionComment ?? "",
      attachments: [
        ...dematerializedFeasibilityFile.attachments.map(
          (attachment) => attachment.file.name,
        ),
        ...(dematerializedFeasibilityFile.swornStatementFile
          ? [dematerializedFeasibilityFile.swornStatementFile.name]
          : []),
      ],
    });

    addContactsSection({
      aapContactInfo: organism
        ? {
            label: organism.nomPublic ?? organism.label,
            address: [
              organism.adresseNumeroEtNomDeRue,
              organism.adresseInformationsComplementaires,
              organism.adresseCodePostal,
              organism.adresseVille,
            ]
              .filter(Boolean)
              .join(" "),
            email: organism.emailContact ?? "",
            phone: organism.telephone ?? "",
          }
        : undefined,
      certificationAuthorityContactInfo: {
        label: certificationAuthority?.label ?? "",
        contactName: certificationAuthority?.contactFullName ?? "",
        contactPhone: certificationAuthority?.contactPhone ?? "",
        contactEmail: certificationAuthority?.contactEmail ?? "",
      },
      doc,
    });

    doc.end();
  });
};

type CheckIsDFFReadyArgs = {
  attachmentsPartComplete: boolean;
  certificationPartComplete: boolean;
  competenceBlocsPartCompletion: CompetenceBlocsPartCompletionEnum;
  prerequisitesPartComplete: boolean;
  aapDecision: DFFDecision | null;
  eligibilityRequirement: DFFEligibilityRequirement | null;
};

const checkIsDFFReady = ({
  attachmentsPartComplete,
  certificationPartComplete,
  competenceBlocsPartCompletion,
  prerequisitesPartComplete,
  eligibilityRequirement,
}: CheckIsDFFReadyArgs) => {
  let isDFFReady =
    attachmentsPartComplete &&
    certificationPartComplete &&
    prerequisitesPartComplete &&
    !!eligibilityRequirement;

  const isEligibilityTotal =
    eligibilityRequirement === "FULL_ELIGIBILITY_REQUIREMENT";

  if (isEligibilityTotal) {
    isDFFReady = isDFFReady && competenceBlocsPartCompletion === "COMPLETED";
  }

  return isDFFReady;
};

const addContexteDemandeSection = ({
  doc,
  eligibilityLabelAndType,
  certification,
  aapAvailableForCertification,
  option,
  firstForeignLanguage,
  secondForeignLanguage,
  isCertificationPartial,
  certificationCompetenceBlocsWithSelectionStatus,
  prerequisites,
  prerequisitesComment,
}: {
  doc: PDFKit.PDFDocument;
  eligibilityLabelAndType: { label: string; type: "info" | "warning" };
  certification: { label: string; rncpId: string };
  aapAvailableForCertification: boolean;
  option: string | null;
  firstForeignLanguage: string | null;
  secondForeignLanguage: string | null;
  isCertificationPartial: boolean;
  certificationCompetenceBlocsWithSelectionStatus: {
    code: string;
    label: string;
    selected: boolean;
  }[];
  prerequisites: { label: string; state: PrerequisiteState }[];
  prerequisitesComment: string | null;
}) => {
  addSection({
    doc,
    title: "Contexte de la demande",
    iconPath: `${ASSETS_PATH}/images/data-visualization.png`,
    content: (doc) => {
      addNatureDemandeSubSection({ doc, eligibilityLabelAndType });
      addCertificationSubSection({
        doc,
        certification,
        aapAvailableForCertification,
        option,
        firstForeignLanguage,
        secondForeignLanguage,
        isCertificationPartial,
        certificationCompetenceBlocsWithSelectionStatus,
      });
      addCertificationPrerequisitesSubSection({
        doc,
        prerequisites,
        prerequisitesComment,
      });
    },
  });
};

const addNatureDemandeSubSection = ({
  doc,
  eligibilityLabelAndType,
}: {
  doc: PDFKit.PDFDocument;
  eligibilityLabelAndType: { label: string; type: "info" | "warning" };
}) => {
  const { backgroundColor, textColor, iconPath } =
    eligibilityLabelAndType.type === "info"
      ? {
          backgroundColor: "#e8edff",
          textColor: "#0063cb",
          iconPath: `${ASSETS_PATH}/images/info-fill.png`,
        }
      : {
          backgroundColor: "#feebd0",
          textColor: "#695240",
          iconPath: `${ASSETS_PATH}/images/flashlight-fill.png`,
        };

  addSubSection({
    title: "Nature de la demande",
    doc,
    content: (doc) => {
      doc
        .font("assets/fonts/Marianne/Marianne-Bold.otf")
        .fontSize(8)
        .table({
          columnStyles: [doc.widthOfString(eligibilityLabelAndType.label) + 25],
          data: [
            [
              {
                border: 0,
                backgroundColor,
                textColor,
                text: "        " + eligibilityLabelAndType.label,
              },
            ],
          ],
        });

      doc.image(iconPath, doc.x + 2, doc.y - 13, {
        fit: [12, 12],
      });
    },
  });
};

const addCertificationSubSection = ({
  doc,
  certification,
  aapAvailableForCertification,
  option,
  firstForeignLanguage,
  secondForeignLanguage,
  isCertificationPartial,
  certificationCompetenceBlocsWithSelectionStatus,
}: {
  doc: PDFKit.PDFDocument;
  certification: { label: string; rncpId: string };
  aapAvailableForCertification: boolean;
  option: string | null;
  firstForeignLanguage: string | null;
  secondForeignLanguage: string | null;
  isCertificationPartial: boolean;
  certificationCompetenceBlocsWithSelectionStatus: {
    code: string;
    label: string;
    selected: boolean;
  }[];
}) => {
  addSubSection({
    title: "Informations sur la certification professionnelle visée",
    doc,
    content: (doc) => {
      addFrame({
        doc,
        startInPt: pxToPt(140),
        widthInPt: pxToPt(1200),
        content: (doc) => {
          doc.moveDown(0.75);
          addTag({
            doc,
            text: aapAvailableForCertification
              ? "VAE en autonomie ou accompagnée"
              : "VAE en autonomie",
            startInPt: doc.x + pxToPt(32),
          });
          doc.image(
            `${ASSETS_PATH}/images/verified-badge.png`,
            doc.x,
            doc.y + pxToPt(20),
            {
              fit: [pxToPt(16), pxToPt(16)],
            },
          );
          doc
            .font("assets/fonts/Marianne/Marianne-Light.otf")
            .fontSize(6)
            .text(
              `       RNCP ${certification.rncpId}`,
              doc.x,
              doc.y + pxToPt(16),
            );

          doc
            .font("assets/fonts/Marianne/Marianne-Bold.otf")
            .fontSize(11)
            .text(certification.label, doc.x, doc.y + pxToPt(16), {
              width: pxToPt(1096),
            });
        },
      });

      doc.moveDown(1);

      addInfoText({
        title: "Option ou parcours :",
        value: option ?? "",
        doc,
        maxWidthInPt: pxToPt(1200),
      });

      doc.moveDown(1);

      const oldY = doc.y;

      const oldX = doc.x;

      addInfoText({
        title: "Langue vivante 1 :",
        value: firstForeignLanguage ?? "",
        doc,
      });

      addInfoText({
        title: "Langue vivante 2 :",
        value: secondForeignLanguage ?? "",
        x: doc.x + pxToPt(300),
        y: oldY,
        doc,
      });

      doc.moveDown(1.5);

      addCallout({
        title: "Le candidat vise",
        description: isCertificationPartial
          ? "Un ou plusieurs bloc(s) de compétences de la certification"
          : "La certification dans sa totalité",
        x: oldX,
        doc,
        widthInPt: pxToPt(1200),
      });

      doc.moveDown(1.5);

      addTitledBlock({
        doc,
        title: "Choix des blocs de compétences",
        content: (doc) =>
          certificationCompetenceBlocsWithSelectionStatus.forEach((bloc) => {
            addDisabledCheckbox({
              label: `${bloc.code} - ${bloc.label}`,
              checked: bloc.selected,
              doc,
            });
            doc.moveDown(0.5);
          }),
        widthInPt: pxToPt(1200),
      });
    },
  });
};

const addCertificationPrerequisitesSubSection = ({
  doc,
  prerequisites,
  prerequisitesComment,
}: {
  doc: PDFKit.PDFDocument;
  prerequisites: { label: string; state: PrerequisiteState }[];
  prerequisitesComment: string | null;
}) => {
  addSubSection({
    title:
      "Pré-requis à la délivrance de la certification professionnelle visée ",
    doc,
    content: (doc) => {
      if (prerequisites.length === 0) {
        doc
          .fontSize(8)
          .font("assets/fonts/Marianne/Marianne-Regular.otf")
          .fillColor("black")
          .text(
            "Il n'y a pas de prérequis obligatoires pour cette certification",
            doc.x,
            doc.y,
          );
        return;
      }
      addTitledBlock({
        doc,
        title: "Oui",
        widthInPt: pxToPt(1200),
        content: (doc) => {
          prerequisites
            .filter((p) => p.state === "ACQUIRED")
            .forEach((prerequisite) =>
              doc
                .fontSize(8)
                .font("assets/fonts/Marianne/Marianne-Light.otf")
                .text("- " + prerequisite.label, doc.x, doc.y),
            );
        },
      });
      doc.moveDown(1);
      addTitledBlock({
        doc,
        title: "Non",
        widthInPt: pxToPt(1200),
        content: (doc) => {
          prerequisites
            .filter((p) => p.state === "IN_PROGRESS")
            .forEach((prerequisite) =>
              doc
                .fontSize(8)
                .font("assets/fonts/Marianne/Marianne-Light.otf")
                .text("- " + prerequisite.label, doc.x, doc.y),
            );
        },
      });
      if (prerequisitesComment) {
        doc.moveDown(1);
        doc
          .font("assets/fonts/Marianne/Marianne-Bold.otf")
          .fontSize(8)
          .text("Commentaire sur les pré-requis");
        doc.moveDown(0.25);
        doc
          .font("assets/fonts/Marianne/Marianne-Regular.otf")
          .fontSize(8)
          .text(prerequisitesComment, doc.x, doc.y, {
            width: pxToPt(1200),
          });
      }
    },
  });
};

const addProfilCandidatSection = ({
  doc,
  candidate: {
    courtesyTitle,
    firstAndMiddleNames,
    lastname,
    givenName,
    birthdate,
    birthcity,
    birthcountry,
    nationality,
    highestDegreeLevel,
    highestDegreeLabel,
    niveauDeFormationLePlusEleveLevel,
    address,
    email,
    phone,
    candidacyCcnLabel,
    candidacyCandidateTypologyLabel,
    goals,
    experiences,
    dffCompetenceBlocsWithCompetencesAndStates,
    complementExperienceParcoursVise,
  },
}: {
  candidate: {
    courtesyTitle: string;
    firstAndMiddleNames: string;
    lastname: string;
    givenName: string;
    birthdate: string;
    birthcity: string;
    birthcountry: string;
    nationality: string;
    highestDegreeLevel: string;
    highestDegreeLabel: string;
    niveauDeFormationLePlusEleveLevel: string;
    address: string;
    email: string;
    phone: string;
    candidacyCcnLabel: string;
    candidacyCandidateTypologyLabel: string;
    goals: string[];
    experiences: {
      title: string;
      description: string;
      durationLabel: string;
      startedAtLabel: string;
    }[];
    dffCompetenceBlocsWithCompetencesAndStates: {
      code: string;
      label: string;
      text: string;
      competences: {
        label: string;
        state: DFFCertificationCompetenceDetailsState | "TO_COMPLETE";
      }[];
    }[];
    complementExperienceParcoursVise?: string | null;
  };
  doc: PDFKit.PDFDocument;
}) => {
  addSection({
    doc,
    title: "Profil du candidat",
    iconPath: `${ASSETS_PATH}/images/avatar.png`,
    content: (doc) => {
      addSubSection({
        title: "Informations sur le candidat",
        doc,
        content: (doc) => {
          addInfoTable({
            widthInPt: pxToPt(1200),
            data: [
              { title: "Civilité :", value: courtesyTitle },
              { title: "Nom de naissance :", value: lastname },
              givenName ? { title: "Nom d'usage :", value: givenName } : null,
              { title: "Prénoms :", value: firstAndMiddleNames },
              { title: "Date de naissance :", value: birthdate },
              { title: "Ville de naissance :", value: birthcity },
              { title: "Pays de naissance :", value: birthcountry },
              { title: "Nationalité :", value: nationality },
            ].filter((item) => item !== null),
            doc,
          });
        },
      });
      doc.moveDown(1);
      addSubSection({
        title: "Niveau de formation",
        doc,
        content: (doc) => {
          addInfoTable({
            widthInPt: pxToPt(1200),
            data: [
              {
                title: "Niveau de formation le plus élevé :",
                value: niveauDeFormationLePlusEleveLevel,
              },
              {
                title: "Niveau de la certification obtenue la plus élevée :",
                value: highestDegreeLevel,
              },
              {
                title: "Intitulé de la certification la plus élevée obtenue :",
                value: highestDegreeLabel,
              },
            ],
            doc,
          });
        },
      });
      addSubSection({
        title: "Informations de contact du candidat",
        doc,
        content: (doc) => {
          addInfoTable({
            widthInPt: pxToPt(1200),
            data: [
              { title: "Adresse postale :", value: address },
              { title: "Adresse électronique :", value: email },
              { title: "Téléphone :", value: phone },
            ],
            doc,
          });
        },
      });
      addSubSection({
        title: "Statut",
        doc,
        content: (doc) => {
          doc
            .fontSize(8)
            .font("assets/fonts/Marianne/Marianne-Regular.otf")
            .text(candidacyCandidateTypologyLabel, doc.x, doc.y);
          doc.moveDown(1);
          addCallout({
            title:
              "Identifiant de la Convention collective de l’employeur du candidat",
            description: candidacyCcnLabel,
            x: doc.x,
            doc,
            widthInPt: pxToPt(1200),
          });
        },
      });
      addSubSection({
        title: "Objectifs du candidat",
        doc,
        content: (doc) => {
          goals.forEach((goal) => {
            doc
              .fontSize(8)
              .font("assets/fonts/Marianne/Marianne-Regular.otf")
              .text("- " + goal, doc.x, doc.y);
            doc.moveDown(0.5);
          });
        },
      });
      addSubSection({
        title: "Expériences",
        doc,
        content: (doc) => {
          experiences.forEach((experience) => {
            addTitledBlock({
              doc,
              title: experience.title,
              content: (doc) => {
                doc
                  .fontSize(8)
                  .font("assets/fonts/Marianne/Marianne-Light.otf")
                  .text(experience.description, doc.x, doc.y);
                doc.moveDown(0.5);
                doc
                  .fontSize(8)
                  .font("assets/fonts/Marianne/Marianne-Light.otf")
                  .text(experience.durationLabel, doc.x, doc.y);
                doc.moveDown(0.5);
                doc
                  .fontSize(8)
                  .font("assets/fonts/Marianne/Marianne-Light.otf")
                  .text(experience.startedAtLabel, doc.x, doc.y);
              },
              widthInPt: pxToPt(1200),
            });
            doc.moveDown(1);
          });
        },
      });
      addSubSection({
        title:
          "Informations sur les expériences du candidat en lien avec le référentiel d’activités et de compétences",
        doc,
        content: (doc) => {
          doc.moveDown(0.5);
          dffCompetenceBlocsWithCompetencesAndStates.forEach((bloc) => {
            addTitledBlock({
              doc,
              title: `${bloc.code} - ${bloc.label}`,
              content: (doc) => {
                doc.moveDown(0.5);
                bloc.competences.forEach((competence) => {
                  addCompetence({
                    doc,
                    label: competence.label,
                    state: competence.state,
                    maxWidthInPt: pxToPt(1200),
                  });
                  doc.moveDown(1);
                });
                doc
                  .font("assets/fonts/Marianne/Marianne-Bold.otf")
                  .fontSize(8)
                  .text("Commentaire sur le bloc");
                doc.moveDown(0.25);
                doc
                  .font("assets/fonts/Marianne/Marianne-Regular.otf")
                  .fontSize(8)
                  .text(bloc.text);
              },
              widthInPt: pxToPt(1160),
            });
            doc.moveDown(1);
          });
          if (complementExperienceParcoursVise) {
            addTitledBlock({
              doc,
              title: "Complément d’expérience lié au parcours visé (optionnel)",
              content: (doc) => {
                doc
                  .font("assets/fonts/Marianne/Marianne-Bold.otf")
                  .fontSize(8)
                  .text(
                    "Informations complémentaires ne pouvant pas figurer dans les autres blocs liés à la mention du diplôme :",
                    { width: pxToPt(1100) },
                  );
                doc.moveDown(0.5);
                doc
                  .font("assets/fonts/Marianne/Marianne-Regular.otf")
                  .fontSize(8)
                  .text(complementExperienceParcoursVise, {
                    width: pxToPt(1100),
                  });
              },
              widthInPt: pxToPt(1160),
            });
            doc.moveDown(1);
          }
        },
      });
    },
  });
};

const addAccompagnementCandidatSection = ({
  doc,
  additionalHourCount,
  individualHourCount,
  collectiveHourCount,
  basicSkills,
  trainings,
}: {
  doc: PDFKit.PDFDocument;
  additionalHourCount: number;
  individualHourCount: number;
  collectiveHourCount: number;
  basicSkills: string[];
  trainings: string[];
}) => {
  addSection({
    doc,
    title: "Accompagnement proposé au candidat",
    iconPath: `${ASSETS_PATH}/images/ecosystem.png`,
    content: (doc) => {
      addSubSection({
        title: "Préconisation accompagnement méthodologique ",
        doc,
        content: (doc) => {
          addInfoTable({
            widthInPt: pxToPt(1200),
            data: [
              {
                title: "Accompagnement individuel :",
                value: `${individualHourCount}h`,
              },
              {
                title: "Accompagnement collectif :",
                value: collectiveHourCount + "h",
              },
              { title: "Formation :", value: additionalHourCount + "h" },
            ],
            doc,
          });
        },
      });
      addSubSection({
        title: "Préconisation actes formatifs ",
        doc,
        content: (doc) => {
          addTitledBlock({
            doc,
            title: "Formations obligatoires",
            content: (doc) => {
              trainings.forEach((training) => {
                doc.text(`- ${training}`, doc.x, doc.y);
                doc.moveDown(0.5);
              });
            },
            widthInPt: pxToPt(1200),
          });
          doc.moveDown(1);
          addTitledBlock({
            doc,
            title: "Savoirs de base ",
            content: (doc) => {
              basicSkills.forEach((basicSkill) => {
                doc.text(`- ${basicSkill}`, doc.x, doc.y);
                doc.moveDown(0.5);
              });
            },
            widthInPt: pxToPt(1200),
          });
        },
      });
    },
  });
};

const addAvisEtDocumentsSection = ({
  doc,
  typeAccompagnement,
  aapDecision,
  aapDecisionComment,
  candidateDecisionComment,
  attachments,
}: {
  doc: PDFKit.PDFDocument;
  typeAccompagnement: CandidacyTypeAccompagnement;
  aapDecision: DFFDecision | null;
  aapDecisionComment: string;
  candidateDecisionComment: string;
  attachments: string[];
}) => {
  addSection({
    doc,
    title:
      typeAccompagnement === "ACCOMPAGNE" ? "Avis et documents" : "Documents",
    iconPath: `${ASSETS_PATH}/images/contract.png`,
    content: (doc) => {
      if (typeAccompagnement === "ACCOMPAGNE") {
        addSubSection({
          title:
            "Avis de la personne chargée de l’accompagnement sur la faisabilité de la demande de validation des acquis de l’expérience",
          doc,
          content: (doc) => {
            doc
              .font("assets/fonts/Marianne/Marianne-Bold.otf")
              .fontSize(10)
              .text("Avis de l’accompagnateur");
            doc.moveDown(0.5);
            if (aapDecision) {
              addDecision({
                decision: aapDecision,
                doc,
              });
              doc.moveDown(0.5);
            }
            doc
              .font("assets/fonts/Marianne/Marianne-Regular.otf")
              .fontSize(8)
              .text(aapDecisionComment, doc.x, doc.y, {
                width: pxToPt(1200),
              });
            doc.moveDown(0.5);
            doc
              .font("assets/fonts/Marianne/Marianne-Bold.otf")
              .fontSize(10)
              .text(
                "Commentaires du candidat sur l’avis de l’accompagnateur",
                doc.x,
                doc.y,
              );
            doc.moveDown(0.5);
            doc
              .font("assets/fonts/Marianne/Marianne-Regular.otf")
              .fontSize(8)
              .text(candidateDecisionComment, doc.x, doc.y, {
                width: pxToPt(1200),
              });
          },
        });
      }

      addSubSection({
        title: "Pièces jointes",
        doc,
        content: (doc) => {
          doc.table({
            defaultStyle: {
              border: [true, false, true, false],
              borderColor: "#DDDDDD",
              padding: { vertical: "8px", horizontal: "10" },
              width: pxToPt(1200),
            },
            data: attachments.map((attachment) => [
              {
                text: attachment,
                textColor: "#000091",
                font: {
                  src: "assets/fonts/Marianne/Marianne-Regular.otf",
                  size: 9,
                },
              },
            ]),
          });
        },
      });
      doc
        .font("assets/fonts/Marianne/Marianne-Regular.otf")
        .fontSize(8)
        .fillColor("black");
    },
  });
};

const addContactsSection = ({
  aapContactInfo,
  certificationAuthorityContactInfo,
  doc,
}: {
  aapContactInfo?: {
    label: string;
    address: string;
    email: string;
    phone: string;
  };
  certificationAuthorityContactInfo: {
    label: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
  };
  doc: PDFKit.PDFDocument;
}) => {
  addSection({
    doc,
    title: "Contacts",
    iconPath: `${ASSETS_PATH}/images/team.png`,
    content: (doc) => {
      if (aapContactInfo) {
        addSubSection({
          title: "Architecte accompagnateur de parcours",
          doc,
          content: (doc) => {
            addInfoTable({
              widthInPt: pxToPt(1200),
              data: [
                { title: "Nom :", value: aapContactInfo.label },
                aapContactInfo.address
                  ? { title: "Adresse :", value: aapContactInfo.address }
                  : null,
                {
                  title: "Adresse électronique :",
                  value: aapContactInfo.email,
                },
                {
                  title: "Téléphone :",
                  value: aapContactInfo.phone,
                },
              ].filter((item) => item !== null),
              doc,
            });
          },
        });
      }

      addSubSection({
        title: "Certificateur",
        doc,
        content: (doc) => {
          addInfoTable({
            widthInPt: pxToPt(1200),
            data: [
              {
                title: "Nom de l'établissement :",
                value: certificationAuthorityContactInfo.label,
              },
              {
                title: "Nom du contact :",
                value: certificationAuthorityContactInfo.contactName,
              },
              {
                title: "Adresse électronique :",
                value: certificationAuthorityContactInfo.contactEmail,
              },
              {
                title: "Téléphone :",
                value: certificationAuthorityContactInfo.contactPhone,
              },
            ],
            doc,
          });
        },
      });
    },
  });
};
