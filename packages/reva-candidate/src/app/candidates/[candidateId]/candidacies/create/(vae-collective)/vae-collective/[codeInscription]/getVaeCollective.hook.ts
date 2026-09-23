import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";

import { graphql } from "@/graphql/generated";

const GET_VAE_COLLECTIVE_COHORT_FOR_CREATE_CANDIDACY = graphql(`
  query getVaeCollectiveCohortForCreateCandidacy($codeInscription: String!) {
    cohorteVaeCollective(codeInscription: $codeInscription) {
      id
      nom
      codeInscription
      commanditaireVaeCollective {
        raisonSociale
      }
      organism {
        id
        label
        nomPublic
        adresseNumeroEtNomDeRue
        adresseCodePostal
        adresseVille
        telephone
      }
      certificationCohorteVaeCollectives {
        id
        certification {
          id
          label
          codeRncp
          certificationAuthorityStructure {
            id
            label
          }
        }
      }
    }
  }
`);

export const useGetVaeCollectiveCohort = () => {
  const { graphqlClient } = useGraphQlClient();

  const { codeInscription } = useParams<{ codeInscription: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["vaeCollectiveCohortForCreateCandidacy", codeInscription],
    queryFn: () =>
      graphqlClient.request(GET_VAE_COLLECTIVE_COHORT_FOR_CREATE_CANDIDACY, {
        codeInscription,
      }),
  });

  return {
    cohorteVaeCollective: data?.cohorteVaeCollective,
    isLoading,
    error,
  };
};
