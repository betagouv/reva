"use client";

import Button from "@codegouvfr/react-dsfr/Button";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import Image from "next/image";
import { useMemo, useRef } from "react";

import {
  createGoogleCalendarLink,
  createGoogleCalendarLinkForJury,
  createIcsFile,
  createIcsFileForJury,
  createOutlookCalendarLink,
  createOutlookCalendarLinkForJury,
} from "@/utils/calendarLinks";

import { Appointment } from "@/graphql/generated/graphql";

type JuryForCalendar = {
  id: string;
  dateOfSession: number;
  addressOfSession?: string | null;
  informationOfSession?: string | null;
  candidacy: {
    feasibility?: {
      certificationAuthority?: {
        label: string;
      } | null;
    } | null;
  };
};

type AppointmentForCalendar = Omit<Appointment, "temporalStatus">;

interface AddToCalendarProps {
  event: AppointmentForCalendar | JuryForCalendar;
  buttonOutline?: boolean;
}

const isJury = (
  event: AppointmentForCalendar | JuryForCalendar,
): event is JuryForCalendar => {
  return "dateOfSession" in event;
};

export const AddToCalendar = ({
  event,
  buttonOutline = false,
}: AddToCalendarProps) => {
  const iconBasePath = "/candidat/images/icons/";
  const addToCalendarModal = useMemo(
    () =>
      createModal({
        id: "add-to-calendar",
        isOpenedByDefault: false,
      }),
    [],
  );

  const icsDownloadHiddenLink = useRef<HTMLAnchorElement>(null);

  const googleCalendarLink = isJury(event)
    ? createGoogleCalendarLinkForJury(event)
    : createGoogleCalendarLink(event);
  const outlookCalendarLink = isJury(event)
    ? createOutlookCalendarLinkForJury(event)
    : createOutlookCalendarLink(event);
  const icsFileContent = isJury(event)
    ? createIcsFileForJury(event)
    : createIcsFile(event);
  const icsFileName = isJury(event)
    ? `jury${event.dateOfSession}.ics`
    : `${event.title}.ics`;

  const handleIcsDownload = () => {
    const blob = new Blob([icsFileContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    icsDownloadHiddenLink.current!.href = url;
    icsDownloadHiddenLink.current!.click();
    setTimeout(() => {
      icsDownloadHiddenLink.current!.href = "";
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <>
      <Button
        priority={buttonOutline ? "tertiary" : "tertiary no outline"}
        onClick={() => addToCalendarModal.open()}
        iconId="ri-calendar-check-line"
        type="button"
        className="w-full md:w-auto"
      >
        Ajouter à mon agenda
      </Button>
      <addToCalendarModal.Component title="Ajouter à mon agenda">
        <p>Ajoutez vos rendez-vous à votre agenda pour ne pas les oublier.</p>
        <div className="flex flex-row gap-4 justify-center">
          <Button
            priority="tertiary"
            linkProps={{ href: googleCalendarLink }}
            className="after:hidden p-3"
            title="Ajouter à Google Calendar"
          >
            <Image
              src={`${iconBasePath}googlecalendar.svg`}
              alt="Google Calendar"
              width={32}
              height={32}
            />
          </Button>
          <a
            ref={icsDownloadHiddenLink}
            href="#"
            download={icsFileName}
            className="hidden"
          ></a>
          <Button
            priority="tertiary"
            className="after:hidden p-3"
            title="Ajouter à l'agenda de votre appareil"
            onClick={handleIcsDownload}
          >
            <Image
              src={`${iconBasePath}applecalendar.svg`}
              alt="Apple Calendar"
              width={32}
              height={32}
            />
          </Button>
          <Button
            priority="tertiary"
            linkProps={{ href: outlookCalendarLink }}
            className="after:hidden p-3"
            title="Ajouter à Outlook"
          >
            <Image
              src={`${iconBasePath}outlook.svg`}
              alt="Outlook"
              width={32}
              height={32}
            />
          </Button>
        </div>
      </addToCalendarModal.Component>
    </>
  );
};
