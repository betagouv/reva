"use client";
import Button from "@codegouvfr/react-dsfr/Button";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ReactNode } from "react";

import { CandidacyModalities } from "@/components/aap-candidacy-layout/CandidacyModalities";
import { Skeleton } from "@/components/aap-candidacy-layout/Skeleton";
import { useCanAccessCandidacy } from "@/components/can-access-candidacy/canAccessCandidacy";
import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { NotAuthorized } from "@/components/not-authorized";

import { graphql } from "@/graphql/generated";

const PATHS_WITH_HIDDEN_SIDE_MENU = [
  /^\/candidacies\/[^/]+\/appointments\/[^/]+\/update-confirmation/,
];

const getCandidacyMenuQuery = graphql(`
  query getCandidacyMenuAndCandidateInfos($candidacyId: ID!) {
    candidacyMenu_getCandidacyMenu(candidacyId: $candidacyId) {
      menuHeader {
        label
        url
        status
      }
      mainMenu {
        label
        url
        status
      }
      menuFooter {
        label
        url
        status
      }
    }
    getCandidacyById(id: $candidacyId) {
      financeModule
      organism {
        modaliteAccompagnement
      }
      candidate {
        lastname
        firstname
        givenName
      }
    }
  }
`);

export const AapCandidacyLayout = ({ children }: { children: ReactNode }) => {
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();
  const { graphqlClient } = useGraphQlClient();

  const { data: getCandidacyMenuResponse, isLoading: isLoadingMenu } = useQuery(
    {
      queryKey: [candidacyId, "getCandidacyMenu"],
      queryFn: () =>
        graphqlClient.request(getCandidacyMenuQuery, {
          candidacyId,
        }),
    },
  );

  const { canAccess } = useCanAccessCandidacy(candidacyId);
  const currentPathname = usePathname();

  const shouldHideSideMenu = PATHS_WITH_HIDDEN_SIDE_MENU.some((path) =>
    path.test(currentPathname),
  );

  if (canAccess === false) {
    return <NotAuthorized />;
  }

  if (shouldHideSideMenu) {
    return <div className="w-full">{children}</div>;
  }

  const menuHeaderEntries =
    getCandidacyMenuResponse?.candidacyMenu_getCandidacyMenu?.menuHeader;

  const mainMenuEntries =
    getCandidacyMenuResponse?.candidacyMenu_getCandidacyMenu?.mainMenu;

  const menuFooterEntries =
    getCandidacyMenuResponse?.candidacyMenu_getCandidacyMenu?.menuFooter;

  const candidacy = getCandidacyMenuResponse?.getCandidacyById;

  const candidate = candidacy?.candidate;

  return (
    <div className="flex flex-col md:flex-row w-full">
      <CandidacyLayoutSideMenu isLoading={isLoadingMenu}>
        <div className="flex text-xl font-bold mt-2 md:mt-0 mb-2">
          <span className="fr-icon--xl fr-icon-user-fill mr-2" />
          <span>
            {candidate?.givenName ? candidate.givenName : candidate?.lastname}{" "}
            {candidate?.firstname}
          </span>
        </div>
        <CandidacyModalities
          fundable={candidacy?.financeModule !== "hors_plateforme"}
          modaliteAccompagnement={candidacy?.organism?.modaliteAccompagnement}
        />

        <ul className="mb-6">
          {menuHeaderEntries?.map((e) => (
            <MenuEntry key={e.label} menuEntry={e} />
          ))}
        </ul>
        <h2 className="mt-0.5 flex items-end text-xl font-semibold">
          Toutes les étapes
        </h2>
        <ul>
          {mainMenuEntries?.map((e) => (
            <MenuEntry key={e.label} menuEntry={e} />
          ))}
        </ul>
        {!!menuFooterEntries?.length && (
          <>
            <div className="border-t-[1px] -ml-4 mr-4 mt-8 mb-7" />
            <ul>
              {menuFooterEntries?.map((e) => (
                <MenuEntry key={e.label} menuEntry={e} />
              ))}
            </ul>
          </>
        )}
      </CandidacyLayoutSideMenu>
      <div className="w-full">{children}</div>
    </div>
  );
};

const MenuEntry = ({
  menuEntry,
}: {
  menuEntry: {
    label: string;
    url: string;
    status: "INACTIVE" | "ACTIVE_WITHOUT_HINT" | "ACTIVE_WITH_EDIT_HINT";
  };
}) => (
  <li key={menuEntry.label} className="mt-5 mb-7 font-bold">
    {menuEntry.status === "INACTIVE" && <span>{menuEntry.label}</span>}
    {menuEntry.status === "ACTIVE_WITHOUT_HINT" && (
      <Link className="bg-none" href={menuEntry.url}>
        {menuEntry.label}
      </Link>
    )}

    {menuEntry.status === "ACTIVE_WITH_EDIT_HINT" && (
      <Link href={menuEntry.url}>
        <div className="flex flex-col gap-2">
          <span className="text-dsfr-blue-france-sun-113 font-bold">
            {menuEntry.label}
          </span>
          <Button className="mt-1">Compléter</Button>
        </div>
      </Link>
    )}
  </li>
);

const CandidacyLayoutSideMenu = ({
  isLoading,
  children,
}: {
  isLoading: boolean;
  children: ReactNode;
}) => (
  <nav
    role="navigation"
    aria-label="Menu latéral"
    className="fr-sidemenu bg-white md:h-full w-full md:max-w-[300px] mb-2 flex-shrink-0"
  >
    <div className="h-full md:border-r mr-1 lg:mr-0">
      <div className="fr-sidemenu__inner shadow-none pr-2 h-full md:pb-24">
        <button
          className="fr-sidemenu__btn"
          aria-controls="fr-sidemenu-wrapper"
          aria-expanded="false"
          data-fr-js-collapse-button="true"
        >
          Accéder aux étapes du parcours
        </button>
        <div
          className="fr-collapse"
          id="fr-sidemenu-wrapper"
          data-fr-js-collapse="true"
        >
          <div className="lg:ml-1">{isLoading ? <Skeleton /> : children}</div>
        </div>
      </div>
    </div>
  </nav>
);
