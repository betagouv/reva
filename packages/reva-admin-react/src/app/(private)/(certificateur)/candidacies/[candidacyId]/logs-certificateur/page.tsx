"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { DayLog, groupLogsByDay } from "@/components/logs/day-log/DayLog";

import { graphql } from "@/graphql/generated";

const getCandidacyLogsQuery = graphql(`
  query getCandidacyLogsCertificateur($candidacyId: ID!) {
    getCandidacyById(id: $candidacyId) {
      id
      certification {
        label
      }
      candidate {
        firstname
        lastname
      }
      candidacyLogs {
        id
        createdAt
        message
        details
        userProfile
        user {
          firstname
          lastname
          email
        }
      }
    }
  }
`);

const CandidacyLogsPage = () => {
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { graphqlClient } = useGraphQlClient();

  const { data: getCandidacyLogsResponse } = useQuery({
    queryKey: ["getCandidacyLogsCertificateur", candidacyId],
    queryFn: () =>
      graphqlClient.request(getCandidacyLogsQuery, {
        candidacyId,
      }),
  });

  const candidacy = getCandidacyLogsResponse?.getCandidacyById;
  const candidate = candidacy?.candidate;
  const candidacyLogs = candidacy?.candidacyLogs || [];

  const logsGroupedByDay = groupLogsByDay(candidacyLogs);

  return (
    candidacy && (
      <div className="flex flex-col">
        <h1>
          {candidate?.firstname} {candidate?.lastname} - Suivi de la candidature
        </h1>
        <p className="text-xl text-gray-700 font-bold mb-11">
          {candidacy.certification?.label}
        </p>
        <div>
          {Object.keys(logsGroupedByDay).map((day) => {
            return <DayLog key={day} day={day} logs={logsGroupedByDay[day]} />;
          })}
        </div>
      </div>
    )
  );
};

export default CandidacyLogsPage;
