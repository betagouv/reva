import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";

import { graphql } from "@/graphql/generated";

const SEARCH_CERTIFICATIONS_FOR_CANDIDATE_VAE_COLLECTIVE = graphql(`
  query searchCertificationsForCandidateVaeCollective(
    $offset: Int
    $limit: Int
    $searchText: String
    $candidacyId: ID
    $cohorteVaeCollectiveIdFilter: ID
  ) {
    searchCertificationsForCandidate(
      offset: $offset
      limit: $limit
      searchText: $searchText
      candidacyId: $candidacyId
      cohorteVaeCollectiveIdFilter: $cohorteVaeCollectiveIdFilter
    ) {
      rows {
        id
        label
        summary
        codeRncp
        status
        certificationAuthorityStructure {
          id
          label
        }
      }
      info {
        totalRows
        currentPage
        totalPages
        pageLength
      }
    }
  }
`);

const GET_VAE_COLLECTIVE_COHORT_FOR_SEARCH_CERTIFICATION = graphql(`
  query getVaeCollectiveCohortForSearchCertification(
    $codeInscription: String!
  ) {
    cohorteVaeCollective(codeInscription: $codeInscription) {
      id
      nom
    }
  }
`);

export const useGetVaeCollectiveCohort = () => {
  const { graphqlClient } = useGraphQlClient();

  const { codeInscription } = useParams<{ codeInscription: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["vaeCollectiveCohortForSearchCertification", codeInscription],
    queryFn: () =>
      graphqlClient.request(
        GET_VAE_COLLECTIVE_COHORT_FOR_SEARCH_CERTIFICATION,
        {
          codeInscription,
        },
      ),
  });

  return {
    cohorteVaeCollective: data?.cohorteVaeCollective,
    isLoading,
    error,
  };
};

export const useSearchCertification = ({
  searchText,
  currentPage,
  cohorteVaeCollectiveIdFilter,
}: {
  searchText?: string;
  currentPage: number;
  cohorteVaeCollectiveIdFilter?: string;
}) => {
  const { graphqlClient } = useGraphQlClient();

  const RECORDS_PER_PAGE = 10;
  const offset = (currentPage - 1) * RECORDS_PER_PAGE;

  const searchCertificationsForCandidate = useQuery({
    queryKey: [
      "searchCertificationsForCandidateVaeCollective",
      searchText,
      currentPage,
      cohorteVaeCollectiveIdFilter,
    ],
    queryFn: () =>
      graphqlClient.request(
        SEARCH_CERTIFICATIONS_FOR_CANDIDATE_VAE_COLLECTIVE,
        {
          offset,
          limit: RECORDS_PER_PAGE,
          searchText,
          cohorteVaeCollectiveIdFilter,
        },
      ),
    gcTime: 0,
  });

  return { searchCertificationsForCandidate };
};
