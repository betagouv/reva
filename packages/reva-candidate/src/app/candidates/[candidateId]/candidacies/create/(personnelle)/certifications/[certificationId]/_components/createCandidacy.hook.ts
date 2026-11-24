import { useMutation } from "@tanstack/react-query";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";

import { graphql } from "@/graphql/generated";
import { CreateCandidacyInput } from "@/graphql/generated/graphql";

const CREATE_CANDIDACY = graphql(`
  mutation createCandidacy($candidateId: UUID!, $data: CreateCandidacyInput!) {
    candidacy_createCandidacy(candidateId: $candidateId, data: $data) {
      id
    }
  }
`);

export const useCreateCandidacy = () => {
  const { graphqlClient } = useGraphQlClient();

  const createCandidacy = useMutation({
    mutationKey: ["createCandidacy"],
    mutationFn: ({
      candidateId,
      data,
    }: {
      candidateId: string;
      data: CreateCandidacyInput;
    }) => graphqlClient.request(CREATE_CANDIDACY, { candidateId, data }),
  });

  return { createCandidacy };
};
