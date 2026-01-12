import {
  BasicSkill,
  Candidate,
  Certification,
  CertificationAuthorityStructure,
  CertificationCompetence,
  CertificationCompetenceBloc,
  CompetenceBlocsPartCompletionEnum,
  Country,
  Degree,
  DematerializedFeasibilityFile,
  Department,
  DFFCertificationCompetenceBloc,
  DFFCertificationCompetenceDetails,
  DFFDecision,
  DFFEligibilityRequirement,
  DFFPrerequisite,
  Experience,
  Gender,
  Goal,
  Training,
} from "@prisma/client";
import PDFDocument from "pdfkit";

import { formatDateWithoutTimestamp } from "@/modules/shared/date/formatDateWithoutTimestamp";
import { prismaClient } from "@/prisma/client";

export const generateFeasibilityFileByCandidacyId = async (
  candidacyId: string,
): Promise<Buffer | undefined> => {
  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
    include: {
      candidate: {
        include: {
          birthDepartment: true,
          country: true,
          niveauDeFormationLePlusEleve: true,
          highestDegree: true,
        },
      },
      certification: {
        include: {
          certificationAuthorityStructure: true,
        },
      },
      Feasibility: {
        where: {
          isActive: true,
        },
        include: {
          certificationAuthority: true,
          feasibilityUploadedPdf: true,
          dematerializedFeasibilityFile: {
            include: {
              dffCertificationCompetenceBlocs: {
                orderBy: {
                  certificationCompetenceBloc: {
                    code: "asc",
                  },
                },
                include: {
                  certificationCompetenceBloc: {
                    include: {
                      competences: {
                        orderBy: {
                          index: "asc",
                        },
                      },
                    },
                  },
                },
              },
              dffCertificationCompetenceDetails: true,
              prerequisites: true,
            },
          },
        },
      },
      experiences: {
        orderBy: {
          startedAt: "desc",
        },
      },
      basicSkills: {
        include: {
          basicSkill: true,
        },
      },
      trainings: {
        include: {
          training: true,
        },
      },
      goals: {
        include: {
          goal: true,
        },
        orderBy: {
          goal: {
            order: "asc",
          },
        },
      },
    },
  });

  if (!candidacy) {
    throw new Error("Candidature non trouvée");
  }

  const feasibility = candidacy.Feasibility[0];
  if (!feasibility) {
    throw new Error("Dossier de faisabilité non trouvé");
  }

  const { dematerializedFeasibilityFile } = feasibility;
  if (!dematerializedFeasibilityFile) {
    throw new Error("Dossier de faisabilité dématérialisé non trouvé");
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

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "portrait",
      autoFirstPage: true,
      bufferPages: false,
      compress: true,
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
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

    if (dematerializedFeasibilityFile.eligibilityRequirement) {
      addCandidacyAdmissibility(
        doc,
        dematerializedFeasibilityFile.eligibilityRequirement,
        dematerializedFeasibilityFile.eligibilityValidUntil,
      );
    }

    const { certification } = candidacy;

    if (certification) {
      addCertification(doc, {
        certification,
        dematerializedFeasibilityFile,
        isCertificationPartial: candidacy.isCertificationPartial,
        certificationAuthorityStructure:
          certification.certificationAuthorityStructure,
      });
    }

    const { candidate } = candidacy;

    if (candidate) {
      addCandidate(doc, { candidate });
    }

    const { goals } = candidacy;

    if (goals.length > 0) {
      addGoals(doc, { goals: goals.map(({ goal }) => goal) });
    }

    const { experiences } = candidacy;

    if (experiences.length > 0) {
      addExperiences(doc, { experiences });
    }

    addCompetenciesBlocs(doc, { dematerializedFeasibilityFile });

    const {
      basicSkills,
      trainings,
      additionalHourCount,
      individualHourCount,
      collectiveHourCount,
    } = candidacy;

    const sortedBasicSkills = [...basicSkills]
      .map(({ basicSkill }) => basicSkill)
      .sort((first, second) =>
        first.label.localeCompare(second.label, "fr", {
          sensitivity: "base",
        }),
      );

    const sortedTrainings = [...trainings]
      .map(({ training }) => training)
      .sort((first, second) =>
        first.label.localeCompare(second.label, "fr", {
          sensitivity: "base",
        }),
      );

    addTraining(doc, {
      basicSkills: sortedBasicSkills,
      trainings: sortedTrainings,
      additionalHourCount,
      individualHourCount,
      collectiveHourCount,
    });

    if (dematerializedFeasibilityFile.aapDecision) {
      addDecision(doc, {
        aapDecision: dematerializedFeasibilityFile.aapDecision,
        aapDecisionComment: dematerializedFeasibilityFile.aapDecisionComment,
      });
    }

    // Finalize PDF file
    doc.end();
  });
};

