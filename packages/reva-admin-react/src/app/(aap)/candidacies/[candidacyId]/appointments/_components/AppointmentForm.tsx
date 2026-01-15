import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { Select } from "@codegouvfr/react-dsfr/Select";
import { zodResolver } from "@hookform/resolvers/zod";
import { isBefore, parseISO, startOfToday } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AddToCalendar } from "@/components/add-to-calendar/AddToCalendar";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import {
  sanitizedOptionalTextAllowSpecialCharacters,
  sanitizedText,
} from "@/utils/input-sanitization";

const appointmentFormSchema = z
  .object({
    title: sanitizedText(),
    date: sanitizedText(),
    time: sanitizedText(),
    duration: z
      .enum([
        "",
        "HALF_AN_HOUR",
        "ONE_HOUR",
        "TWO_HOURS",
        "THREE_HOURS",
        "FOUR_HOURS",
      ])
      .optional()
      .nullable(),
    location: sanitizedOptionalTextAllowSpecialCharacters().nullable(),
    description: sanitizedOptionalTextAllowSpecialCharacters().nullable(),
  })
  .superRefine((data, ctx) => {
    if (isBefore(parseISO(data.date), startOfToday())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "La date ne doit pas être dans le passé",
      });
    }
  });

export type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

export const AppointmentForm = ({
  onSubmit,
  backUrl,
  defaultValues,
  onDeleteButtonClick,
}: {
  backUrl: string;
  onSubmit: (data: AppointmentFormData) => void;
  defaultValues?: Partial<AppointmentFormData>;
  onDeleteButtonClick?: () => void;
}) => {
  const {
    register,
    handleSubmit,
    formState: { isDirty, isSubmitting, errors },
    getValues,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues,
  });

  const dateValue = getValues("date");
  const timeValue = getValues("time");
  const date =
    dateValue && timeValue
      ? new Date(`${dateValue}T${timeValue}`).toISOString()
      : new Date().toISOString();
  const appointment = {
    id: btoa(getValues("title")),
    title: getValues("title"),
    date,
    duration: getValues("duration") || null,
    location: getValues("location"),
    description: getValues("description"),
  };

  return (
    <form
      className="w-full grid grid-cols-1 md:grid-cols-3 gap-x-6"
      onSubmit={handleSubmit(onSubmit, (e) => console.error(e))}
    >
      <Input
        data-testid="title-input"
        label="Intitulé :"
        className="col-span-full"
        nativeInputProps={{ ...register("title") }}
        state={errors.title ? "error" : "default"}
        stateRelatedMessage={errors.title?.message}
      />
      <Input
        data-testid="date-input"
        label="Date :"
        nativeInputProps={{ type: "date", ...register("date") }}
        state={errors.date ? "error" : "default"}
        stateRelatedMessage={errors.date?.message}
      />
      <Input
        data-testid="time-input"
        label="Heure de convocation :"
        nativeInputProps={{ type: "time", ...register("time") }}
        state={errors.time ? "error" : "default"}
        stateRelatedMessage={errors.time?.message}
      />
      <Select
        data-testid="duration-input"
        label="Durée estimée: (Optionnel)"
        nativeSelectProps={{ ...register("duration") }}
        state={errors.duration ? "error" : "default"}
        stateRelatedMessage={errors.duration?.message}
      >
        <option value=""></option>
        <option value="HALF_AN_HOUR">30 minutes</option>
        <option value="ONE_HOUR">1 heure</option>
        <option value="TWO_HOURS">2 heures</option>
        <option value="THREE_HOURS">3 heures</option>
        <option value="FOUR_HOURS">4 heures</option>
      </Select>
      <Input
        data-testid="location-input"
        label="Lieu : (Optionnel)"
        hintText="Ajouter une adresse, un lieu ou un lien de visioconférence en fonction de la modalité d’accompagnement envisagée."
        className="col-span-full"
        nativeInputProps={{ ...register("location") }}
        state={errors.location ? "error" : "default"}
        stateRelatedMessage={errors.location?.message}
      />
      <Input
        data-testid="description-input"
        textArea
        nativeTextAreaProps={{ rows: 3, ...register("description") }}
        label="Description : (Optionnel)"
        className="col-span-full"
        state={errors.description ? "error" : "default"}
        stateRelatedMessage={errors.description?.message}
      />
      <div className="flex flex-col sm:flex-row gap-4 col-span-full justify-between">
        {onDeleteButtonClick && (
          <Button
            data-testid="delete-appointment-button"
            type="button"
            onClick={onDeleteButtonClick}
            priority="tertiary no outline"
            iconId="fr-icon-delete-line"
            className="col-span-full"
          >
            Supprimer ce rendez-vous
          </Button>
        )}
        <div className="ml-auto">
          <AddToCalendar appointment={appointment} />
        </div>
      </div>
      <FormButtons
        className="col-span-full"
        backUrl={backUrl}
        backButtonLabel="Annuler"
        formState={{ isDirty, isSubmitting }}
        disabled={!isDirty}
      />
    </form>
  );
};
