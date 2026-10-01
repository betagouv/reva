"use client";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/auth/auth";
import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";

import { graphql } from "@/graphql/generated";

const getCertificationAuthorityMetabaseUrlQuery = graphql(`
  query getCertificationAuthorityMetabaseUrl {
    account_getAccountForConnectedUser {
      certificationAuthority {
        metabaseDashboardIframeUrl
      }
    }
  }
`);

const getCertificationAuthorityMetabaseUrlForRegistryManagerQuery = graphql(`
  query getCertificationAuthorityMetabaseUrlForRegistryManager {
    account_getAccountForConnectedUser {
      certificationRegistryManager {
        certificationAuthorityStructure {
          metabaseDashboardIframeUrlForRegistryManager
        }
      }
    }
  }
`);

const getCertificationAuthorityLocalAccountMetabaseUrlQuery = graphql(`
  query getCertificationAuthorityLocalAccountMetabaseUrl {
    account_getAccountForConnectedUser {
      certificationAuthorityLocalAccount {
        metabaseDashboardIframeUrl
      }
    }
  }
`);
const CertificationAuthorityDashboard = () => {
  const { graphqlClient } = useGraphQlClient();
  const {
    isCertificationRegistryManager,
    isCertificationAuthorityLocalAccount,
  } = useAuth();

  const { data: getCertificationAuthorityMetabaseUrl } = useQuery({
    queryKey: ["certificateur", "getCertificationAuthorityMetabaseUrl"],
    queryFn: () =>
      graphqlClient.request(getCertificationAuthorityMetabaseUrlQuery),
    enabled: !isCertificationRegistryManager,
  });

  const { data: getCertificationAuthorityMetabaseUrlForRegistryManager } =
    useQuery({
      queryKey: [
        "certificateur",
        "getCertificationAuthorityMetabaseUrlForRegistryManager",
      ],
      queryFn: () =>
        graphqlClient.request(
          getCertificationAuthorityMetabaseUrlForRegistryManagerQuery,
        ),
      enabled: isCertificationRegistryManager,
    });

  const { data: getCertificationAuthorityLocalAccountMetabaseUrl } = useQuery({
    queryKey: [
      "certificateur",
      "getCertificationAuthorityLocalAccountMetabaseUrl",
    ],
    queryFn: () =>
      graphqlClient.request(
        getCertificationAuthorityLocalAccountMetabaseUrlQuery,
      ),
    enabled: isCertificationAuthorityLocalAccount,
  });

  const iframeUrl =
    getCertificationAuthorityMetabaseUrl?.account_getAccountForConnectedUser
      ?.certificationAuthority?.metabaseDashboardIframeUrl ||
    getCertificationAuthorityMetabaseUrlForRegistryManager
      ?.account_getAccountForConnectedUser?.certificationRegistryManager
      ?.certificationAuthorityStructure
      ?.metabaseDashboardIframeUrlForRegistryManager ||
    getCertificationAuthorityLocalAccountMetabaseUrl
      ?.account_getAccountForConnectedUser?.certificationAuthorityLocalAccount
      ?.metabaseDashboardIframeUrl;

  if (!iframeUrl) {
    return null;
  }

  return <iframe src={iframeUrl} className="w-full h-[3200px]" />;
};

export default CertificationAuthorityDashboard;