const addDocumentHeader = (doc: PDFKit.PDFDocument) => {
  doc.image("assets/images/republique-francaise.png", doc.x, doc.y, {
    fit: [117, 106],
  });

  doc.image("assets/images/france-vae.png", doc.x + 339, doc.y + 6, {
    fit: [178, 94],
  });

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(30)
    .fillColor("#161616")
    .text("Dossier de faisabilité", doc.x, doc.y + 20 + 106, { align: "left" });
};

const addCandidacyAdmissibility = (
  doc: PDFKit.PDFDocument,
  eligibilityRequirement: DFFEligibilityRequirement,
  eligibilityValidUntil: Date | null,
) => {
  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(14)
    .fillColor("#161616")
    .text("Recevabilité du candidat", doc.x + 24, doc.y + 20, {
      align: "left",
    });

  doc.image("assets/images/folder-check-fill.png", doc.x - 24, doc.y - 20, {
    fit: [20, 20],
  });

  if (
    eligibilityRequirement ==
    DFFEligibilityRequirement.FULL_ELIGIBILITY_REQUIREMENT
  ) {
    doc
      .font("assets/fonts/Marianne/Marianne-Bold.otf")
      .fontSize(10)
      .table({
        position: { x: doc.x - 24, y: doc.y + 10 },
        columnStyles: [255],
        data: [
          [
            {
              border: 0,
              backgroundColor: "#e8edff",
              textColor: "#0063cb",
              text: "      ACCÈS AU DOSSIER DE FAISABILITÉ INTÉGRAL",
              // align: "center",
            },
          ],
        ],
      });

    doc.image("assets/images/info-fill.png", doc.x + 4, doc.y - 15, {
      fit: [12, 12],
    });
  } else if (
    eligibilityRequirement ==
    DFFEligibilityRequirement.PARTIAL_ELIGIBILITY_REQUIREMENT
  ) {
    doc
      .font("assets/fonts/Marianne/Marianne-Bold.otf")
      .fontSize(10)
      .table({
        position: { x: doc.x - 24, y: doc.y + 10 },
        columnStyles: [243],
        data: [
          [
            {
              border: 0,
              backgroundColor: "#feebd0",
              textColor: "#695240",
              text: "      ACCÈS AU DOSSIER DE FAISABILITÉ ADAPTÉ",
              // align: "center",
            },
          ],
        ],
      });

    doc.image("assets/images/flashlight-fill.png", doc.x + 4, doc.y - 15, {
      fit: [12, 12],
    });
  }

  if (eligibilityValidUntil) {
    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`Date de fin de validité`, doc.x, doc.y + 10, {
        align: "left",
      });

    doc
      .font("assets/fonts/Marianne/Marianne-Bold.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(formatDateWithoutTimestamp(eligibilityValidUntil), {
        align: "left",
      });

    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(12)
      .table({
        position: { x: doc.x, y: doc.y + 10 },
        data: [
          [
            {
              border: [false, false, false, true],
              borderColor: "#6a6af4",
              backgroundColor: "#eeeeee",
              padding: { vertical: "16px", horizontal: "24px" },
              text: "Le candidat s'engage à respecter le délai de fin de validité de la recevabilité",
            },
          ],
        ],
      });
  }
};

function getGenderPrefix(gender: Gender) {
  switch (gender) {
    case Gender.man:
      return "M.";
    case Gender.woman:
      return "Mme";
    case Gender.undisclosed:
      return "";
  }
}

function getGenderBornLabel(gender: Gender) {
  switch (gender) {
    case Gender.man:
      return "Né";
    case Gender.woman:
      return "Née";
    case Gender.undisclosed:
      return "Né";
  }
}

