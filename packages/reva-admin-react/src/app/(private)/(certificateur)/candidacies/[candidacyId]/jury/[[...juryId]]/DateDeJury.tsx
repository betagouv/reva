"use client";

import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  add,
  endOfDay,
  format,
  isAfter,
  isBefore,
  startOfDay,
  toDate,
} from "date-fns";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { errorToast } from "@/components/toast/toast";
import {
  sanitizedOptionalText,
  sanitizedOptionalTextAllowSpecialCharacters,
  sanitizedText,
} from "@/utils/input-sanitization";

import { DateDeJuryCard } from "./DateDeJuryCard";
import { HistoryDateDeJuryView } from "./HistoryDateDeJuryView";
import { useJuryPageLogic } from "./juryPageLogic";

const schema = z
  .object({
    date: sanitizedText(),
    time: sanitizedOptionalText(),
    address: sanitizedOptionalText(),
    information: sanitizedOptionalTextAllowSpecialCharacters(),
    convocationFile: z.object({ 0: z.instanceof(File).optional() }),
    dossierValidationUpdatedAt: z.string(),
  })
  .superRefine((data, ctx) => {
    const date = data.date;
    if (!date) {
      ctx.addIssue({
        path: ["date"],
        message: "La date est obligatoire",
        code: "custom",
      });
    }
    if (isAfter(toDate(date), endOfDay(add(new Date(), { years: 2 })))) {
      ctx.addIssue({
        path: ["date"],
        message: "La date doit être inférieure à 2 ans",
        code: "custom",
      });
    }
  });

type DateDeJuryFormData = z.infer<typeof schema>;

