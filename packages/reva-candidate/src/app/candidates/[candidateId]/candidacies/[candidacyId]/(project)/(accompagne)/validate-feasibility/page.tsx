"use client";

import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import CallOut from "@codegouvfr/react-dsfr/CallOut";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { GraphQLError } from "graphql";
import { deburr } from "lodash";
import { redirect, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DownloadTile } from "@/components/download-tile/DownloadTile";
import { Panel } from "@/components/layout/Panel";
import { FancyUpload } from "@/components/legacy/atoms/FancyUpload/FancyUpload";
import { PdfLink } from "@/components/legacy/organisms/DffSummary/components/PdfLink";
import { DffSummary } from "@/components/legacy/organisms/DffSummary/DffSummary";
import { graphqlErrorToast } from "@/components/toast/toast";
import {
  hasFreshCandidateConfirmation,
  isSentToCandidateOutdatedAfterIncomplete,
} from "@/utils/feasibilityIncompleteOutdated.util";

import { Candidacy } from "@/graphql/generated/types";

import { useValidateFeasibility } from "./validate-feasibility.hooks";

export default function ValidateFeasibility() {
  const router = useRouter();

  const {
    createOrUpdateSwornStatement,
    dffCandidateConfirmation,
    candidacy,
    dematerializedFeasibilityFile,
    candidate,
  } = useValidateFeasibility();

  const { mutateAsync: dffCandidateConfirmationMutation } =
    dffCandidateConfirmation;

  const [swornStatementFile, setSwornStatementFile] = useState<
    File | undefined
  >();
  const [candidateConfirmation, setCandidateConfirmation] = useState(false);
  const [candidateDecisionComment, setCandidateDecisionComment] = useState(
    dematerializedFeasibilityFile?.candidateDecisionComment ?? "",
  );
  const candidateHasConfirmedFeasibility = hasFreshCandidateConfirmation({
    decision: candidacy?.feasibility?.decision,
    decisionSentAt: candidacy?.feasibility?.decisionSentAt,
    candidateConfirmationAt:
      dematerializedFeasibilityFile?.candidateConfirmationAt,
  });

  const isSentToCandidateOutdated = isSentToCandidateOutdatedAfterIncomplete({
    decision: candidacy?.feasibility?.decision,
    decisionSentAt: candidacy?.feasibility?.decisionSentAt,
    sentToCandidateAt: dematerializedFeasibilityFile?.sentToCandidateAt,
  });

  const canCandidateValidateFeasibility =
    (!candidacy?.feasibility?.feasibilityFileSentAt ||
      candidacy?.feasibility?.decision === "INCOMPLETE") &&
    !!dematerializedFeasibilityFile?.sentToCandidateAt &&
    !isSentToCandidateOutdated;

  const formIsDisabled =
    !candidateConfirmation || !!candidateHasConfirmedFeasibility;

  const remoteSwornStatementFile = useMemo(
    () =>
      dematerializedFeasibilityFile?.swornStatementFile?.previewUrl
        ? {
            name: dematerializedFeasibilityFile.swornStatementFile.name,
            url: dematerializedFeasibilityFile.swornStatementFile.previewUrl,
            mimeType: dematerializedFeasibilityFile.swornStatementFile.mimeType,
          }
        : undefined,
    [dematerializedFeasibilityFile],
  );

  const candidateName = deburr(
    `${candidate?.givenName ? candidate?.givenName : candidate?.lastname}_${candidate?.firstname}`,
  ).toLowerCase();

  if (!candidacy) {
    return null;
  }

  if (!dematerializedFeasibilityFile) {
    redirect("../");
  }

  const onSubmit = async () => {
    try {
      if (swornStatementFile) {
        const response = await createOrUpdateSwornStatement({
          candidacyId: candidacy.id,
          swornStatement: swornStatementFile,
        });
        if (!response || response.error) {
          throw new GraphQLError("Erreur lors de la création de l'attestation");
        }
      }
      await dffCandidateConfirmationMutation({
        candidacyId: candidacy.id,
        dematerializedFeasibilityFileId: dematerializedFeasibilityFile.id,
        input: {
          candidateDecisionComment,
        },
      });
      router.push("../");
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  return (
    <Panel>
      <Breadcrumb
        currentPageLabel="Dossier de faisabilité"
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

      <div className="flex justify-between mb-4 mt-6">
        <h1 className="mb-0">Dossier de faisabilité</h1>

        {dematerializedFeasibilityFile.dffFile ? (
          <PdfLink
            url={dematerializedFeasibilityFile.dffFile.url}
            fileName={`dossier_de_faisabilite_${candidateName}.pdf`}
          />
        ) : null}
      </div>

      <DffSummary
        candidacy={candidacy as Candidacy}
        candidateDecisionComment={candidateDecisionComment}
        setCandidateDecisionComment={setCandidateDecisionComment}
      />

      {canCandidateValidateFeasibility && (
        <form
          className="flex flex-col gap-6 mt-12 border-t pt-12"
          onSubmit={(e) => {
            e.preventDefault();

            onSubmit();
          }}
        >
          <div className="flex flex-col">
            <h2 className="mb-4">Validation du dossier de faisabilité</h2>
            <p className="mb-6 text-xl">
              Pour valider votre dossier, vous devez télécharger ce modèle
              d’attestation, le compléter, le signer et le joindre.
            </p>

            <div className="flex gap-6">
              <div className="flex flex-col gap-4 flex-[1]">
                <DownloadTile
                  name="Modèle d'attestation sur l'honneur (PDF)"
                  url="/candidat/files/attestation_sur_l_honneur_modele.pdf"
                  mimeType="application/pdf"
                  fileSizeInBytes={984064}
                />
                <p className="text-lg mb-0">
                  <b>
                    Vous ne pouvez pas télécharger votre attestation ou ne
                    parvenez pas à la remplir ?
                  </b>{" "}
                  Demandez à votre accompagnateur de le faire pour vous.
                </p>
              </div>
              <div>
                <CallOut title="Comment contacter mon accompagnateur ?">
                  {candidacy?.organism?.label}
                  <br />
                  {candidacy?.organism?.emailContact}
                  <br />
                  {candidacy?.organism?.telephone}
                </CallOut>
              </div>
            </div>
          </div>

          <FancyUpload
            title="Joindre l’attestation sur l’honneur complétée et signée"
            hint="Format supporté : PDF uniquement avec un poids maximum de 20 Mo"
            defaultFile={remoteSwornStatementFile}
            nativeInputProps={{
              onChange: (e) => {
                setSwornStatementFile(e.target.files?.[0]);
              },
              accept: ".pdf, .jpg, .jpeg, .png",
              disabled: !!candidateHasConfirmedFeasibility,
            }}
          />

          {!candidateHasConfirmedFeasibility && (
            <Checkbox
              options={[
                {
                  label: "J'ai lu et accepte cette version du dossier.",
                  nativeInputProps: {
                    onChange: (e) => {
                      setCandidateConfirmation(e.target.checked);
                    },
                    checked: candidateConfirmation,
                    disabled:
                      !dematerializedFeasibilityFile?.isReadyToBeSentToCandidate,
                  },
                },
              ]}
            />
          )}

          <div className="flex flex-row items-center justify-between">
            <Button
              type="button"
              data-testid="back"
              priority="secondary"
              nativeButtonProps={{
                onClick: () => {
                  router.push("../");
                },
              }}
            >
              Retour
            </Button>

            <Button
              type="submit"
              data-testid="submit"
              disabled={
                formIsDisabled ||
                !dematerializedFeasibilityFile?.isReadyToBeSentToCandidate
              }
            >
              Envoyer
            </Button>
          </div>
        </form>
      )}
    </Panel>
  );
}