const addCandidate = (
  doc: PDFKit.PDFDocument,
  params: {
    candidate: Candidate & {
      birthDepartment: Department | null;
      country: Country | null;
      niveauDeFormationLePlusEleve: Degree | null;
      highestDegree: Degree | null;
    };
  },
) => {
  const { candidate } = params;

  const {
    firstname,
    lastname,
    email,
    gender,
    firstname2,
    firstname3,
    givenName,
    birthdate,
    birthCity,
    birthDepartment,
    country,
    nationality,
    phone,
    street,
    zip,
    city,
    niveauDeFormationLePlusEleve,
    highestDegree,
    highestDegreeLabel,
  } = candidate;

  const genderLabel = gender ? getGenderPrefix(gender) : "";

  let nameLabel = "";

  if (genderLabel) {
    nameLabel = `${genderLabel} `;
  }

  nameLabel = `${nameLabel}${givenName ? givenName : lastname} ${firstname}`;

  if (firstname2) {
    nameLabel = `${nameLabel}, ${firstname2}`;
  }

  if (firstname3) {
    nameLabel = `${nameLabel}, ${firstname3}`;
  }

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(14)
    .fillColor("#161616")
    .text(nameLabel, doc.x + 24, doc.y + 20, { align: "left" });

  doc.image("assets/images/user-fill.png", doc.x - 24, doc.y - 20, {
    fit: [20, 20],
  });

  const bornLabel = gender ? getGenderBornLabel(gender) : "";
  const isFrance = country ? country?.label == "France" : false;

  let birthLabel = "";

  if (givenName) {
    birthLabel = `${bornLabel} ${lastname}, `;
  }

  if (birthdate) {
    const formattedBirthdate = formatDateWithoutTimestamp(birthdate);

    birthLabel = `${birthLabel}le : ${formattedBirthdate} `;
  }

  birthLabel = `${birthLabel}à ${birthCity}`;

  if (country && isFrance && birthDepartment) {
    birthLabel = `${birthLabel}${birthCity ? ", " : ""}${birthDepartment.label} (${birthDepartment.code}) `;
  }

  if (country && !isFrance) {
    birthLabel = `${birthLabel}${birthCity ? ", " : ""}${country.label}`;
  }

  doc
    .font("assets/fonts/Marianne/Marianne-Regular.otf")
    .fontSize(10)
    .fillColor("#3a3a3a")
    .text(birthLabel, doc.x - 24, doc.y, {
      align: "left",
    });

  if (nationality) {
    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`Nationalité ${nationality}`, {
        align: "left",
      });
  }

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(14)
    .fillColor("#161616")
    .text("Contact", doc.x, doc.y + 20, { align: "left" });

  doc
    .font("assets/fonts/Marianne/Marianne-Regular.otf")
    .fontSize(10)
    .fillColor("#3a3a3a")
    .text(`Adresse postale : ${street} ${zip} ${city}`, {
      align: "left",
    });

  doc
    .font("assets/fonts/Marianne/Marianne-Regular.otf")
    .fontSize(10)
    .fillColor("#3a3a3a")
    .text(`Adresse électronique : ${email}`, {
      align: "left",
    });

  doc
    .font("assets/fonts/Marianne/Marianne-Regular.otf")
    .fontSize(10)
    .fillColor("#3a3a3a")
    .text(`Téléphone : ${phone}`, {
      align: "left",
    });

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(14)
    .fillColor("#161616")
    .text("Niveau de formation", doc.x, doc.y + 20, { align: "left" });

  doc
    .font("assets/fonts/Marianne/Marianne-Regular.otf")
    .fontSize(10)
    .fillColor("#3a3a3a")
    .text(`Niveau de formation le plus élevé`, {
      align: "left",
    });

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(10)
    .fillColor("#3a3a3a")
    .text(`${niveauDeFormationLePlusEleve?.level || "Inconnu"}`, {
      align: "left",
    });

  doc
    .font("assets/fonts/Marianne/Marianne-Regular.otf")
    .fontSize(10)
    .fillColor("#3a3a3a")
    .text(`Niveau de la certification obtenue la plus élevée`, {
      align: "left",
    });

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(10)
    .fillColor("#3a3a3a")
    .text(`${highestDegree?.level || "Inconnu"}`, {
      align: "left",
    });

  if (highestDegreeLabel) {
    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`Intitulé de la certification la plus élevée obtenue`, {
        align: "left",
      });

    doc
      .font("assets/fonts/Marianne/Marianne-Bold.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`${highestDegreeLabel}`, {
        align: "left",
      });
  }
};

