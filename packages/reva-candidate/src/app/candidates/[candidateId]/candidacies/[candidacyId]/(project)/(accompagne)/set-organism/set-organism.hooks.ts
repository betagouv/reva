import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { candidateCanEditCandidacy } from "@/utils/candidateCanEditCandidacy.util";

import { graphql } from "@/graphql/generated";
import { SearchOrganismFilter } from "@/graphql/generated/graphql";

const GET_CANDIDACY_BY_ID_FOR_SET_ORGANISM = graphql(`
  query getCandidacyByIdForSetOrganism($candidacyId: ID!) {
    getCandidacyById(id: $candidacyId) {
      id
      status
      typeAccompagnement
      candidacyDropOut {
        createdAt
      }
      certification {
        id
      }
      organism {
        id
      }
    }
  }
`);

const GET_ORGANISMS_FOR_CANDIDACY = graphql(`
  query getRandomOrganismsForCandidacy(
    $candidacyId: UUID!
    $searchText: String
    $searchFilter: SearchOrganismFilter
  ) {
    getRandomOrganismsForCandidacy(
      candidacyId: $candidacyId
      searchText: $searchText
      searchFilter: $searchFilter
    ) {
      rows {
        id
        label
        contactAdministrativeEmail
        contactAdministrativePhone
        modaliteAccompagnement
        website
        distanceKm
        isMaisonMereMCFCompatible
        nomPublic
        telephone
        siteInternet
        emailContact
        adresseNumeroEtNomDeRue
        adresseInformationsComplementaires
        adresseCodePostal
        adresseVille
        conformeNormesAccessibilite
        fermePourAbsenceOuConges
      }
      totalRows
    }
  }
`);

const SELECT_ORGANISM_FOR_CANDIDACY = graphql(`
  mutation candidacy_selectOrganism($candidacyId: UUID!, $organismId: UUID!) {
    candidacy_selectOrganism(
      candidacyId: $candidacyId
      organismId: $organismId
    ) {
      id
    }
  }
`);

export const useSetOrganism = ({
  searchText,
  searchFilter,
}: {
  searchText: string;
  searchFilter: SearchOrganismFilter;
}) => {
  const { graphqlClient } = useGraphQlClient();
  const queryClient = useQueryClient();

  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { data: getCandidateWithCandidacy } = useQuery({
    queryKey: ["candidacy", "set-organism", candidacyId],
    queryFn: () =>
      graphqlClient.request(GET_CANDIDACY_BY_ID_FOR_SET_ORGANISM, {
        candidacyId,
      }),
  });
  const candidacy = getCandidateWithCandidacy?.getCandidacyById;

  const hasSelectedCertification = !!candidacy?.certification?.id;

  const canEditCandidacy = candidateCanEditCandidacy({
    candidacyStatus: candidacy?.status,
    typeAccompagnement: candidacy?.typeAccompagnement,
    candidacyDropOut: !!candidacy?.candidacyDropOut,
  });

  const getRandomOrganismsForCandidacy = useQuery({
    queryKey: [
      "getRandomOrganismsForCandidacy",
      candidacy?.id,
      candidacy?.certification?.id,
      searchText,
      searchFilter,
    ],
    queryFn: () =>
      graphqlClient.request(GET_ORGANISMS_FOR_CANDIDACY, {
        candidacyId,
        searchText,
        searchFilter,
      }),
    gcTime: 0,
    enabled: !!candidacy?.id && hasSelectedCertification,
  });

  const selectOrganism = useMutation({
    mutationKey: ["candidacy_selectOrganism"],
    mutationFn: ({ organismId }: { organismId: string }) =>
      graphqlClient.request(SELECT_ORGANISM_FOR_CANDIDACY, {
        candidacyId,
        organismId,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidacy"] }),
  });

  return {
    getRandomOrganismsForCandidacy,
    selectOrganism,
    canEditCandidacy,
    candidacy,
    hasSelectedCertification,
  };
};

type SetOrganismHookReturnType = ReturnType<typeof useSetOrganism>;
export type Organism = NonNullable<
  NonNullable<
    NonNullable<
      SetOrganismHookReturnType["getRandomOrganismsForCandidacy"]["data"]
    >["getRandomOrganismsForCandidacy"]
  >["rows"]
>[number];
