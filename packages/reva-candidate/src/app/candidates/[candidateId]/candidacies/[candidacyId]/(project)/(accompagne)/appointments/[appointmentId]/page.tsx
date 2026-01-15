"use client";
import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";

import { GenericAppointmentTile } from "@/app/_components/home/dashboard/dashboard-sidebar/appointments/GenericAppointmentTile";
import { AddToCalendar } from "@/components/add-to-calendar/AddToCalendar";

import { useAppointmentDetail } from "./appointmentDetail.hooks";

const durationToPlainText = {
  HALF_AN_HOUR: "30 minutes",
  ONE_HOUR: "1 heure",
  TWO_HOURS: "2 heures",
  THREE_HOURS: "3 heures",
  FOUR_HOURS: "4 heures",
} as const;

const AppointmentDetailPage = () => {
  const { appointment, organism } = useAppointmentDetail();

  if (!appointment) return null;
  return (
    <div className="flex flex-col gap-4 w-full">
      <Breadcrumb
        currentPageLabel={appointment.title}
        className="mb-0"
        segments={[
          {
            label: "Ma candidature",
            linkProps: {
              href: "../../",
            },
          },
          {
            label: "Mes prochains rendez-vous",
            linkProps: {
              href: "../",
            },
          },
        ]}
      />
      <div className="flex flex-col w-full gap-12">
        <h1 className="mb-0">{appointment.title}</h1>
        <div className="flex flex-col gap-6">
          <div className="flex max-w-96">
            <GenericAppointmentTile
              date={appointment.date}
              type={appointment.type}
              showTimezone
            />
          </div>
          <div className="px-4 flex flex-col gap-4">
            <table className="w-full">
              <tr className="border-b">
                <td className="w-1/3 py-4">Programmé par :</td>
                <td
                  className="w-2/3 font-bold py-4"
                  data-testid="appointment-organized-by"
                >
                  {organism?.nomPublic || organism?.label}
                </td>
              </tr>
              <tr className="border-b">
                <td className="w-1/3 py-4">Durée : </td>
                <td
                  className="w-2/3 font-bold py-4"
                  data-testid="appointment-duration"
                >
                  {appointment.duration
                    ? durationToPlainText[appointment.duration]
                    : "Non renseigné, pour plus d’information contactez la personne à l’initiative de ce rendez-vous."}
                </td>
              </tr>
              <tr className="border-b ">
                <td className="w-1/3 py-4">Lieu : </td>
                <td
                  className="w-2/3 font-bold py-4"
                  data-testid="appointment-location"
                >
                  {appointment.location ||
                    "Non renseigné, pour plus d’information contactez la personne à l’initiative de ce rendez-vous."}
                </td>
              </tr>
              <tr className="border-b ">
                <td className="w-1/3 py-4">Description : </td>
                <td
                  className="w-2/3 font-bold py-4"
                  data-testid="appointment-description"
                >
                  {appointment.description ||
                    "Non renseigné, pour plus d’information contactez la personne à l’initiative de ce rendez-vous."}
                </td>
              </tr>
            </table>
            <div className="self-end">
              <AddToCalendar appointment={appointment} />
            </div>
          </div>
        </div>
        <Button linkProps={{ href: "../" }} priority="secondary">
          Retour
        </Button>
      </div>
    </div>
  );
};

export default AppointmentDetailPage;