type CompetenceBloc = DFFCertificationCompetenceBloc & {
  certificationCompetenceBloc: CertificationCompetenceBloc & {
    competences: CertificationCompetence[];
  };
};

const addCertification = (
  doc: PDFKit.PDFDocument,
  params: {
    certification: Certification;
    dematerializedFeasibilityFile: DematerializedFeasibilityFile & {
      dffCertificationCompetenceBlocs: CompetenceBloc[];
      dffCertificationCompetenceDetails: DFFCertificationCompetenceDetails[];
      prerequisites: DFFPrerequisite[];
    };
    isCertificationPartial: boolean | null;
    certificationAuthorityStructure: CertificationAuthorityStructure | null;
  },
) => {
  const {
    certification,
    dematerializedFeasibilityFile,
    isCertificationPartial,
    certificationAuthorityStructure,
  } = params;

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(22)
    .fillColor("#161616")
    .text("Certification visée", doc.x + 24, doc.y + 20, { align: "left" });

  doc.image("assets/images/award-fill.png", doc.x - 24, doc.y - 23, {
    fit: [20, 20],
  });

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(14)
    .fillColor("#161616")
    .text(`${certification.label}`, doc.x - 24, doc.y + 20, { align: "left" });

  doc
    .font("assets/fonts/Marianne/Marianne-Light.otf")
    .fontSize(10)
    .fillColor("#666666")
    .text(`RNCP ${certification.rncpId}`, { align: "left" });

  if (certificationAuthorityStructure) {
    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text("Certificateur :", doc.x, doc.y + 10, {
        align: "left",
      });

    doc
      .font("assets/fonts/Marianne/Marianne-Bold.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(certificationAuthorityStructure.label, {
        align: "left",
      });
  }

  if (dematerializedFeasibilityFile.option) {
    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`Option ou parcours :`, doc.x, doc.y + 10, {
        align: "left",
      });

    doc
      .font("assets/fonts/Marianne/Marianne-Bold.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`${dematerializedFeasibilityFile.option}`, {
        align: "left",
      });
  }

  if (dematerializedFeasibilityFile.firstForeignLanguage) {
    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`Langue vivante 1 :`, doc.x, doc.y + 10, {
        align: "left",
      });

    doc
      .font("assets/fonts/Marianne/Marianne-Bold.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`${dematerializedFeasibilityFile.firstForeignLanguage}`, {
        align: "left",
      });
  }

  if (dematerializedFeasibilityFile.secondForeignLanguage) {
    const docX = dematerializedFeasibilityFile.firstForeignLanguage
      ? doc.x + 240
      : doc.x;
    const docY = dematerializedFeasibilityFile.firstForeignLanguage
      ? doc.y - 38
      : doc.y + 10;

    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`Langue vivante 2 :`, docX, docY + 10, {
        align: "left",
      });

    doc
      .font("assets/fonts/Marianne/Marianne-Bold.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`${dematerializedFeasibilityFile.secondForeignLanguage}`, {
        align: "left",
      });
  }

  const isCertificationPartialLabel = isCertificationPartial
    ? "Un ou plusieurs bloc(s) de compétences de la certification"
    : "La certification dans sa totalité";

  doc
    .font("assets/fonts/Marianne/Marianne-Regular.otf")
    .fontSize(12)
    .table({
      position: {
        x:
          dematerializedFeasibilityFile.firstForeignLanguage &&
          dematerializedFeasibilityFile.secondForeignLanguage
            ? 40
            : doc.x,
        y: doc.y + 10,
      },
      data: [
        [
          {
            border: [false, false, false, true],
            borderColor: "#6a6af4",
            backgroundColor: "#eeeeee",
            padding: { vertical: "16px", horizontal: "24px" },
            text: isCertificationPartialLabel,
          },
        ],
      ],
    });

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(14)
    .fillColor("#161616")
    .text("Prérequis obligatoires", doc.x, doc.y + 20, { align: "left" });

  if (dematerializedFeasibilityFile.prerequisites.length == 0) {
    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`Il n'y a pas de prérequis obligatoires pour cette certification`, {
        align: "left",
      });
  } else {
    const acquired = dematerializedFeasibilityFile.prerequisites.filter(
      (p) => p.state == "ACQUIRED",
    );
    const inProgress = dematerializedFeasibilityFile.prerequisites.filter(
      (p) => p.state == "IN_PROGRESS",
    );

    if (acquired.length > 0) {
      doc
        .font("assets/fonts/Marianne/Marianne-Medium.otf")
        .fontSize(10)
        .table({
          position: { x: doc.x, y: doc.y + 20 },
          data: [
            [
              {
                border: 0,
                backgroundColor: "#e3e3fd",
                textColor: "#000091",
                padding: { vertical: "16px", horizontal: "24px" },
                text: "Acquis",
              },
            ],
          ],
        });

      for (let index = 0; index < acquired.length; index++) {
        const prerequisite = acquired[index];

        doc
          .font("assets/fonts/Marianne/Marianne-Regular.otf")
          .fontSize(10)
          .fillColor("#3a3a3a")
          .text(
            `${prerequisite.label.replace(/(\r\n|\n|\r)/gm, "")}`,
            doc.x,
            doc.y + 10,
            {
              align: "left",
            },
          );
      }
    }

    if (inProgress.length > 0) {
      doc
        .font("assets/fonts/Marianne/Marianne-Medium.otf")
        .fontSize(10)
        .table({
          position: { x: doc.x, y: doc.y + 20 },
          data: [
            [
              {
                border: 0,
                backgroundColor: "#e3e3fd",
                textColor: "#000091",
                padding: { vertical: "16px", horizontal: "24px" },
                text: "En cours",
              },
            ],
          ],
        });

      for (let index = 0; index < inProgress.length; index++) {
        const prerequisite = inProgress[index];

        doc
          .font("assets/fonts/Marianne/Marianne-Regular.otf")
          .fontSize(10)
          .fillColor("#3a3a3a")
          .text(
            `${prerequisite.label.replace(/(\r\n|\n|\r)/gm, "")}`,
            doc.x,
            doc.y + 10,
            {
              align: "left",
            },
          );
      }
    }
  }
};

