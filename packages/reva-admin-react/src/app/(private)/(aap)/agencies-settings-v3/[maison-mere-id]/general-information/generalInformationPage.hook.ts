import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth";
import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import {
  sanitizedEmail,
  sanitizedPhone,
  sanitizedSiret,
  sanitizedText,
} from "@/utils/input-sanitization";

import { graphql } from "@/graphql/generated";
import {
  GetEtablissementForAgenciesSettingsQuery,
  LegalStatus,
  MaisonMereAap,
  UpdateMaisonMereLegalInformationInput,
} from "@/graphql/generated/graphql";

const generalInformationQueries = graphql(`
  query getAccountMaisonMereGeneralInformation {
    account_getAccountForConnectedUser {
      maisonMereAAP {
        id
        siret
        phone
        managerFirstname
        managerLastname
        statutValidationInformationsJuridiquesMaisonMereAAP
        typologie
        legalInformationDocumentsDecisions {
          id
          decision
          aapComment
          decisionTakenAt
        }
        legalInformationDocuments {
          createdAt
          managerFirstname
          managerLastname
          siret
          raisonSociale
          statutJuridique
          gestionnaireFirstname
          gestionnaireLastname
          gestionnaireEmail
          phone
        }
        gestionnaire {
          firstname
          lastname
          email
        }
      }
    }
  }
`);

const getEtablissementQuery = graphql(`
  query getEtablissementForAgenciesSettings($siret: ID!) {
    getEtablissement(siret: $siret) {
      siret
      raisonSociale
      formeJuridique {
        code
        libelle
        legalStatus
      }
      siegeSocial
      dateFermeture
      qualiopiStatus
    }
  }
`);

const getMaisonMereAAPGeneralInformationAdminQuery = graphql(`
  query getMaisonMereAAPGeneralInformationAdmin($maisonMereAAPId: ID!) {
    organism_getMaisonMereAAPById(maisonMereAAPId: $maisonMereAAPId) {
      id
      siret
      raisonSociale
      phone
      managerFirstname
      managerLastname
      statutValidationInformationsJuridiquesMaisonMereAAP
      typologie
      legalInformationDocumentsDecisions {
        id
        decision
        aapComment
        decisionTakenAt
      }
      legalInformationDocuments {
        createdAt
        managerFirstname
        managerLastname
        siret
        raisonSociale
        statutJuridique
        gestionnaireFirstname
        gestionnaireLastname
        gestionnaireEmail
        phone
      }
      gestionnaire {
        firstname
        lastname
        email
      }
      organisms {
        modaliteAccompagnement
        accounts {
          id
        }
        remoteZones
      }
    }
  }
`);

const updateMaisonMereLegalInformationMutation = graphql(`
  mutation updateMaisonMereLegalInformation(
    $data: UpdateMaisonMereLegalInformationInput!
  ) {
    organism_updateMaisonMereLegalInformation(data: $data)
  }
`);

export const generalInformationSchema = z.object({
  siret: sanitizedSiret(),
  managerFirstname: sanitizedText(),
  managerLastname: sanitizedText(),
  gestionnaireFirstname: sanitizedText(),
  gestionnaireLastname: sanitizedText(),
  gestionnaireEmail: sanitizedEmail(),
  phone: sanitizedPhone(),
  gestionBranch: z.boolean(),
});

export type GeneralInformationFormValues = z.infer<
  typeof generalInformationSchema
>;

export type Etablissement =
  GetEtablissementForAgenciesSettingsQuery["getEtablissement"];

// Lève une erreur dont le message est destiné au champ SIRET.
export const buildLegalInformationPayload = ({
  data,
  etablissement,
  maisonMereAAPId,
  currentSiret,
}: {
  data: GeneralInformationFormValues;
  etablissement: Etablissement;
  maisonMereAAPId: string;
  currentSiret?: string | null;
}): UpdateMaisonMereLegalInformationInput => {
  if (!etablissement) {
    throw new Error(
      "Le numéro est peut-être erroné. Saisissez-le à nouveau et contactez l'AAP si cela ne fonctionne toujours pas.",
    );
  }

  // Contrôles limités au changement de SIRET: sinon une structure fermée ou
  // Qualiopi expiré ne pourrait plus corriger son téléphone ni son email.
  if (data.siret !== currentSiret) {
    if (etablissement.dateFermeture) {
      throw new Error("L'établissement est fermé");
    }

    if (!etablissement.qualiopiStatus) {
      throw new Error("L'établissement n'est pas certifié Qualiopi");
    }
  }

  return {
    maisonMereAAPId,
    siret: data.siret,
    statutJuridique: etablissement.formeJuridique.legalStatus as LegalStatus,
    raisonSociale: etablissement.raisonSociale,
    managerFirstname: data.managerFirstname,
    managerLastname: data.managerLastname,
    gestionnaireFirstname: data.gestionnaireFirstname,
    gestionnaireLastname: data.gestionnaireLastname,
    gestionnaireEmail: data.gestionnaireEmail,
    phone: data.phone,
    gestionBranch: data.gestionBranch,
  };
};

