import Alert from "@codegouvfr/react-dsfr/Alert";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import Input from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import Select from "@codegouvfr/react-dsfr/Select";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format, isAfter, toDate } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { successToast } from "@/components/toast/toast";
import { sanitizedText } from "@/utils/input-sanitization";

import { EndAccompagnementReason } from "@/graphql/generated/graphql";

import { useEndAccompagnement } from "../end-accompagnement.hook";

const schema = z
  .object({
    endAccompagnementDate: sanitizedText(),
    endAccompagnementReason: z.enum([
      "",
      "CONTRAT_ACCOMPAGNEMENT_TERMINE",
      "CHOIX_CANDIDAT",
      "CHOIX_AAP",
      "ABANDON_OU_NON_REPONSE_CANDIDAT",
      "FERMETURE_STRUCTURE",
      "AUCUN_ACCOMPAGNEMENT_CONTRACTUALISE",
    ]),
    isCandidateDropOut: z.boolean(),
    endAccompagnementCandidateDropOutReasonId: sanitizedText({ minLength: 0 }),
  })
  .superRefine(
    (
      {
        endAccompagnementDate,
        endAccompagnementReason,
        isCandidateDropOut,
        endAccompagnementCandidateDropOutReasonId,
      },
      ctx,
    ) => {
      const dateIsInFuture = isAfter(endAccompagnementDate, new Date());
      if (dateIsInFuture) {
        ctx.addIssue({
          code: "custom",
          message:
            "La date de fin d'accompagnement ne peut pas être dans le futur",
          path: ["endAccompagnementDate"],
        });
      }

      if (!endAccompagnementReason) {
        ctx.addIssue({
          code: "custom",
          message: "Veuillez sélectionner un motif",
          path: ["endAccompagnementReason"],
        });
      }

      if (isCandidateDropOut && !endAccompagnementCandidateDropOutReasonId) {
        ctx.addIssue({
          code: "custom",
          message: "Veuillez sélectionner un motif",
          path: ["endAccompagnementCandidateDropOutReasonId"],
        });
      }
    },
  );

const confirmationModal = createModal({
  id: "confirmation-modal",
  isOpenedByDefault: false,
});