const durationLabel = {
  betweenOneAndThreeYears: "entre 1 et 3 ans",
  lessThanOneYear: "moins de 1 an",
  moreThanFiveYears: "plus de 5 ans",
  moreThanTenYears: "plus de 10 ans",
  moreThanThreeYears: "plus de 3 ans",
  unknown: "inconnue",
};

const addExperiences = (
  doc: PDFKit.PDFDocument,
  params: { experiences: Experience[] },
) => {
  const { experiences } = params;

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(22)
    .fillColor("#161616")
    .text("Expériences professionnelles", doc.x + 28, doc.y + 20, {
      align: "left",
    });

  doc.image("assets/images/briefcase-fill.png", doc.x - 28, doc.y - 23, {
    fit: [20, 20],
  });

  for (let index = 0; index < experiences.length; index++) {
    const experience = experiences[index];

    const docX = index == 0 ? -28 : 0;

    doc
      .font("assets/fonts/Marianne/Marianne-Medium.otf")
      .fontSize(10)
      .table({
        position: { x: doc.x + docX, y: doc.y + 20 },
        data: [
          [
            {
              border: 0,
              backgroundColor: "#e3e3fd",
              textColor: "#000091",
              padding: { vertical: "16px", horizontal: "24px" },
              text: `Expérience ${index + 1} - ${experience.title}`,
            },
          ],
        ],
      });

    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(
        `Démarrée le ${formatDateWithoutTimestamp(experience.startedAt, "dd MMMM yyyy")}`,
        doc.x,
        doc.y + 10,
        {
          align: "left",
        },
      );

    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`Expérience ${durationLabel[experience?.duration]}`, {
        align: "left",
      });

    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`${experience?.description}`, {
        align: "left",
      });
  }
};

