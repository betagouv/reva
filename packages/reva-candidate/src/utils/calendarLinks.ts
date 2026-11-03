import {
  AppointmentDuration,
  AppointmentType,
} from "@/graphql/generated/graphql";

type AppointmentForCalendar = {
  id: string;
  title: string;
  date: string;
  type: AppointmentType;
  description: string | null;
  duration: AppointmentDuration | null;
  location: string | null;
};

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

const durationToMinutes: Record<string, number> = {
  HALF_AN_HOUR: 30,
  ONE_HOUR: 60,
  TWO_HOURS: 120,
  THREE_HOURS: 180,
  FOUR_HOURS: 240,
} as const;

const calculateAppointmentEnd = (appointment: AppointmentForCalendar) => {
  if (!appointment.duration) return appointment.date;
  const appointmentEnd = new Date(appointment.date);
  appointmentEnd.setMinutes(
    appointmentEnd.getMinutes() + durationToMinutes[appointment.duration],
  );
  return appointmentEnd.toISOString();
};

export const createGoogleCalendarLink = (
  appointment: AppointmentForCalendar,
) => {
  const appointmentStart = appointment.date
    .replace(/[-:]/g, "")
    .replace(/00\.000Z$/, "00Z");
  const appointmentEnd = calculateAppointmentEnd(appointment)
    .replace(/[-:]/g, "")
    .replace(/00\.000Z$/, "00Z");
  return encodeURI(
    `https://calendar.google.com/calendar/u/0/r/eventedit?text=${appointment.title}&dates=${appointmentStart}/${appointmentEnd ? appointmentEnd : appointmentStart}${appointment.location ? `&location=${appointment.location}` : ""}${appointment.description ? `&details=${appointment.description}` : ""}`,
  );
};
export const createOutlookCalendarLink = (
  appointment: AppointmentForCalendar,
) => {
  const appointmentEnd = calculateAppointmentEnd(appointment);
  return encodeURI(
    `https://outlook.office.com/calendar/0/deeplink/compose?subject=${appointment.title}&startdt=${appointment.date}${appointmentEnd ? `&enddt=${appointmentEnd}` : ""}${appointment.location ? `&location=${appointment.location}` : ""}${appointment.description ? `&body=${appointment.description}` : ""}`,
  );
};

export const createIcsFile = (appointment: AppointmentForCalendar) => {
  const appointmentStart = appointment.date
    .replace(/[-:]/g, "")
    .replace(/00\.000Z$/, "00Z");
  const appointmentEnd = calculateAppointmentEnd(appointment)
    .replace(/[-:]/g, "")
    .replace(/00\.000Z$/, "00Z");
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//France VAE//FR\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nBEGIN:VEVENT\nUID:${appointment.id}\nDTSTART:${appointmentStart}\nDTEND:${appointmentEnd}\nSUMMARY:${appointment.title}\nLOCATION:${appointment.location}\nDESCRIPTION:${appointment.description}\nEND:VEVENT\nEND:VCALENDAR`;
};

export const createIcsFileForJury = (jury: JuryForCalendar) => {
  const appointmentStart = new Date(jury.dateOfSession)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/00\.000Z$/, "00Z");
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//France VAE//FR\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nBEGIN:VEVENT\nUID:${jury.id}\nDTSTART:${appointmentStart}\nDTEND:${appointmentStart}\nSUMMARY:Jury VAE - ${jury.candidacy?.feasibility?.certificationAuthority?.label}\nLOCATION:${jury.addressOfSession}\nDESCRIPTION:${jury.informationOfSession}\nEND:VEVENT\nEND:VCALENDAR`;
};

export const createGoogleCalendarLinkForJury = (jury: JuryForCalendar) => {
  const appointmentStart = new Date(jury.dateOfSession)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/00\.000Z$/, "00Z");
  return encodeURI(
    `https://calendar.google.com/calendar/u/0/r/eventedit?text=Jury VAE - ${jury.candidacy?.feasibility?.certificationAuthority?.label}&dates=${appointmentStart}/${appointmentStart}${jury.addressOfSession ? `&location=${jury.addressOfSession}` : ""}${jury.informationOfSession ? `&details=${jury.informationOfSession}` : ""}`,
  );
};

export const createOutlookCalendarLinkForJury = (jury: JuryForCalendar) => {
  const appointmentStart = new Date(jury.dateOfSession)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/00\.000Z$/, "00Z");
  return encodeURI(
    `https://outlook.office.com/calendar/0/deeplink/compose?subject=${jury.candidacy?.feasibility?.certificationAuthority?.label}&startdt=${appointmentStart}${jury.addressOfSession ? `&enddt=${appointmentStart}` : ""}${jury.informationOfSession ? `&body=${jury.informationOfSession}` : ""}`,
  );
};