export const EndAccompagnementForm = () => {
  const router = useRouter();
  const {
    candidacy,
    candidacyId,
    candidate,
    certification,
    feasibility,
    activeDropoutReasons,
    submitEndAccompagnement,
  } = useEndAccompagnement();

  const {
    handleSubmit,
    formState,
    register,
    watch,
    formState: { errors },
    reset,
    getValues,
  } = useForm<z.infer<typeof schema>>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      endAccompagnementDate: candidacy?.endAccompagnementDate
        ? format(candidacy?.endAccompagnementDate, "yyyy-MM-dd")
        : undefined,
      endAccompagnementReason: undefined,
      isCandidateDropOut: false,
      endAccompagnementCandidateDropOutReasonId: undefined,
    },
  });

  const backUrl = `/candidacies/${candidacyId}/summary`;

  const handleFormSubmit = handleSubmit(() => {
    confirmationModal.open();
  });

  const candidacyFullName = `${candidate?.lastname} ${candidate?.firstname}`;
  const endAccompagnementDate = watch("endAccompagnementDate");
  const isCandidateDropOut = watch("isCandidateDropOut");

  const handleConfirmButtonClick = async () => {
    const data = getValues();

    const endAccompagnementTimestamp = toDate(
      data.endAccompagnementDate,
    ).getTime();
    const endAccompagnementReasonId = data.isCandidateDropOut
      ? data.endAccompagnementCandidateDropOutReasonId
      : undefined;

    await submitEndAccompagnement({
      endAccompagnementDate: endAccompagnementTimestamp,
      endAccompagnementReason:
        data.endAccompagnementReason as EndAccompagnementReason,
      endAccompagnementCandidateDropOutReasonId: endAccompagnementReasonId,
    });
    successToast("La demande de fin d'accompagnement a bien été enregistrée");
    router.push(backUrl);
  };

  const handleReset = useCallback(() => {
    reset({
      endAccompagnementDate: candidacy?.endAccompagnementDate
        ? format(candidacy?.endAccompagnementDate, "yyyy-MM-dd")
        : undefined,
    });
  }, [reset, candidacy?.endAccompagnementDate]);

  useEffect(() => {
    handleReset();
  }, [handleReset]);

  return (
    <>
      <form
        className="flex flex-col gap-6"
        onSubmit={handleFormSubmit}
        onReset={(e) => {
          e.preventDefault();
          handleReset();
        }}
      >
        <Input
          label="Date de fin d'accompagnement :"
          nativeInputProps={{
            type: "date",
            ...register("endAccompagnementDate"),
          }}
          className="m-0 max-w-64"
          state={errors.endAccompagnementDate ? "error" : "default"}
          stateRelatedMessage={errors.endAccompagnementDate?.message}
        />
        <Select
          className="m-0"
          state={errors.endAccompagnementReason ? "error" : "default"}
          stateRelatedMessage={errors.endAccompagnementReason?.message}
          label="Motif de la fin d'accompagnement"
          nativeSelectProps={{
            ...register("endAccompagnementReason"),
            defaultValue: "",
          }}
          data-testid="end-accompagnement-reason-select"
        >
          <option value="" disabled>
            Sélectionner une option
          </option>
          <option value="CONTRAT_ACCOMPAGNEMENT_TERMINE">
            Le contrat d’accompagnement est terminé
          </option>
          <option value="CHOIX_CANDIDAT">
            Choix du candidat de mettre fin à l’accompagnement (ex : nouvel
            accompagnateur, parcours en autonomie)
          </option>
          <option value="CHOIX_AAP">
            Décision de l’AAP de mettre fin à l’accompagnement (ex : non respect
            des CGV par le candidat)
          </option>
          <option value="ABANDON_OU_NON_REPONSE_CANDIDAT">
            Abandon du candidat ou non-réponse du candidat après 3 relances
          </option>
          <option value="FERMETURE_STRUCTURE">
            Fermeture de la structure (ex : liquidation)
          </option>
          <option value="AUCUN_ACCOMPAGNEMENT_CONTRACTUALISE">
            Aucun accompagnement n'a été contractualisé (ex : le candidat ne
            souhaite finalement pas que vous l'accompagniez)
          </option>
        </Select>

        <div className="border border-neutral-300 p-4 flex flex-col gap-4">
          <Checkbox
            small
            data-testid="is-candidate-drop-out-checkbox"
            options={[
              {
                label:
                  "La fin de l’accompagnement est liée à un abandon de la candidature signalé par le candidat",
                hintText:
                  "Cette information est collectée à des fins statistiques : elle n'a pas d'impact sur le parcours du candidat",
                nativeInputProps: {
                  ...register("isCandidateDropOut"),
                },
              },
            ]}
          />
          <Select
            className="m-0"
            state={
              errors.endAccompagnementCandidateDropOutReasonId
                ? "error"
                : "default"
            }
            stateRelatedMessage={
              errors.endAccompagnementCandidateDropOutReasonId?.message
            }
            label="Motif de l'abandon"
            nativeSelectProps={{
              ...register("endAccompagnementCandidateDropOutReasonId"),
            }}
            disabled={!isCandidateDropOut}
          >
            <option value="" hidden>
              Sélectionner une option
            </option>
            {activeDropoutReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.label}
              </option>
            ))}
          </Select>
        </div>

        <Alert
          severity="info"
          title=""
          description="Le candidat devra valider cette action depuis son espace, dès sa prochaine connexion."
          small
          className="m-0"
        />
        <FormButtons
          formState={formState}
          backButtonLabel="Annuler"
          backUrl={backUrl}
          submitButtonLabel="Valider"
        />
      </form>
      <confirmationModal.Component
        title="Déclarer une fin d'accompagnement ?"
        buttons={[
          {
            priority: "secondary",
            children: "Annuler",
          },
          {
            priority: "primary",
            children: "Confirmer",
            onClick: handleConfirmButtonClick,
          },
        ]}
        size="large"
      >
        <h4 className="mb-4"></h4>
        <p>
          Vous êtes sur le point de mettre fin à l'accompagnement de
          <strong>{` ${candidacyFullName} `}</strong>à compter du{" "}
          <strong>
            {endAccompagnementDate
              ? format(endAccompagnementDate, "dd/MM/yyyy")
              : "---"}
          </strong>{" "}
          sur la certification{" "}
          <strong>
            RNCP {certification?.codeRncp}: {certification?.label}.
          </strong>
        </p>
        <p className="font-bold">
          Quelles sont les conséquences d’une fin d’accompagnement à cette étape
          ?
        </p>
        {feasibility?.feasibilityFileSentAt ? (
          <ul>
            <li>
              Le candidat aura toujours accès à sa candidature pour la finaliser
            </li>
            <li>Vous ne pourrez plus l’accompagner</li>
          </ul>
        ) : (
          <ul>
            <li>
              Le candidat aura toujours accès à sa candidature pour la finaliser
            </li>
            <li>Vous ne pourrez plus l’accompagner</li>
            <li>
              Les informations renseignées dans le parcours pédagogique et dans
              le dossier de faisabilité seront supprimées.
            </li>
          </ul>
        )}
        <p className="mt-6">Confirmez-vous cette action ?</p>
      </confirmationModal.Component>
    </>
  );
};