const addCompetenciesBlocs = (
  doc: PDFKit.PDFDocument,
  params: {
    dematerializedFeasibilityFile: DematerializedFeasibilityFile & {
      dffCertificationCompetenceBlocs: CompetenceBloc[];
      dffCertificationCompetenceDetails: DFFCertificationCompetenceDetails[];
    };
  },
) => {
  const { dematerializedFeasibilityFile } = params;

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(14)
    .fillColor("#161616")
    .text("Blocs de compétences", doc.x, doc.y + 20, { align: "left" });

  const competenceBlocs =
    dematerializedFeasibilityFile.dffCertificationCompetenceBlocs;

  for (let indexBloc = 0; indexBloc < competenceBlocs.length; indexBloc++) {
    const competenceBloc = competenceBlocs[indexBloc];

    doc
      .font("assets/fonts/Marianne/Marianne-Medium.otf")
      .fontSize(10)
      .table({
        position: { x: doc.x, y: doc.y + 20 },
        data: [
          [
            {
              border: 0,
              backgroundColor: "#e3e3fd",
              textColor: "#000091",
              padding: { vertical: "16px", horizontal: "24px" },
              text: `${competenceBloc.certificationCompetenceBloc.code} - ${competenceBloc.certificationCompetenceBloc.label}`,
            },
          ],
        ],
      });

    const competences = competenceBloc.certificationCompetenceBloc.competences;

    for (
      let indexCompetence = 0;
      indexCompetence < competences.length;
      indexCompetence++
    ) {
      const competence = competences[indexCompetence];

      const state =
        dematerializedFeasibilityFile.dffCertificationCompetenceDetails.find(
          (detail) => detail.certificationCompetenceId == competence.id,
        )?.state || "TO_COMPLETE";

      if (state == "YES") {
        doc
          .font("assets/fonts/Marianne/Marianne-Bold.otf")
          .fontSize(10)
          .table({
            position: { x: doc.x, y: doc.y + 20 },
            columnStyles: [30],
            data: [
              [
                {
                  border: 0,
                  backgroundColor: "#b8fec9",
                  textColor: "#18753c",
                  text: "OUI",
                  align: "center",
                },
              ],
            ],
          });
      } else if (state == "NO") {
        doc
          .font("assets/fonts/Marianne/Marianne-Bold.otf")
          .fontSize(10)
          .table({
            position: { x: doc.x, y: doc.y + 20 },
            columnStyles: [36],
            data: [
              [
                {
                  border: 0,
                  backgroundColor: "#ffe9e9",
                  textColor: "#ce0500",
                  text: "NON",
                  align: "center",
                },
              ],
            ],
          });
      } else if (state == "PARTIALLY") {
        doc
          .font("assets/fonts/Marianne/Marianne-Bold.otf")
          .fontSize(10)
          .table({
            position: { x: doc.x, y: doc.y + 20 },
            columnStyles: [92],
            data: [
              [
                {
                  border: 0,
                  backgroundColor: "#feebd0",
                  textColor: "#695240",
                  text: "PARTIELLEMENT",
                  align: "center",
                },
              ],
            ],
          });
      } else if (state == "TO_COMPLETE") {
        doc
          .font("assets/fonts/Marianne/Marianne-Bold.otf")
          .fontSize(10)
          .table({
            position: { x: doc.x, y: doc.y + 20 },
            columnStyles: [30],
            data: [
              [
                {
                  border: 0,
                  backgroundColor: "#ffe9e6",
                  textColor: "#b34000",
                  text: "À COMPLÉTER",
                  align: "center",
                },
              ],
            ],
          });
      }

      doc
        .font("assets/fonts/Marianne/Marianne-Bold.otf")
        .fontSize(10)
        .fillColor("#161616")
        .text(`${competence.label.replace(/(\r\n|\n|\r)/gm, "")}`, {
          align: "left",
        });
    }

    if (competenceBloc.text) {
      doc
        .font("assets/fonts/Marianne/Marianne-Regular.otf")
        .fontSize(10)
        .fillColor("#3a3a3a")
        .text(`${competenceBloc.text}`, doc.x, doc.y + 20, {
          align: "left",
        });
    }
  }
};

