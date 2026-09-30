"use client";
import Accordion from "@codegouvfr/react-dsfr/Accordion";
import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import Card from "@codegouvfr/react-dsfr/Card";
import Tag from "@codegouvfr/react-dsfr/Tag";
import { useState } from "react";

import { Panel } from "@/components/layout/Panel";
import { formatIso8601Date } from "@/utils/formatIso8601Date";
import { formatIso8601Time } from "@/utils/formatIso8601Time";

import { AppointmentType } from "@/graphql/generated/graphql";

import { useAppointments } from "./appointments.hooks";

const getTagLabel = (type: AppointmentType | "JURY") => {
  switch (type) {
    case "RENDEZ_VOUS_PEDAGOGIQUE":
      return "Rendez-vous pédagogique";
    case "RENDEZ_VOUS_DE_SUIVI":
      return "Rendez-vous de suivi";
    case "JURY":
      return "Passage devant le jury";
  }
};

const getFormatedDateTime = (
  date: string,
  type: AppointmentType | "JURY",
  timeOfSession?: string,
) => {
  if (type === "JURY") {
    return `${formatIso8601Date(date)} ${timeOfSession ? `- ${timeOfSession}` : ""}`;
  }
  return `${formatIso8601Date(date)} - ${formatIso8601Time(date)}`;
};

export default function AppointmentsPage() {
  const { futureAppointments } = useAppointments({});

  return (
    <Panel>
      <div className="flex flex-col gap-4 w-full">
        <Breadcrumb
          currentPageLabel="Mes prochains rendez-vous"
          className="mb-0"
          segments={[
            {
              label: "Ma candidature",
              linkProps: {
                href: "../",
              },
            },
          ]}
        />
        <div className="flex flex-col w-full gap-12">
          <h1 className="mb-0">Mes prochains rendez-vous</h1>
          <div className="flex flex-col gap-4">
            {futureAppointments?.map((appointment) => (
              <Card
                horizontal
                enlargeLink
                size="small"
                title={appointment.title}
                desc={getFormatedDateTime(
                  appointment.date,
                  appointment.type,
                  appointment.timeOfSession,
                )}
                detail={<Tag small>{getTagLabel(appointment.type)}</Tag>}
                endDetail="Voir les détails"
                key={appointment.id}
                linkProps={{
                  href:
                    appointment.type === "JURY"
                      ? "../jury-session?fromPage=../appointments"
                      : `./${appointment.id}`,
                }}
                data-testid={`future-appointment-${appointment.id}`}
              />
            ))}
          </div>
        </div>
        <PastAppointments />
      </div>
    </Panel>
  );
}

const PastAppointments = () => {
  const [pastLimit, setPastLimit] = useState(5);

  const { pastAppointments, totalPastAppointments } = useAppointments({
    pastLimit,
  });
  return (
    <>
      <Accordion
        label="Rendez-vous passés"
        className={`${pastAppointments.length > 0 ? "" : "hidden"}`}
      >
        <div className="flex flex-col gap-4">
          {pastAppointments?.map((appointment) => (
            <Card
              horizontal
              enlargeLink
              size="small"
              title={appointment.title}
              desc={getFormatedDateTime(
                appointment.date,
                appointment.type,
                appointment.timeOfSession,
              )}
              detail={<Tag small>{getTagLabel(appointment.type)}</Tag>}
              endDetail="Voir les détails"
              key={appointment.id}
              linkProps={{
                href:
                  appointment.type === "JURY"
                    ? "../jury-session?fromPage=../appointments"
                    : `./${appointment.id}`,
              }}
              data-testid={`past-appointment-${appointment.id}`}
            />
          ))}
          {totalPastAppointments > pastLimit && (
            <Button
              className="self-end"
              priority="secondary"
              onClick={() => setPastLimit((pastLimit) => pastLimit + 5)}
            >
              Voir plus
            </Button>
          )}
        </div>
      </Accordion>
    </>
  );
};
