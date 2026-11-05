"use client";

import { Button } from "@codegouvfr/react-dsfr/Button";
import { Stepper } from "@codegouvfr/react-dsfr/Stepper";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useEffect, useState } from "react";

import { useKeycloakContext } from "@/components/auth/keycloakContext";
import { SettingsPageHeader } from "@/components/settings/settings-page-header/SettingsPageHeader";
import { errorToast, graphqlErrorToast } from "@/components/toast/toast";
import { REST_API_URL } from "@/config/config";

import { UpdateMaisonMereLegalInformationInput } from "@/graphql/generated/types";

import {
  buildLegalInformationPayload,
  Etablissement,
  GeneralInformationFormValues,
  generalInformationSchema,
  useGeneralInformationPage,
} from "../../generalInformationPage.hook";
import { LegalInformationBreadcrumb } from "../_components/LegalInformationBreadcrumb";
import { LegalInformationTutorialHelp } from "../_components/LegalInformationTutorialHelp";

import { AdministratorStep } from "./_components/AdministratorStep";
import { BlockKey, BlockSelectionStep } from "./_components/BlockSelectionStep";
import { ContactStep } from "./_components/ContactStep";
import {
  DocumentsFormValues,
  DocumentsStep,
  useDocumentsForm,
} from "./_components/DocumentsStep";
import { getRequiredDocuments } from "./_components/requiredDocuments";
import { SiretAndManagerStep } from "./_components/SiretAndManagerStep";

const STEP_TITLES = {
  identity: "Informations relatives au SIRET et à l'identité du dirigeant",
  administrator: "Administrateur du compte",
  contact: "Informations de connexion et de contact",
  documents: "Pièces justificatives",
};

type StepKey = keyof typeof STEP_TITLES;

const ALL_BLOCKS: BlockKey[] = ["siret", "manager", "administrator", "contact"];

// L'enregistrement valide tous les champs, y compris ceux des blocs non
// sélectionnés: une valeur invalide déjà en base doit pouvoir être nommée à
// l'utilisateur, même si son champ n'est pas affiché à l'étape courante.
const FIELD_LABELS: Record<string, string> = {
  siret: "le numéro de SIRET",
  managerFirstname: "le prénom du dirigeant",
  managerLastname: "le nom du dirigeant",
  gestionnaireFirstname: "le prénom de l'administrateur du compte",
  gestionnaireLastname: "le nom de l'administrateur du compte",
  gestionnaireEmail: "l'adresse électronique de connexion",
  phone: "le téléphone",
};