const addTraining = (
  doc: PDFKit.PDFDocument,
  params: {
    basicSkills: BasicSkill[];
    trainings: Training[];
    additionalHourCount: number | null;
    individualHourCount: number | null;
    collectiveHourCount: number | null;
  },
) => {
  const {
    basicSkills,
    trainings,
    additionalHourCount,
    individualHourCount,
    collectiveHourCount,
  } = params;

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(22)
    .fillColor("#161616")
    .text("Parcours envisagé", doc.x + 28, doc.y + 20, { align: "left" });

  doc.image("assets/images/time-fill.png", doc.x - 28, doc.y - 23, {
    fit: [20, 20],
  });

  doc
    .font("assets/fonts/Marianne/Marianne-Regular.otf")
    .fontSize(10)
    .fillColor("#3a3a3a")
    .text(
      `Accompagnement individuel : ${individualHourCount || 0}h`,
      doc.x - 28,
      doc.y,
      {
        align: "left",
      },
    );

  doc
    .font("assets/fonts/Marianne/Marianne-Regular.otf")
    .fontSize(10)
    .fillColor("#3a3a3a")
    .text(`Accompagnement collectif : ${collectiveHourCount || 0}h`, {
      align: "left",
    });

  doc
    .font("assets/fonts/Marianne/Marianne-Regular.otf")
    .fontSize(10)
    .fillColor("#3a3a3a")
    .text(`Formation : ${additionalHourCount || 0}h`, {
      align: "left",
    });

  if (trainings.length > 0) {
    doc
      .font("assets/fonts/Marianne/Marianne-Bold.otf")
      .fontSize(14)
      .fillColor("#161616")
      .text("Formations obligatoires", doc.x, doc.y + 20, { align: "left" });

    for (let index = 0; index < trainings.length; index++) {
      const training = trainings[index];

      doc
        .font("assets/fonts/Marianne/Marianne-Regular.otf")
        .fontSize(10)
        .fillColor("#3a3a3a")
        .text(`${training.label}`, {
          align: "left",
        });
    }
  }

  if (basicSkills.length > 0) {
    doc
      .font("assets/fonts/Marianne/Marianne-Bold.otf")
      .fontSize(14)
      .fillColor("#161616")
      .text("Savoir de base", doc.x, doc.y + 20, { align: "left" });

    for (let index = 0; index < basicSkills.length; index++) {
      const basicSkill = basicSkills[index];

      doc
        .font("assets/fonts/Marianne/Marianne-Regular.otf")
        .fontSize(10)
        .fillColor("#3a3a3a")
        .text(`${basicSkill.label}`, {
          align: "left",
        });
    }
  }
};

const addGoals = (
  doc: PDFKit.PDFDocument,
  params: {
    goals: Goal[];
  },
) => {
  const { goals } = params;

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(22)
    .fillColor("#161616")
    .text("Objectifs poursuivis par le candidat", doc.x + 28, doc.y + 20, {
      align: "left",
    });

  doc.image("assets/images/focus-2-fill.png", doc.x - 28, doc.y - 23, {
    fit: [20, 20],
  });

  for (let index = 0; index < goals.length; index++) {
    const goal = goals[index];

    const docX = index == 0 ? -28 : 0;

    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`${goal.label}`, doc.x + docX, doc.y, {
        align: "left",
      });
  }
};

const addDecision = (
  doc: PDFKit.PDFDocument,
  params: {
    aapDecision: DFFDecision;
    aapDecisionComment: string | null;
  },
) => {
  const { aapDecision, aapDecisionComment } = params;

  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(22)
    .fillColor("#161616")
    .text("Avis de faisabilité", doc.x + 28, doc.y + 20, { align: "left" });

  doc.image("assets/images/thumb-up-fill.png", doc.x - 28, doc.y - 23, {
    fit: [20, 20],
  });

  if (aapDecision == "FAVORABLE") {
    doc
      .font("assets/fonts/Marianne/Marianne-Bold.otf")
      .fontSize(10)
      .table({
        position: { x: doc.x - 28, y: doc.y + 10 },
        columnStyles: [70],
        data: [
          [
            {
              border: 0,
              backgroundColor: "#b8fec9",
              textColor: "#18753c",
              text: "FAVORABLE",
              align: "center",
            },
          ],
        ],
      });
  } else if (aapDecision == "UNFAVORABLE") {
    doc
      .font("assets/fonts/Marianne/Marianne-Bold.otf")
      .fontSize(10)
      .table({
        position: { x: doc.x - 28, y: doc.y + 10 },
        columnStyles: [98],
        data: [
          [
            {
              border: 0,
              backgroundColor: "#fee7fc",
              textColor: "#6e445a",
              text: "NON FAVORABLE",
              align: "center",
            },
          ],
        ],
      });
  }

  if (aapDecisionComment) {
    doc
      .font("assets/fonts/Marianne/Marianne-Regular.otf")
      .fontSize(10)
      .fillColor("#3a3a3a")
      .text(`${aapDecisionComment}`, doc.x, doc.y + 10, {
        align: "left",
      });
  }
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
