"use client";
import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import Tag from "@codegouvfr/react-dsfr/Tag";
import Tile from "@codegouvfr/react-dsfr/Tile";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import { AddToCalendar } from "@/components/add-to-calendar/AddToCalendar";
import { useKeycloakContext } from "@/components/auth/keycloak.context";
import { BackButton } from "@/components/back-button/BackButton";
import { handleAuthenticatedDownload } from "@/utils/handleAuthenticatedDownload.util";

import { JuryUseJurySession, useJurySession } from "./jury-session.hook";

const JuryInformation = ({
  jury,
}: {
  jury: NonNullable<JuryUseJurySession>;
}) => (
  <div className="mt-4 px-4 flex flex-col gap-4">
    <table className="w-full">
      <tr className="border-b">
        <td className="w-1/3 py-4">Programmé par :</td>
        <td
          className="w-2/3 font-bold py-4"
          data-testid="appointment-organized-by"
        >
          {jury.candidacy?.feasibility?.certificationAuthority?.label}
        </td>
      </tr>
      <tr className="border-b ">
        <td className="w-1/3 py-4">Lieu : </td>
        <td className="w-2/3 font-bold py-4" data-testid="appointment-location">
          {jury.addressOfSession ||
            "Non renseigné, pour plus d’information contactez la personne à l’initiative de ce rendez-vous."}
        </td>
      </tr>
      <tr className="border-b ">
        <td className="w-1/3 py-4">Description : </td>
        <td
          className="w-2/3 font-bold py-4"
          data-testid="appointment-description"
        >
          {jury.informationOfSession ||
            "Non renseigné, pour plus d’information contactez la personne à l’initiative de ce rendez-vous."}
        </td>
      </tr>
    </table>
    <div className="self-end">
      <AddToCalendar appointment={jury} />
    </div>
  </div>
);

export default function JurySessionPage() {
  const { jury } = useJurySession();
  const { accessToken } = useKeycloakContext();
  const router = useRouter();

  if (!jury) {
    return null;
  }

  const dateOfJurySession = jury.timeSpecified
    ? format(jury.dateOfSession, "dd/MM/yyyy - HH:mm")
    : format(jury.dateOfSession, "dd/MM/yyyy");

  const onDownloadClick = (e: React.SyntheticEvent) => {
    if (!jury.convocationFile?.url || !accessToken) {
      return;
    }
    handleAuthenticatedDownload(jury.convocationFile.url, accessToken, e);
  };

  return (
    <div className="flex flex-col w-full">
      <Breadcrumb
        currentPageLabel="Passage devant le jury"
        className="mb-4"
        segments={[
          {
            label: "Ma candidature",
            linkProps: {
              href: "../",
            },
          },
        ]}
      />
      <h1 className="mb-6">Passage devant le jury</h1>
      <p className="text-lg mb-12 text-dsfrGray-700">
        Une date de jury vous a été attribuée. Retrouvez toutes les informations
        officielles dans votre convocation.
      </p>
      <div className="flex">
        <Tile
          small
          orientation="horizontal"
          classes={{
            content: "pr-20 pb-0",
          }}
          start={<Tag small>Passage devant le jury</Tag>}
          title={dateOfJurySession}
        />
      </div>

      <JuryInformation jury={jury} />

      {jury.convocationFile && (
        <Tile
          buttonProps={{ onClick: onDownloadClick }}
          downloadButton
          enlargeLinkOrButton
          orientation="horizontal"
          title="Convocation au passage devant le jury"
          titleAs="h3"
          detail="PDF"
          className="!border-b-0 mb-0"
        />
      )}

      <BackButton navigateBack={() => router.push("../")} className="mt-12" />
    </div>
  );
}
