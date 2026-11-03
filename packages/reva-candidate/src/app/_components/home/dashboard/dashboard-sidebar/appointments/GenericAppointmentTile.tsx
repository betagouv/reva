import Tag from "@codegouvfr/react-dsfr/Tag";
import Tile from "@codegouvfr/react-dsfr/Tile";
import { addMinutes, format } from "date-fns";
import { useMemo } from "react";

import { formatIso8601Date } from "@/utils/formatIso8601Date";
import { formatIso8601Time } from "@/utils/formatIso8601Time";

import { AppointmentType } from "@/graphql/generated/graphql";

export const GenericAppointmentTile = ({
  id,
  date,
  type,
  showTimezone = false,
}: {
  id?: string;
  date: string;
  type: AppointmentType;
  showTimezone?: boolean;
}) => {
  const now = useMemo(() => new Date(), []);
  const timezoneOffset = useMemo(() => -now.getTimezoneOffset(), [now]);

  const timezoneName = useMemo(() => {
    if (!showTimezone) {
      return null;
    }
    const nowLocaleString = now.toLocaleDateString(undefined, {
      day: "2-digit",
      timeZoneName: "long",
    });
    return (
      nowLocaleString.substring(3).charAt(0).toUpperCase() +
      nowLocaleString.substring(3).slice(1)
    );
  }, [now, showTimezone]);

  const formatedOffset = useMemo(() => {
    if (!showTimezone) {
      return null;
    }
    const dateAtMidnight = now.setHours(0, 0, 0, 0);
    const dateWithAddedOffset = addMinutes(dateAtMidnight, timezoneOffset);
    return format(dateWithAddedOffset, "HH:mm");
  }, [now, timezoneOffset, showTimezone]);

  return id ? (
    <Tile
      data-testid="rendez-vous-generique-tile"
      small
      orientation="horizontal"
      classes={{
        content: "pb-0",
      }}
      start={
        <Tag small>
          {type === "RENDEZ_VOUS_PEDAGOGIQUE"
            ? "Rendez-vous pédagogique"
            : "Rendez-vous de suivi"}
        </Tag>
      }
      title={`${formatIso8601Date(date)} - ${formatIso8601Time(date)}`}
      desc={
        showTimezone
          ? `(GMT${timezoneOffset > 0 ? "+" : ""}${formatedOffset}) ${timezoneName}`
          : ""
      }
      linkProps={{ href: `./appointments/${id}` }}
    />
  ) : (
    <Tile
      data-testid="rendez-vous-generique-tile"
      small
      orientation="horizontal"
      classes={{
        content: "pb-0",
      }}
      start={
        <Tag small>
          {type === "RENDEZ_VOUS_PEDAGOGIQUE"
            ? "Rendez-vous pédagogique"
            : "Rendez-vous de suivi"}
        </Tag>
      }
      title={`${formatIso8601Date(date)} - ${formatIso8601Time(date)}`}
      desc={
        showTimezone
          ? `(GMT${timezoneOffset > 0 ? "+" : ""}${formatedOffset}) ${timezoneName}`
          : ""
      }
    />
  );
};
