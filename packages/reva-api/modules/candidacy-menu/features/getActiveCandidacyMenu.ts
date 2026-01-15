import { CandidacyStatusStep } from "@prisma/client";

import { prismaClient } from "@/prisma/client";

import {
  CandidacyMenuEntry,
  CandidacyMenuEntryStatus,
} from "../candidacy-menu.types";

import { CandidacyForMenu } from "./getCandidacyForMenu";
import { menuUrlBuilder } from "./getMenuUrlBuilder";
import { isCandidacyStatusEqualOrAboveGivenStatus } from "./isCandidacyStatusEqualOrAboveGivenStatus";

export const getActiveCandidacyMenu = async ({
  candidacy,
  isCandidateSummaryComplete,
}: {
  candidacy: CandidacyForMenu;
  isCandidateSummaryComplete: boolean;
}) => {
  const activeCandidacyStatus = candidacy.status;

  const isStatusEqualOrAbove = isCandidacyStatusEqualOrAboveGivenStatus(
    activeCandidacyStatus,
  );

  const buildUrl = menuUrlBuilder({ candidacyId: candidacy.id });

  const hasAlreadyAppointment = !!candidacy.appointments.length;

  const getAppointmentsMenuEntry = (): CandidacyMenuEntry | undefined => ({
    label: "Gestion des rendez-vous",
    url: buildUrl({ suffix: "appointments" }),
    status:
      activeCandidacyStatus === "PRISE_EN_CHARGE" && !hasAlreadyAppointment
        ? "ACTIVE_WITH_EDIT_HINT"
        : "ACTIVE_WITHOUT_HINT",
  });

  const getTrainingValidationMenuEntry = (): CandidacyMenuEntry => ({
    label: "Validation du parcours",
    url: "#",
    status: "INACTIVE",
  });

  const getTrainingMenuEntry = (): CandidacyMenuEntry => {
    let trainingUrl = "#";
    let menuEntryStatus: CandidacyMenuEntryStatus =
      activeCandidacyStatus === "PRISE_EN_CHARGE" && hasAlreadyAppointment
        ? "ACTIVE_WITH_EDIT_HINT"
        : "ACTIVE_WITHOUT_HINT";

    if (candidacy.ccnId || candidacy.typology !== "NON_SPECIFIE") {
      trainingUrl = buildUrl({
        suffix: "training",
      });
    } else if (hasAlreadyAppointment) {
      trainingUrl = buildUrl({
        suffix: "typology",
      });
    } else {
      menuEntryStatus = "INACTIVE";
    }
    return {
      label: "Définition du parcours",
      url: trainingUrl,
      status: menuEntryStatus,
    };
  };

  const getFeasibilityMenuEntry = async ({
    feasibilityFormat,
    isCandidateSummaryComplete,
  }: {
    feasibilityFormat: "UPLOADED_PDF" | "DEMATERIALIZED";
    isCandidateSummaryComplete: boolean;
  }): Promise<CandidacyMenuEntry | undefined> => {
    const activeFeasibility = candidacy.Feasibility.find((f) => f.isActive);

    const showFeasibilityEntry =
      candidacy.organism?.typology !== "experimentation";

    let menuEntryStatus: CandidacyMenuEntryStatus = "INACTIVE";
    const editableStatus: CandidacyStatusStep[] = [
      "PARCOURS_CONFIRME",
      "DOSSIER_FAISABILITE_INCOMPLET",
    ];
    const editableFeasibilityDecisions = ["DRAFT", "INCOMPLETE"];
    const feasibilityDecision = activeFeasibility?.decision ?? "";
    const isDfDematerialized = feasibilityFormat === "DEMATERIALIZED";
    const isFeasibilityPending =
      feasibilityDecision === "PENDING" || feasibilityDecision === "COMPLETE";
    const isActiveWithEditHint =
      editableStatus.includes(activeCandidacyStatus) &&
      (!activeFeasibility ||
        editableFeasibilityDecisions.includes(feasibilityDecision));

    if (isDfDematerialized && !isCandidateSummaryComplete) {
      menuEntryStatus = "INACTIVE";
    } else if (isActiveWithEditHint) {
      menuEntryStatus = "ACTIVE_WITH_EDIT_HINT";
    } else if (isStatusEqualOrAbove("PARCOURS_CONFIRME")) {
      menuEntryStatus = "ACTIVE_WITHOUT_HINT";
    } else {
      menuEntryStatus = "INACTIVE";
    }

    let url = "#";

    if (isStatusEqualOrAbove("PARCOURS_CONFIRME")) {
      if (isDfDematerialized) {
        url = isFeasibilityPending
          ? buildUrl({
              suffix: "feasibility-aap/send-file-certification-authority",
            })
          : buildUrl({ suffix: "feasibility-aap" });
      } else {
        url = buildUrl({ suffix: "feasibility-aap/pdf" });
      }
    }

    return showFeasibilityEntry
      ? {
          label: "Dossier de faisabilité",
          url,
          status: menuEntryStatus,
        }
      : undefined;
  };

  const getFundingRequestMenuEntry = async (): Promise<
    CandidacyMenuEntry | undefined
  > => {
    //si le financement de la candidature est "hors plateforme", pas de page de demande de financement dans le menu
    if (candidacy.financeModule === "hors_plateforme") {
      return;
    }

    //si le financement est unireva, pas de page de financement dans le menu si la candidature n'a pas de demande de financement (on a fermé les demandes de financement)
    if (candidacy.financeModule === "unireva") {
      const fundingRequest = await prismaClient.fundingRequest.findUnique({
        where: { candidacyId: candidacy.id },
        select: { id: true },
      });

      if (!fundingRequest) {
        return;
      }
    }

    //si le financement est unifvae, pas de page de financement dans le menu si la candidature n'a pas de demande de financement (on a fermé les demandes de financement)
    if (candidacy.financeModule === "unifvae") {
      const fundingRequestUnifvae =
        await prismaClient.fundingRequestUnifvae.findFirst({
          where: { candidacyId: candidacy.id },
          select: { id: true },
        });

      if (!fundingRequestUnifvae) {
        return;
      }
    }
    return {
      label: "Demande de prise en charge",
      url: buildUrl({
        suffix: "funding",
      }),
      status: "ACTIVE_WITHOUT_HINT",
    };
  };

  const getDossierDeValidationMenuEntry = (): CandidacyMenuEntry => {
    let menuEntryStatus: CandidacyMenuEntryStatus = "INACTIVE";

    const activeFeasibility = candidacy.Feasibility.find((f) => f.isActive);
    let url = "#";

    if (activeFeasibility?.decision === "ADMISSIBLE") {
      const editableStatus: CandidacyStatusStep[] = [];

      if (candidacy.financeModule === "hors_plateforme") {
        editableStatus.push(
          "DOSSIER_FAISABILITE_RECEVABLE",
          "DOSSIER_FAISABILITE_NON_RECEVABLE",
          "DOSSIER_DE_VALIDATION_SIGNALE",
        );
      } else {
        editableStatus.push(
          "DOSSIER_FAISABILITE_RECEVABLE",
          "DOSSIER_FAISABILITE_NON_RECEVABLE",
          "DOSSIER_DE_VALIDATION_SIGNALE",
        );
      }

      const isCandidacyStatusAdvancedEnoughToEditDossierDeValidation =
        isCandidacyStatusEqualOrAboveGivenStatus(activeCandidacyStatus);

      if (
        editableStatus.some((s) =>
          isCandidacyStatusAdvancedEnoughToEditDossierDeValidation(s),
        )
      ) {
        menuEntryStatus = editableStatus.includes(activeCandidacyStatus)
          ? "ACTIVE_WITH_EDIT_HINT"
          : "ACTIVE_WITHOUT_HINT";
      }

      url = buildUrl({
        suffix: "dossier-de-validation-aap",
      });
    }
    return {
      label: "Dossier de validation",
      url,
      status: menuEntryStatus,
    };
  };

  const getPaymentRequestMenuEntry = async (): Promise<
    CandidacyMenuEntry | undefined
  > => {
    //pas de page de demande de paiement si le financement de la candidature est "hors plateforme"

    if (candidacy.financeModule === "hors_plateforme") {
      return undefined;
    }

    const activeFeasibility = candidacy.Feasibility.find((f) => f.isActive);
    let menuEntryStatus: CandidacyMenuEntryStatus = "INACTIVE";
    const hasPaymentRequest = !!candidacy.paymentRequestUnifvae;
    const hasConfirmedPaymentRequest =
      !!candidacy.paymentRequestUnifvae?.confirmedAt;

    // cas d'une candidature unifvae avec feasibility non rejetée (cas "standard")
    if (
      candidacy.financeModule === "unifvae" &&
      activeFeasibility?.decision !== "REJECTED"
    ) {
      const endAccompagnementConfirmed =
        candidacy.endAccompagnementStatus === "CONFIRMED_BY_CANDIDATE" ||
        candidacy.endAccompagnementStatus === "CONFIRMED_BY_ADMIN";

      // Pour débloquer la demande de paiement, il faut soit être au-dessus du statut "DOSSIER_DE_VALIDATION_ENVOYE" ou la confirmation de l'accompagnement
      if (
        isStatusEqualOrAbove("DOSSIER_DE_VALIDATION_ENVOYE") ||
        endAccompagnementConfirmed
      ) {
        menuEntryStatus = hasConfirmedPaymentRequest
          ? "ACTIVE_WITHOUT_HINT"
          : "ACTIVE_WITH_EDIT_HINT";
      }
    }
    // cas d'une candidature unireva ou d'une candidature unifvae avec feasibility rejetée
    else {
      // il faut qu'une demande de financement ait été faite pour débloquer la demande de paiement
      if (
        (candidacy.financeModule === "unireva" &&
          candidacy.FundingRequest !== null) ||
        (candidacy.financeModule === "unifvae" &&
          candidacy.fundingRequestUnifvae !== null)
      ) {
        menuEntryStatus = "ACTIVE_WITHOUT_HINT";
      }
    }

    const isCandidacyUniReva = candidacy.financeModule === "unireva";
    const hasIncompletePaymentRequest =
      hasPaymentRequest && !hasConfirmedPaymentRequest;

    const paymentPageUrl = isCandidacyUniReva
      ? buildUrl({
          suffix: "payment/unireva/invoice",
        })
      : buildUrl({
          suffix: hasIncompletePaymentRequest
            ? "payment/unifvae/upload"
            : "payment/unifvae/invoice",
        });

    return {
      label: "Demande de paiement",
      url: paymentPageUrl,
      status: menuEntryStatus,
    };
  };

  const getJuryMenuEntry = (): CandidacyMenuEntry => {
    const showNewJuryMenu =
      candidacy.financeModule == "unifvae" ||
      candidacy.financeModule === "hors_plateforme";

    const minumumStatusToShowJuryMenu = "DOSSIER_FAISABILITE_RECEVABLE";

    const menuEntryStatus: CandidacyMenuEntryStatus = isStatusEqualOrAbove(
      minumumStatusToShowJuryMenu,
    )
      ? "ACTIVE_WITHOUT_HINT"
      : "INACTIVE";

    return showNewJuryMenu
      ? {
          label: "Jury",
          url: buildUrl({ suffix: "jury-aap" }),
          status: menuEntryStatus,
        }
      : {
          label: "Jury",
          url: buildUrl({ suffix: "exam-info" }),
          status: menuEntryStatus,
        };
  };

  return [
    getAppointmentsMenuEntry(),
    getTrainingMenuEntry(),
    getTrainingValidationMenuEntry(),
    await getFeasibilityMenuEntry({
      feasibilityFormat: candidacy.feasibilityFormat,
      isCandidateSummaryComplete,
    }),
    await getFundingRequestMenuEntry(),
    getDossierDeValidationMenuEntry(),
    await getPaymentRequestMenuEntry(),
    getJuryMenuEntry(),
  ].filter((e) => e) as CandidacyMenuEntry[];
};
