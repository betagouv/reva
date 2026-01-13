import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";

import { graphql } from "@/graphql/generated";
import { CandidateUpdateInformationBySelfInput } from "@/graphql/generated/graphql";

const getCandidateByIdForCivilInformationPage = graphql(`
  query getCandidateByIdForCivilInformationPage($candidateId: ID!) {
    candidate_getCandidateById(id: $candidateId) {
      id
      firstname
      lastname
      givenName
      firstname2
      firstname3
      gender
      birthCity
      birthdate
      birthDepartment {
        id
      }
      country {
        id
      }
      nationality
      street
      city
      zip
      phone
      email
      addressComplement
    }
  }
`);

const getCountries = graphql(`
  query getCountries {
    getCountries {
      id
      label
    }
  }
`);

const getDepartments = graphql(`
  query getDepartments {
    getDepartments {
      id
      label
      code
    }
  }
`);

export const useCivilInformation = () => {
  const { graphqlClient } = useGraphQlClient();

  const { candidateId } = useParams<{
    candidateId: string;
  }>();

  const { data: getCandidateData } = useQuery({
    queryKey: [
      "candidate",
      "getCandidateByIdForCivilInformationPage",
      candidateId,
    ],
    queryFn: () =>
      graphqlClient.request(getCandidateByIdForCivilInformationPage, {
        candidateId,
      }),
  });

  const { data: getCountriesData } = useQuery({
    queryKey: ["getCountries"],
    queryFn: () => graphqlClient.request(getCountries),
  });

  const { data: getDepartmentsData } = useQuery({
    queryKey: ["getDepartments"],
    queryFn: () => graphqlClient.request(getDepartments),
  });

  const candidate = getCandidateData?.candidate_getCandidateById;
  const countries = getCountriesData?.getCountries;
  const departments = getDepartmentsData?.getDepartments;

  const candidacyAlreadySubmitted = false; //candidacy?.status !== "PROJET";

  return {
    candidate,
    countries,
    departments,
    candidacyAlreadySubmitted,
  };
};

const updateCandidateInformationMutation = graphql(`
  mutation updateCandidateInformationMutation(
    $candidateId: String!
    $candidateInformation: CandidateUpdateInformationBySelfInput!
  ) {
    candidate_updateCandidateInformationBySelf(
      candidateId: $candidateId
      candidateInformation: $candidateInformation
    ) {
      id
    }
  }
`);

export const useUpdateCandidateInformation = () => {
  const { graphqlClient } = useGraphQlClient();
  const queryClient = useQueryClient();

  const {
    mutateAsync: updateCandidateInformationMutate,
    isPending: updateCandidateInformationIsPending,
  } = useMutation({
    mutationKey: ["updateCandidateInformation"],
    mutationFn: ({
      candidateInformation,
    }: {
      candidateInformation: CandidateUpdateInformationBySelfInput;
    }) =>
      graphqlClient.request(updateCandidateInformationMutation, {
        candidateId: candidateInformation.id,
        candidateInformation,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes("updateCandidateInformation") ||
          query.queryKey.includes("candidate") ||
          query.queryKey.includes("candidacy"),
      });
    },
  });

  return {
    updateCandidateInformationMutate,
    updateCandidateInformationIsPending,
  };
};

type ProfileHookReturnType = ReturnType<typeof useCivilInformation>;
export type CandidateUseProfile = ProfileHookReturnType["candidate"];
export type Countries = ProfileHookReturnType["countries"];
export type Departments = ProfileHookReturnType["departments"];