export const useGeneralInformationPage = () => {
  const { graphqlClient } = useGraphQlClient();
  const queryClient = useQueryClient();
  const { "maison-mere-id": maisonMereAAPId } = useParams<{
    "maison-mere-id": string;
  }>();
  const { isGestionnaireMaisonMereAAP, isAdmin } = useAuth();

  const { mutateAsync: updateMaisonMereLegalInformation } = useMutation({
    mutationFn: (data: UpdateMaisonMereLegalInformationInput) =>
      graphqlClient.request(updateMaisonMereLegalInformationMutation, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [maisonMereAAPId] });
    },
  });

  const {
    data: generalInformationsResponse,
    status: generalInformationsStatus,
  } = useQuery({
    queryKey: [maisonMereAAPId, "maisonMereAAP", "GeneralInformationPage"],
    queryFn: () => graphqlClient.request(generalInformationQueries),
    enabled: !isAdmin,
  });

  const {
    data: maisonMereAAPGeneralInformationResponse,
    status: maisonMereAAPGeneralInformationStatus,
  } = useQuery({
    queryKey: [maisonMereAAPId, "maisonMereAAP", "GeneralInformationPage"],
    queryFn: () =>
      graphqlClient.request(getMaisonMereAAPGeneralInformationAdminQuery, {
        maisonMereAAPId,
      }),
    enabled: isAdmin,
  });

  const maisonMereAAPSuccess =
    maisonMereAAPGeneralInformationStatus === "success" ||
    generalInformationsStatus === "success";
  const maisonMereAAPError =
    maisonMereAAPGeneralInformationStatus === "error" ||
    generalInformationsStatus === "error";

  let maisonMereAAP: MaisonMereAap | undefined;
  if (isAdmin) {
    maisonMereAAP =
      maisonMereAAPGeneralInformationResponse?.organism_getMaisonMereAAPById as MaisonMereAap;
  } else {
    maisonMereAAP = generalInformationsResponse
      ?.account_getAccountForConnectedUser?.maisonMereAAP as MaisonMereAap;
  }

  const defaultValues = useMemo(
    () => ({
      siret: maisonMereAAP?.siret,
      managerFirstname: maisonMereAAP?.managerFirstname ?? "",
      managerLastname: maisonMereAAP?.managerLastname ?? "",
      gestionnaireFirstname: maisonMereAAP?.gestionnaire?.firstname ?? "",
      gestionnaireLastname: maisonMereAAP?.gestionnaire?.lastname ?? "",
      gestionnaireEmail: maisonMereAAP?.gestionnaire?.email ?? "",
      phone: maisonMereAAP?.phone ?? "",
      gestionBranch:
        maisonMereAAP?.typologie === "expertBrancheEtFiliere" ||
        maisonMereAAP?.typologie === "expertBranche",
    }),
    [maisonMereAAP],
  );

  const formHook = useForm<GeneralInformationFormValues>({
    resolver: standardSchemaResolver(generalInformationSchema),
    mode: "onChange",
  });
  const { watch, reset } = formHook;

  const handleReset = useCallback(() => {
    reset(defaultValues);
  }, [reset, defaultValues]);

  // keepDirtyValues: un refetch react-query écraserait sinon les saisies en cours.
  // Le bouton "Réinitialiser" passe par handleReset, qui écrase bien tout.
  useEffect(() => {
    reset(defaultValues, { keepDirtyValues: true });
  }, [reset, defaultValues]);

  const siret = watch("siret");

  const siretIsComplete = !!siret && siret.length >= 14;

  const { data: getEtablissementData, isFetching: etablissementIsFetching } =
    useQuery({
      queryKey: ["getEtablissement", siret],
      queryFn: () =>
        graphqlClient.request(getEtablissementQuery, {
          siret: siret || "",
        }),
      enabled: siretIsComplete,
    });

  const etablissement = getEtablissementData?.getEtablissement;

  // L'annuaire ne renvoie rien pour un SIRET inexistant: sans ce drapeau, l'étape
  // n'affiche qu'une carte vide.
  const siretNotFound =
    siretIsComplete && !etablissementIsFetching && !etablissement;

  return {
    etablissementIsFetching,
    siretNotFound,
    generalInformationsResponse,
    maisonMereAAPSuccess,
    maisonMereAAPError,
    maisonMereAAP,
    maisonMereAAPId,
    etablissement,
    isGestionnaireMaisonMereAAP,
    isAdmin,
    siret,
    formHook,
    handleReset,
    updateMaisonMereLegalInformation,
  };
};
