import { Appointment } from "@/graphql/generated/types";

const durationToMinutes = {
  HALF_AN_HOUR: 30,
  ONE_HOUR: 60,
  TWO_HOURS: 120,
  THREE_HOURS: 180,
  FOUR_HOURS: 240,
} as const;

const calculateAppointmentEnd = (
  appointment: Omit<Appointment, "temporalStatus" | "type">,
) => {
  if (!appointment.duration) return appointment.date;
  const appointmentEnd = new Date(appointment.date);
  appointmentEnd.setMinutes(
    appointmentEnd.getMinutes() + durationToMinutes[appointment.duration],
  );
  return appointmentEnd.toISOString();
};

export const createGoogleCalendarLink = (
  appointment: Omit<Appointment, "temporalStatus" | "type">,
) => {
  const appointmentStart = appointment.date
    .replace(/[-:]/g, "")
    .replace(/00\.000Z$/, "00Z");
  const appointmentEnd = calculateAppointmentEnd(appointment)
    .replace(/[-:]/g, "")
    .replace(/00\.000Z$/, "00Z");
  return encodeURI(
    `https://calendar.google.com/calendar/u/0/r/eventedit?text=${appointment.title}&dates=${appointmentStart}/${appointmentEnd}${appointment.location ? `&location=${appointment.location}` : ""}${appointment.description ? `&details=${appointment.description}` : ""}`,
  );
};
export const createOutlookCalendarLink = (
  appointment: Omit<Appointment, "temporalStatus" | "type">,
) => {
  const appointmentEnd = calculateAppointmentEnd(appointment);
  return encodeURI(
    `https://outlook.office.com/calendar/0/deeplink/compose?subject=${appointment.title}&startdt=${appointment.date}${appointmentEnd ? `&enddt=${appointmentEnd}` : ""}${appointment.location ? `&location=${appointment.location}` : ""}${appointment.description ? `&body=${appointment.description}` : ""}`,
  );
};

export const createIcsFile = (
  appointment: Omit<Appointment, "temporalStatus" | "type">,
) => {
  const appointmentStart = appointment.date
    .replace(/[-:]/g, "")
    .replace(/00\.000Z$/, "00Z");
  const appointmentEnd = calculateAppointmentEnd(appointment)
    .replace(/[-:]/g, "")
    .replace(/00\.000Z$/, "00Z");
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//France VAE//FR\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nBEGIN:VEVENT\nUID:${appointment.id}\nDTSTART:${appointmentStart}\nDTEND:${appointmentEnd}\nSUMMARY:${appointment.title}\nLOCATION:${appointment.location}\nDESCRIPTION:${appointment.description}\nEND:VEVENT\nEND:VCALENDAR`;
};