export const DateDeJury = () => {
  const { getCandidacy, scheduleJury } = useJuryPageLogic();

  const candidacy = getCandidacy.data?.getCandidacyById;
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<DateDeJuryFormData>({
    resolver: standardSchemaResolver(schema),
    mode: "all",
  });

  useEffect(() => {
    if (candidacy?.jury?.dateOfSession) {
      setValue(
        "date",
        format(toDate(candidacy.jury.dateOfSession), "yyyy-MM-dd"),
      );
      setValue("time", format(toDate(candidacy.jury.dateOfSession), "HH:mm"));
    }
  }, [candidacy?.jury?.dateOfSession, setValue]);

  useEffect(() => {
    if (candidacy?.activeDossierDeValidation?.updatedAt) {
      setValue(
        "dossierValidationUpdatedAt",
        format(
          toDate(candidacy.activeDossierDeValidation.updatedAt),
          "yyyy-MM-dd",
        ),
      );
    }
  }, [candidacy?.activeDossierDeValidation?.updatedAt, setValue]);

  const handleFormSubmit = handleSubmit(async (data) => {
    if (candidacy?.id) {
      try {
        let date = toDate(`${data.date}T00:00:00`).valueOf().toString();
        let time;
        if (data.time) {
          date = toDate(data.date)
            .setHours(
              Number(data.time.split(":")[0]),
              Number(data.time.split(":")[1]),
            )
            .valueOf()
            .toString();
          time = toDate(format(`${data.date}T${data.time}`, "yyyy-MM-dd HH:mm"))
            .valueOf()
            .toString();
        }
        const response = await scheduleJury.mutateAsync({
          ...data,
          date,
          time,
          timeSpecified: !!data.time,
          candidacyId: candidacy.id,
          convocationFile: data.convocationFile?.[0],
        });

        const textError = await response.text();
        if (textError) {
          errorToast(textError);

          console.error(textError);
        } else {
          setEditing(false);
        }
      } catch (error) {
        console.error(error);
      }
    }
  });

  const [editing, setEditing] = useState<boolean>(false);

  const jury = candidacy?.jury;
  const historyJury = candidacy?.historyJury;

  const editable = candidacy?.jury
    ? isBefore(new Date(), startOfDay(candidacy?.jury.dateOfSession)) &&
      !jury?.result
    : false;

  return (
    <>
      <h3>Date de passage devant le jury à programmer</h3>

      <div className="flex flex-col gap-10">
        {!jury && (
          <p className="m-0 text-gray-600">
            Vous devez désormais envoyer au candidat sa date de passage. Vous
            pouvez également lui faire parvenir une convocation officielle
            depuis cet espace ou par voie postale.
          </p>
        )}

        {historyJury && (
          <HistoryDateDeJuryView
            historyJury={historyJury.map((jury) => ({
              id: jury.id,
              dateOfSession: jury.dateOfSession,
              timeSpecified: jury.timeSpecified,
              addressOfSession: jury.addressOfSession,
              informationOfSession: jury.informationOfSession,
              convocationFile: jury.convocationFile,
            }))}
          />
        )}

        <div className="flex flex-col gap-2">
          <h6 className="m-0 font-normal">Certification concernée :</h6>

          <div className="flex flex-col gap-3 p-6 border">
            <div className="flex flex-row gap-2 items-center text-gray-600">
              <span className="fr-icon fr-icon--sm fr-icon-award-line" />
              <label className="text-gray-600 text-xs">
                RNCP {candidacy?.certification?.codeRncp}
              </label>
            </div>
            <label className="text-lg font-bold">
              {candidacy?.certification?.label}
            </label>
          </div>
        </div>

        {!getCandidacy.isLoading && jury && !editing && (
          <>
            <DateDeJuryCard
              jury={{
                id: jury.id,
                dateOfSession: jury.dateOfSession,
                timeSpecified: jury.timeSpecified,
                addressOfSession: jury.addressOfSession,
                informationOfSession: jury.informationOfSession,
                convocationFile: jury.convocationFile,
              }}
            />

            {editable && (
              <div className="flex flex-row items-end justify-between gap-4">
                <Button
                  priority="secondary"
                  className="ml-auto mt-8 text-right"
                  onClick={() => setEditing(true)}
                >
                  Modifier
                </Button>
              </div>
            )}
          </>
        )}

        {!getCandidacy.isLoading && (!jury || editing) && (
          <form onSubmit={handleFormSubmit}>
            <div className="flex flex-row items-start gap-4">
              <Input
                label="Date"
                nativeInputProps={{
                  ...register("date"),
                  type: "date",
                }}
                state={errors.date ? "error" : "default"}
                stateRelatedMessage={errors.date?.message}
              />
              <Input
                label="Heure de convocation (Optionnel)"
                nativeInputProps={{
                  type: "time",
                  ...register("time"),
                  defaultValue: jury?.timeOfSession || "",
                }}
                state={errors.time ? "error" : "default"}
                stateRelatedMessage={errors.time?.message}
              />
              <Input
                className="flex-1"
                label="Lieu (Optionnel)"
                nativeInputProps={{
                  ...register("address"),
                  defaultValue: jury?.addressOfSession || "",
                }}
                state={errors.address ? "error" : "default"}
                stateRelatedMessage={errors.address?.message}
              />
              <input
                type="hidden"
                {...register("dossierValidationUpdatedAt")}
              />
            </div>
            <Input
              label="Information complémentaire liée à la session (Optionnel)"
              nativeInputProps={{
                ...register("information"),
                defaultValue: jury?.informationOfSession || "",
              }}
              state={errors.information ? "error" : "default"}
              stateRelatedMessage={errors.information?.message}
            />
            <FancyUpload
              title="Joindre la convocation officielle (optionnel)"
              description=""
              hint="Format supporté : PDF uniquement avec un poids maximum de 15 Mo"
              nativeInputProps={{
                ...register("convocationFile"),
              }}
              state={errors.convocationFile ? "error" : "default"}
              stateRelatedMessage={errors.convocationFile?.[0]?.message}
            />

            <div className="flex flex-row items-end justify-end mt-8 gap-4">
              {editing && (
                <Button priority="secondary" onClick={() => setEditing(false)}>
                  Annuler
                </Button>
              )}

              <Button disabled={isSubmitting || !isValid}>Envoyer</Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
};
