import { useQuery } from "@tanstack/react-query";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";

import { graphql } from "@/graphql/generated";

const getCandidacyAndAppointmentQuery = graphql(`
  query getCandidacyAndAppointmentForAppointmentUpdateConfirmationPage(
    $candidacyId: ID!
    $appointmentId: ID!
  ) {
    getCandidacyById(id: $candidacyId) {
      id
      candidate {
        id
        firstname
        lastname
      }
    }
    appointment_getAppointmentById(
      candidacyId: $candidacyId
      appointmentId: $appointmentId
    ) {
      id
      title
      date
      duration
      location
      description
    }
  }
`);

export const useAppointmentUpdateConfirmationPage = ({
  candidacyId,
  appointmentId,
}: {
  appointmentId: string;
  candidacyId: string;
}) => {
  const { graphqlClient } = useGraphQlClient();

  const { data: getCandidacyAndAppointmentData } = useQuery({
    queryKey: [
      candidacyId,
      appointmentId,
      "getCandidacyAndAppointmentForAppointmentUpdateConfirmationPage",
    ],
    queryFn: () =>
      graphqlClient.request(getCandidacyAndAppointmentQuery, {
        candidacyId,
        appointmentId,
      }),
  });

  const candidate = getCandidacyAndAppointmentData?.getCandidacyById?.candidate;
  const appointment =
    getCandidacyAndAppointmentData?.appointment_getAppointmentById;

  return { candidate, appointment };
};
