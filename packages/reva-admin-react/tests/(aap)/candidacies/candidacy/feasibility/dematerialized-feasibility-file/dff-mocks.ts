import { addMonths, format } from "date-fns";

import {
  CompetenceBlocsPartCompletion,
  DematerializedFeasibilityFile,
  DffEligibilityRequirement,
  DfFileAapDecision,
  DfFileCertificationAuthorityDecision,
  DffCertificationCompetenceBloc,
  CertificationCompetenceBloc,
  Certification,
} from "@/graphql/generated/types";

export const DFF_FULL_ELIGIBILITY =
  "FULL_ELIGIBILITY_REQUIREMENT" as DffEligibilityRequirement;
export const DFF_PARTIAL_ELIGIBILITY =
  "PARTIAL_ELIGIBILITY_REQUIREMENT" as DffEligibilityRequirement;
export const DFF_BLOCS_COMPETENCES_COMPLETED =
  "COMPLETED" as CompetenceBlocsPartCompletion;
export const DFF_AAP_DECISION_FAVORABLE = "FAVORABLE" as DfFileAapDecision;
export const DFF_AAP_DECISION_UNFAVORABLE = "UNFAVORABLE" as DfFileAapDecision;
export const DATE_NOW = new Date().getTime();
export const DFF_CERTIFICATION_AUTHORITY_DECISION_ADMISSIBLE =
  "ADMISSIBLE" as DfFileCertificationAuthorityDecision;
export const DFF_CERTIFICATION_AUTHORITY_DECISION_INCOMPLETE =
  "INCOMPLETE" as DfFileCertificationAuthorityDecision;
export const DFF_CERTIFICATION_AUTHORITY_DECISION_REJECTED =
  "REJECTED" as DfFileCertificationAuthorityDecision;

export const DEFAULT_BLOCS_COMPETENCES = [
  {
    complete: false,
    certificationCompetenceBloc: {
      id: "fe2aa5ab-6989-43c7-8332-b57f48511f3c",
      code: "RNCP37780BC01",
      label:
        "Gestion de son activité professionnelle auprès de particuliers employeurs",
      certification: {
        id: "cert-id",
        label:
          "Titre à finalité professionnelle Assistant de vie dépendance (ADVD)",
        codeRncp: "37780",
      } as unknown as { id: string; label: string; codeRncp: string },
      competences: [
        {
          id: "3040f14e-2f6a-4e66-8b91-3f6e70391839",
          label:
            "Construire son activité professionnelle en toute autonomie dans le secteur spécifique de l'emploi entre particuliers en recherchant des particuliers employeurs avec des outils de communication adaptés, en conduisant des entretiens d'embauche, et en négociant ses contrats de travail pour maintenir son employabilité",
        },
        {
          id: "7e1d726d-9e7e-4c54-a878-cab165920be5",
          label:
            "Consolider son activité professionnelle en toute autonomie auprès des particuliers employeurs en veillant aux évolutions des métiers du secteur et en utilisant ses droits à la formation tout au long de la vie afin de maintenir son employabilité et d'affirmer son identité professionnelle",
        },
        {
          id: "74e4e8c3-fdfd-4fa8-8fe0-f0b6a1dcbdb2",
          label:
            "Maintenir les relations de travail favorables avec les particuliers employeurs en s'appuyant sur les droits et les devoirs respectifs du salarié et des particuliers employeurs afin de développer la relation de confiance",
        },
        {
          id: "aa2d6cd2-5fad-4e63-af3e-97c3efd1bb69",
          label:
            "Adapter la proposition de son intervention aux évolutions de situations afin de répondre aux besoins et attentes des particuliers employeurs",
        },
      ],
    },
  },
];

export const DEFAULT_BLOCS_COMPETENCES_COMPLETED = [
  { ...DEFAULT_BLOCS_COMPETENCES[0], complete: true },
];

export const DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE: Partial<DematerializedFeasibilityFile> =
  {
    swornStatementFileId: null,
    isReadyToBeSentToCandidate: false,
    isReadyToBeSentToCertificationAuthority: false,
    sentToCandidateAt: null,
    certificationPartComplete: false,
    competenceBlocsPartCompletion: "TO_COMPLETE",
    attachmentsPartComplete: false,
    prerequisitesPartComplete: false,
    firstForeignLanguage: null,
    secondForeignLanguage: null,
    option: null,
    prerequisites: [],
    blocsDeCompetences: [] as Array<
      Partial<DffCertificationCompetenceBloc> & {
        certificationCompetenceBloc: Partial<CertificationCompetenceBloc> & {
          certification: Partial<Certification>;
        };
      } & {
        complete: boolean;
      }
    >,
    certificationCompetenceDetails: [],
    aapDecision: null,
    aapDecisionComment: null,
    candidateDecisionComment: null,
    attachments: [],
    eligibilityRequirement: null,
    eligibilityValidUntil: null,
    complementExperienceParcoursVise: null,
  };

export const DEFAULT_FEASIBILITY_FILE = {
  decision: "DRAFT",
  decisionSentAt: null as null | number,
  decisionComment: null as null | string,
  feasibilityFileSentAt: null as null | number,
  history: [],
  dematerializedFeasibilityFile: DEFAULT_DEMATERIALIZED_FEASIBILITY_FILE,
  certificationAuthority: {
    label: "Un certificateur",
    contactFullName: "Jane Doe",
    contactEmail: "janedoe@uncertificateur.fr",
    contactPhone: "0323456789",
  },
};

export const DF_FORMATED_DATE_6_MONTHS_FROM_NOW = format(
  addMonths(new Date(), 6),
  "yyyy-MM-dd",
);

export const DF_FORMATED_DATE_6_MONTHS_AGO = format(
  addMonths(new Date(), -6),
  "yyyy-MM-dd",
);

export const DF_CERTIFICATION = {
  label: "CAP Accompagnant éducatif petite enfance - AEPE",
  codeRncp: "38565",
  competenceBlocs: [
    {
      id: "4c06558e-8e3e-4559-882e-321607a6b4e1",
      code: "RNCP38565BC01",
      label: "Accompagner le développement du jeune enfant",
    },
    {
      id: "17aed396-0a61-40b4-8acc-f58f14fbccf6",
      code: "RNCP38565BC02",
      label: "Exercer son activité en accueil collectif",
    },
    {
      id: "0999cee6-651b-4595-95ee-23954d93c782",
      code: "RNCP38565BC03",
      label: "Exercer son activité en accueil individuel",
    },
    {
      id: "31af3506-c0e7-46ae-9482-8a4f50dffa61",
      code: "RNCP38565BC04",
      label: "Français et histoire-géographie-enseignement moral et civique",
    },
    {
      id: "6fc1fac7-8ad6-4487-bafd-8a56497c3061",
      code: "RNCP38565BC05",
      label: "Mathématiques et physique-chimie",
    },
    {
      id: "da87f1d6-3fef-421a-bf93-fb1cec1a0627",
      code: "RNCP38565BC06",
      label: "Éducation physique et sportive",
    },
    {
      id: "64b617c6-2b6f-49b9-8241-a120600c1618",
      code: "RNCP38565BC07",
      label: " Prévention-santé-environnement",
    },
    {
      id: "7a93b361-c5f9-4e32-8905-b713255611bb",
      code: "RNCP38565BC08",
      label: "Langue vivante (bloc facultatif)",
    },
    {
      id: "3852bb78-4a07-4624-8c6f-6d18b769fc12",
      code: "RNCP38565BC09",
      label: "Mobilité (bloc facultatif)",
    },
  ],
};
