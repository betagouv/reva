type NonConformityMotive = {
  key: string;
  group: string;
  label: string;
  message: string;
};

// Messages du référentiel métier, envoyés tels quels à la structure.
export const nonConformityMotives: NonConformityMotive[] = [
  {
    key: "SIRET_NON_CONCORDANT",
    group: "Précisions sur le SIRET et document URSSAF",
    label: "SIRET non concordant",
    message:
      "Le numéro SIRET indiqué sur l’attestation URSSAF ne correspond pas à celui renseigné sur la plateforme France VAE.",
  },
  {
    key: "ATTESTATION_SANS_CODE_DE_SECURITE",
    group: "Précisions sur le SIRET et document URSSAF",
    label: "Attestation sans code de sécurité",
    message:
      "L’attestation URSSAF ou MSA téléversée doit comporter un code de sécurité.",
  },
  {
    key: "ATTESTATION_EXPIREE",
    group: "Précisions sur le SIRET et document URSSAF",
    label: "Attestation expirée",
    message:
      "L’attestation URSSAF ou MSA est expirée. Merci de fournir une attestation en cours de validité.",
  },
  {
    key: "ATTESTATION_FISCALE",
    group: "Précisions sur le SIRET et document URSSAF",
    label: "Attestation fiscale",
    message:
      "Merci de transmettre une attestation de régularité fiscale des impôts en remplacement de l’attestation URSSAF ou MSA.",
  },
  {
    key: "PIECE_IDENTITE_INCOMPLETE_DIRIGEANT",
    group: "Identité",
    label: "Pièce d'identité incomplète dirigeant",
    message:
      "Merci de fournir le recto et le verso de la pièce d’identité du dirigeant.",
  },
  {
    key: "PIECE_IDENTITE_INCOMPLETE_DELEGATAIRE",
    group: "Identité",
    label: "Pièce d'identité incomplète délégataire",
    message:
      "Merci de fournir le recto et le verso de la pièce d’identité du délégataire.",
  },
  {
    key: "PIECE_IDENTITE_EXPIREE_DIRIGEANT",
    group: "Identité",
    label: "Pièce d'identité expirée dirigeant",
    message:
      "Le justificatif d’identité du dirigeant est expiré. Merci de transmettre un document en cours de validité.",
  },
  {
    key: "PIECE_IDENTITE_EXPIREE_DELEGATAIRE",
    group: "Identité",
    label: "Pièce d'identité expirée délégataire",
    message:
      "Le justificatif d’identité du délégataire est expiré. Merci de transmettre un document en cours de validité.",
  },
  {
    key: "PIECE_IDENTITE_ILLISIBLE_DIRIGEANT",
    group: "Identité",
    label: "Pièce d'identité illisible dirigeant",
    message:
      "La copie du justificatif d'identité du dirigeant doit être lisible, non tronquée et bien cadrée.",
  },
  {
    key: "PIECE_IDENTITE_ILLISIBLE_DELEGATAIRE",
    group: "Identité",
    label: "Pièce d'identité illisible délégataire",
    message:
      "La copie du justificatif d'identité du délégataire doit être lisible, non tronquée et bien cadrée.",
  },
  {
    key: "DIFFERENCE_IDENTITE_DIRIGEANT",
    group: "Identité",
    label: "Différence identité dirigeant",
    message:
      "Le nom figurant sur la pièce d'identité du dirigeant ne correspond pas au nom saisi sur la plateforme.",
  },
  {
    key: "DIFFERENCE_IDENTITE_DELEGATAIRE",
    group: "Identité",
    label: "Différence identité délégataire",
    message:
      "Le nom du délégataire saisi sur la plateforme ne correspond pas au nom sur la lettre de délégation et/ou l'adresse adresse e-mail renseignée.",
  },
  {
    key: "ABSENCE_DE_RETOUR",
    group: "Procédure et Inscription",
    label: "Absence de retour",
    message:
      "Absence de retour en dépit des différentes sollicitations de France VAE. Vous pouvez déposer une nouvelle demande d'inscription.",
  },
  {
    key: "INSCRIPTION_REJETEE",
    group: "Procédure et Inscription",
    label: "Inscription rejetée",
    message:
      "Merci de redéposer une nouvelle demande d’inscription avec les documents requis. Vous n’avez pas besoin de remplir à nouveau le questionnaire.",
  },
  {
    key: "EMAIL_DEJA_UTILISE",
    group: "Procédure et Inscription",
    label: "E-mail déjà utilisé",
    message:
      "La nouvelle adresse électronique de connexion renseignée est déjà utilisée sur la plateforme.",
  },
];

// Motifs cochés, dans l'ordre du référentiel: c'est celui du courriel et de la
// prévisualisation du commentaire généré.
export const getNonConformityMotives = (motiveKeys: string[]) =>
  nonConformityMotives
    .filter(({ key }) => motiveKeys.includes(key))
    .map(({ label, message }) => ({ label, message }));

export const getNonConformityMessages = (motiveKeys: string[]) =>
  getNonConformityMotives(motiveKeys).map(({ message }) => message);