const TargetedLegalInformationUpdatePage = () => {
  const {
    maisonMereAAP,
    maisonMereAAPId,
    etablissement,
    etablissementIsFetching,
    siretNotFound,
    isAdmin,
    formHook,
    updateMaisonMereLegalInformation,
  } = useGeneralInformationPage();

  const { accessToken } = useKeycloakContext();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<"selection" | "steps" | "success" | null>(
    null,
  );
  const [selectedBlocks, setSelectedBlocks] = useState<BlockKey[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  // null tant que l'utilisateur n'a pas touché à la case, la valeur est alors
  // dérivée. Porté par la page: l'étape est démontée à chaque navigation.
  const [administratorIsDifferentPerson, setAdministratorIsDifferentPerson] =
    useState<boolean | null>(null);

  const statut =
    maisonMereAAP?.statutValidationInformationsJuridiquesMaisonMereAAP;

  // L'AAP ne choisit ce qu'il met à jour que sur un compte à jour. Sur une demande
  // de France VAE il reprend tout, et une demande déjà déposée est remplacée en
  // entier: une reprise partielle supprimerait les pièces de la précédente.
  // Décidé une fois, à l'arrivée du statut: un rafraîchissement ne doit pas
  // renvoyer l'utilisateur à un autre écran en cours de parcours.
  useEffect(() => {
    if (isAdmin || !statut || statut === "A_JOUR") {
      return;
    }

    setSelectedBlocks(ALL_BLOCKS);
    setPhase((currentPhase) => currentPhase ?? "steps");
  }, [isAdmin, statut]);

  const startsOnSelectionScreen = isAdmin || statut === "A_JOUR";

  // Statut encore inconnu: aucun écran d'entrée ne peut être choisi.
  const resolvedPhase = phase ?? (startsOnSelectionScreen ? "selection" : null);

  const {
    formState: { isSubmitting, isDirty },
    handleSubmit,
    setError,
    watch,
  } = formHook;

  const values = watch();

  const administratorIsDifferent =
    administratorIsDifferentPerson ??
    (values.managerFirstname !== values.gestionnaireFirstname ||
      values.managerLastname !== values.gestionnaireLastname);

  // Depuis les valeurs en base: seul un compte aujourd'hui tenu par un
  // délégataire peut le perdre.
  const administratorWasDifferent =
    (maisonMereAAP?.gestionnaire?.firstname ?? "") !==
      (maisonMereAAP?.managerFirstname ?? "") ||
    (maisonMereAAP?.gestionnaire?.lastname ?? "") !==
      (maisonMereAAP?.managerLastname ?? "");

  // L'administrateur vérifie les pièces hors ligne: elles ne lui sont pas demandées.
  const requiredDocuments = isAdmin
    ? []
    : getRequiredDocuments({
        blocks: selectedBlocks,
        administratorIsDifferent,
        administratorWasDifferent,
      });

  const documentsForm = useDocumentsForm(requiredDocuments);

  const isSelected = (key: BlockKey) => selectedBlocks.includes(key);

  // Les blocs "Numéro de SIRET" et "Identité du dirigeant" partagent la même étape.
  const steps = (
    [
      isSelected("siret") || isSelected("manager") ? "identity" : null,
      isSelected("administrator") ? "administrator" : null,
      isSelected("contact") ? "contact" : null,
      requiredDocuments.length ? "documents" : null,
    ] as const
  ).filter((step) => step !== null);

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  // DSFR ne dessine aucune barre à une seule étape: un parcours d'un seul bloc
  // se passe donc de stepper.
  const stepperIsVisible = steps.length > 1;
  const siretIsEditable = isSelected("siret");
  const managerIsEditable = isSelected("manager");
  const siretFieldIsVisible = siretIsEditable && currentStep === "identity";

  // Chaque étape ne valide que ses propres champs: les blocs non sélectionnés
  // gardent leurs valeurs en base, éventuellement invalides, et ne doivent pas
  // bloquer le parcours (elles sont signalées à l'enregistrement).
  const stepFields: Record<StepKey, (keyof GeneralInformationFormValues)[]> = {
    identity: [
      ...(siretIsEditable ? (["siret"] as const) : []),
      ...(managerIsEditable
        ? (["managerFirstname", "managerLastname"] as const)
        : []),
    ],
    administrator: ["gestionnaireFirstname", "gestionnaireLastname"],
    contact: ["gestionnaireEmail", "phone"],
    documents: [],
  };

  const documentFiles = documentsForm.watch();

  const stepIsValid = (step: StepKey) =>
    step === "documents"
      ? requiredDocuments.every((document) => documentFiles[document]?.[0])
      : stepFields[step].every(
          (field) =>
            generalInformationSchema.shape[field].safeParse(values[field])
              .success,
        );

  // Calculé à chaque rendu, y compris hors du parcours: sur l'écran de sélection
  // et tant qu'aucun bloc n'est coché, il n'y a pas d'étape courante.
  const currentStepIsValid = !!currentStep && stepIsValid(currentStep);

  // Un SIRET introuvable ne donne ni raison sociale ni statut juridique: la suite
  // du parcours n'aurait rien à enregistrer.
  const siretBlocksNavigation =
    siretFieldIsVisible && (etablissementIsFetching || siretNotFound);

  const generalInformationUrl = `/agencies-settings-v3/${maisonMereAAPId}/general-information`;

  const toggleBlock = (key: BlockKey) =>
    setSelectedBlocks((blocks) =>
      blocks.includes(key)
        ? blocks.filter((block) => block !== key)
        : [...blocks, key],
    );

  const buildPayloadOrToast = (data: GeneralInformationFormValues) => {
    try {
      return buildLegalInformationPayload({
        data,
        etablissement: etablissement as Etablissement,
        maisonMereAAPId,
        currentSiret: maisonMereAAP?.siret,
      });
    } catch (error) {
      const message = (error as Error).message;

      if (siretFieldIsVisible) {
        setError("siret", { message }, { shouldFocus: true });
      } else {
        errorToast(message);
      }

      return null;
    }
  };

  const onInvalidFields = (invalidFields: Record<string, unknown>) => {
    const labels = Object.keys(invalidFields).map(
      (field) => FIELD_LABELS[field] ?? field,
    );

    errorToast(
      `Impossible d'enregistrer : ${labels.join(", ")} ${labels.length > 1 ? "sont invalides" : "est invalide"}. Sélectionnez le bloc correspondant pour corriger.`,
    );
  };

  const handleAdminSave = handleSubmit(async (data) => {
    const payload = buildPayloadOrToast(data);

    if (!payload) {
      return;
    }

    try {
      await updateMaisonMereLegalInformation(payload);
      setPhase("success");
    } catch (error) {
      graphqlErrorToast(error);
    }
  }, onInvalidFields);

  const postLegalInformation = async (
    payload: UpdateMaisonMereLegalInformationInput,
    files: DocumentsFormValues,
  ) => {
    const formData = new FormData();

    formData.append("siret", payload.siret);
    formData.append("raisonSociale", payload.raisonSociale);
    formData.append("statutJuridique", payload.statutJuridique);
    formData.append("managerFirstname", payload.managerFirstname);
    formData.append("managerLastname", payload.managerLastname);
    formData.append("gestionnaireFirstname", payload.gestionnaireFirstname);
    formData.append("gestionnaireLastname", payload.gestionnaireLastname);
    formData.append("gestionnaireEmail", payload.gestionnaireEmail);
    formData.append("phone", payload.phone);
    // Lu par la route, qui recalcule les pièces obligatoires depuis les valeurs reçues.
    formData.append("delegataire", administratorIsDifferent.toString());

    Object.entries(files).forEach(([field, fileList]) => {
      const file = fileList?.[0];

      if (file) {
        formData.append(field, file);
      }
    });

    const result = await fetch(
      `${REST_API_URL}/maisonMereAAP/${maisonMereAAPId}/legal-information`,
      {
        method: "post",
        headers: { authorization: `Bearer ${accessToken}` },
        body: formData,
      },
    );

    if (!result.ok) {
      // La route répond en texte brut sur les erreurs de validation, mais en
      // `{ err }` sur le 403.
      const body = await result.text();

      try {
        return errorToast(JSON.parse(body).err ?? body);
      } catch {
        return errorToast(body);
      }
    }

    queryClient.invalidateQueries({ queryKey: [maisonMereAAPId] });
    setPhase("success");
  };

  // Deux formulaires enchaînés: les informations puis les pièces justificatives.
  const handleAapSubmit = handleSubmit(
    (data) =>
      documentsForm.handleSubmit(async (files) => {
        const payload = buildPayloadOrToast(data);

        if (payload) {
          await postLegalInformation(payload, files);
        }
      })(),
    onInvalidFields,
  );

  if (!resolvedPhase) {
    return null;
  }

  const breadcrumb = (
    <LegalInformationBreadcrumb
      isAdmin={isAdmin}
      maisonMereAAPId={maisonMereAAPId}
      raisonSociale={maisonMereAAP?.raisonSociale}
    />
  );

  if (resolvedPhase === "success") {
    return (
      <div className="flex flex-col md:flex-row md:items-center gap-6 w-full">
        <div className="flex flex-col flex-1">
          <h1 className="text-[40px]">
            {isAdmin
              ? "Votre demande de mise à jour a bien été enregistrée."
              : "Votre demande de mise à jour a bien été envoyée."}
          </h1>
          {isAdmin ? (
            <p className="text-xl mb-0">
              Les modifications sont visibles dès à présent par la structure
              accompagnatrice, depuis son compte administrateur.
            </p>
          ) : (
            <>
              <p className="text-xl mb-6">
                Un administrateur France VAE examinera votre demande dans les
                plus brefs délais.
                <br />
                En attendant la vérification de votre demande, vos informations
                et votre adresse électronique actuels restent inchangés.
              </p>
              <p className="text-xl mb-6">
                Un courriel de confirmation vous sera envoyé une fois votre
                demande vérifiée.
              </p>
              <p className="text-sm mb-0">
                Si vous souhaitez apporter d'autres modifications, veuillez
                attendre que cette demande soit traitée.
              </p>
            </>
          )}
          <Button
            className="mt-10 mr-auto"
            priority="secondary"
            linkProps={{ href: generalInformationUrl }}
          >
            Informations générales
          </Button>
        </div>
        <Image
          className="shrink-0"
          src="/admin2/components/success.svg"
          alt=""
          width={282}
          height={319}
        />
      </div>
    );
  }

  if (resolvedPhase === "selection") {
    return (
      <div className="flex flex-col w-full">
        <SettingsPageHeader
          breadcrumb={breadcrumb}
          title="Mise à jour des informations générales"
          chapo={<LegalInformationTutorialHelp />}
        />
        <BlockSelectionStep
          isAdmin={isAdmin}
          selectedBlocks={selectedBlocks}
          onToggleBlock={toggleBlock}
          onStart={() => setPhase("steps")}
          cancelUrl={generalInformationUrl}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <SettingsPageHeader
        breadcrumb={breadcrumb}
        title="Mise à jour des informations générales"
        chapo="Modifiez les informations souhaitées en cliquant dans l'espace prévu à cet effet."
      />
      {/* Le chapo de SettingsPageHeader apporte déjà les 48px du dessus. */}
      {stepperIsVisible && (
        <Stepper
          currentStep={currentStepIndex + 1}
          stepCount={steps.length}
          title={STEP_TITLES[currentStep]}
          nextTitle={
            isLastStep ? undefined : STEP_TITLES[steps[currentStepIndex + 1]]
          }
        />
      )}
      <form
        className={`flex flex-col ${stepperIsVisible ? "mt-4" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();

          if (!isLastStep) {
            setCurrentStepIndex((index) => index + 1);
          } else if (isAdmin) {
            handleAdminSave();
          } else {
            handleAapSubmit();
          }
        }}
      >
        {currentStep === "identity" && (
          <SiretAndManagerStep
            formHook={formHook}
            etablissement={etablissement as Etablissement}
            etablissementIsFetching={etablissementIsFetching}
            siretNotFound={siretNotFound}
            siretIsSelected={siretIsEditable}
            managerIsSelected={managerIsEditable}
          />
        )}

        {currentStep === "administrator" && (
          <AdministratorStep
            formHook={formHook}
            isDifferentPerson={administratorIsDifferent}
            onIsDifferentPersonChange={setAdministratorIsDifferentPerson}
          />
        )}

        {currentStep === "contact" && <ContactStep formHook={formHook} />}

        {currentStep === "documents" && (
          <DocumentsStep
            formHook={documentsForm}
            requiredDocuments={requiredDocuments}
          />
        )}

        <div className="flex flex-wrap gap-4 mt-12">
          {currentStepIndex > 0 && (
            <Button
              type="button"
              priority="secondary"
              onClick={() => setCurrentStepIndex((index) => index - 1)}
            >
              Retour à l'étape {currentStepIndex}
            </Button>
          )}
          {currentStepIndex === 0 && (
            <Button
              priority="secondary"
              linkProps={{ href: generalInformationUrl }}
            >
              Annuler
            </Button>
          )}
          {/* isDirty côté admin seulement: les pièces jointes de l'AAP vivent dans
              un autre formulaire et ne salissent jamais celui-ci. */}
          <Button
            className="ml-auto"
            type="submit"
            disabled={
              isSubmitting ||
              siretBlocksNavigation ||
              !currentStepIsValid ||
              (isAdmin && isLastStep && !isDirty)
            }
          >
            {isLastStep
              ? isAdmin
                ? "Enregistrer"
                : "Envoyer"
              : `Passer à l'étape ${currentStepIndex + 2}`}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TargetedLegalInformationUpdatePage;
