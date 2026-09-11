"use client";
import { SideMenu } from "@codegouvfr/react-dsfr/SideMenu";
import Tag from "@codegouvfr/react-dsfr/Tag";
import { useQuery } from "@tanstack/react-query";
import { useParams, usePathname } from "next/navigation";
import { ReactNode } from "react";

import { Skeleton } from "@/components/aap-candidacy-layout/Skeleton";
import { useAuth } from "@/components/auth/auth";
import { useCanAccessCandidacy } from "@/components/can-access-candidacy/canAccessCandidacy";
import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";
import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { NotAuthorized } from "@/components/not-authorized";

import { graphql } from "@/graphql/generated";

const getCandidacyQuery = graphql(`
  query getCandidacyWithCandidateInfoForLayout($candidacyId: ID!) {
    getCandidacyById(id: $candidacyId) {
      id
      typeAccompagnement
      candidate {
        firstname
        lastname
        givenName
      }
      jury {
        dateOfSession
      }
      candidacyDropOut {
        createdAt
      }
    }
  }
`);

const CandidacyPageLayout = ({ children }: { children: ReactNode }) => {
  const currentPathname = usePathname();
  const { isAdmin } = useAuth();
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();
  const { graphqlClient } = useGraphQlClient();
  const { isFeatureActive } = useFeatureflipping();
  const isJuryResultsByBlockFeatureActive = isFeatureActive(
    "JURY_RESULTS_BY_BLOCK",
  );

  const { data: getCandidacyResponse, isLoading: isLoadingMenu } = useQuery({
    queryKey: [candidacyId, "getCandidacyQuery"],
    queryFn: () =>
      graphqlClient.request(getCandidacyQuery, {
        candidacyId,
      }),
  });

  const candidacy = getCandidacyResponse?.getCandidacyById;
  const candidate = candidacy?.candidate;
  const juryDateOfSession = candidacy?.jury?.dateOfSession;
  const typeAccompagnement = candidacy?.typeAccompagnement;
  const isDroppedOut = !!candidacy?.candidacyDropOut;

  const { canAccess } = useCanAccessCandidacy(candidacyId);

  if (canAccess === false) {
    return <NotAuthorized />;
  }

  const menuItem = (text: string | ReactNode, path: string) => ({
    isActive: currentPathname.startsWith(path),
    linkProps: {
      href: path,
      target: "_self",
    },
    text,
  });

  const items = [
    menuItem("Étude de faisabilité", `/candidacies/${candidacyId}/feasibility`),
    menuItem(
      "Dossier de validation",
      `/candidacies/${candidacyId}/dossier-de-validation`,
    ),
  ];

  if (isJuryResultsByBlockFeatureActive) {
    items.push(
      menuItem(
        "Passage devant le jury",
        `/candidacies/${candidacyId}/jury/date`,
      ),
    );
    items.push(
      menuItem("Résultat de jury", `/candidacies/${candidacyId}/jury/resultat`),
    );
  } else {
    items.push(menuItem("Jury", `/candidacies/${candidacyId}/jury`));
  }

  const footerItems = [];

  if (isDroppedOut) {
    footerItems.push(
      menuItem(
        "Abandon du candidat",
        `/candidacies/${candidacyId}/candidacy-drop-out`,
      ),
    );
  }

  if (!juryDateOfSession) {
    footerItems.push(
      menuItem(
        <>
          <ul>Transférer la candidature</ul>
        </>,

        `/candidacies/${candidacyId}/transfer`,
      ),
    );
  }

  if (isAdmin) {
    footerItems.push(
      menuItem(
        <>
          <ul>Journal des actions</ul>
        </>,

        `/candidacies/${candidacyId}/logs-certificateur`,
      ),
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full md:flex-row gap-10 md:gap-0 ">
      {isLoadingMenu ? (
        <Skeleton />
      ) : (
        <div>
          <div className="sticky left-0 top-6 flex flex-col">
            <SideMenu
              title={
                <>
                  <div className="flex items-center pt-1.5 mb-4">
                    <span className="fr-icon-user-fill fr-icon mr-2" />
                    <p className="font-bold text-xl capitalize">
                      {`${candidate?.givenName || candidate?.lastname} ${candidate?.firstname || ""}`}
                    </p>
                  </div>
                  {typeAccompagnement === "AUTONOME" && (
                    <Tag small className="mt-4 font-normal">
                      Candidat en autonomie
                    </Tag>
                  )}
                </>
              }
              burgerMenuButtonText="Candidatures"
              items={items}
              className="flex-shrink-0 flex-grow-0"
            />

            <div className="border-r-[1px] mr-8 py-6 border-dsfr-light-decisions-border-border-default-grey">
              <div className="border-t-[1px] border-dsfr-light-decisions-border-border-default-grey" />
            </div>

            <SideMenu
              className="flex-shrink-0 flex-grow-0 md:basis-[300px]"
              burgerMenuButtonText="Candidatures"
              items={footerItems}
            />
          </div>
        </div>
      )}
      <div className="mt-3 flex-1">{children}</div>
    </div>
  );
};

export default CandidacyPageLayout;
