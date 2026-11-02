import {
  Certification,
  CertificationCompetence,
  CertificationCompetenceBloc,
} from "@/graphql/generated/graphql";

export type CertificationEntity = Partial<
  Omit<Certification, "competenceBlocs" | "competences">
> & {
  competenceBlocs?: Partial<
    Omit<CertificationCompetenceBloc, "certification" | "competences">
  >[];
  competences?: Partial<CertificationCompetence>[];
};

export const createCertificationEntity = (
  options: CertificationEntity = {},
) => {
  const certification: CertificationEntity = {
    id: options.id || "cert-1",
    label: options.label || "Certification Label",
    codeRncp: options.codeRncp || "RNCP0000",
    availableAt: new Date().getTime(),
    certificationAuthorities: [],
    competenceBlocs: options.competenceBlocs || [],
    conventionsCollectives: [],
    status: "VALIDE_PAR_CERTIFICATEUR",
    visible: true,
    typeDiplome: "Titre 2",
    degree: {
      id: "degree-1",
      code: "degree-1",
      label: "Degree 1",
      level: 1,
      longLabel: "Degree 1",
    },
    domains: [],
    rncpExpiresAt: new Date().getTime(),
    isAapAvailable: true,
    level: 1,
    prerequisites: [],
    parcoursByCertificationAuthorities: [],
    parcours: {
      rows: [],
      info: {
        currentPage: 1,
        pageLength: 10,
        totalPages: 1,
        totalRows: 0,
      },
    },
    ...options,
  };

  return certification;
};
