"use client";
import Alert from "@codegouvfr/react-dsfr/Alert";
import { CallOut } from "@codegouvfr/react-dsfr/CallOut";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";

import {
  FeasibilityCompetenceBlocksModal,
  feasibilityCompetenceBlocksModal,
} from "./_components/FeasibilityCompetenceBlocksModal";
import { HistoryResultatView } from "./_components/HistoryResultatView";
import { ResultatCard } from "./_components/ResultatCard";
import { ResultatCardWithBlocks } from "./_components/ResultatCardWithBlocks";
import { useJuryAAP } from "./jury-aap.hook";

export default function ResultatPage() {
  const router = useRouter();
  const { isFeatureActive } = useFeatureflipping();

  const { candidacy } = useJuryAAP();

  if (!candidacy) {
    return null;
  }

  const { jury, historyJury } = candidacy;

  if (!jury || !jury.result) {
    return (
      <>
        <h1>Jury</h1>

        <div className="flex flex-col gap-10">
          <HistoryResultatView
            historyJury={historyJury.map((jury) => ({
              id: jury.id,
              dateOfSession: jury.dateOfSession,
              // Only jury with result are in jury history
              result: jury.result!,
              informationOfResult: jury.informationOfResult,
              juryResultByCompetenceBlocs: jury.juryResultByCompetenceBlocs,
            }))}
            previouslyValidatedBlocks={jury?.previouslyValidatedBlocks}
          />

          <Alert
            description={
              <div className="pl-2 mt-3 mb-4">
                <h6>Le résultat vous sera bientôt communiqué </h6>
                <dd>
                  Une fois le passage devant le jury effectué, le certificateur
                  vous fera parvenir le résultat.
                </dd>
              </div>
            }
            severity="info"
            small
          />
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-6">Jury</h1>
      <p className="mb-12 text-xl">
        Les résultats de jury sont renseignés par le certificateur. France VAE
        n'assure pas ce cette fonction.
      </p>
      <div className="flex flex-col gap-10">
        <HistoryResultatView
          historyJury={historyJury.map((jury) => ({
            id: jury.id,
            dateOfSession: jury.dateOfSession,
            // Only jury with result are in jury history
            result: jury.result!,
            informationOfResult: jury.informationOfResult,
            juryResultByCompetenceBlocs: jury.juryResultByCompetenceBlocs,
          }))}
          previouslyValidatedBlocks={jury.previouslyValidatedBlocks}
        />

        {jury.juryResultByCompetenceBlocs &&
        jury.juryResultByCompetenceBlocs.length > 0 ? (
          <ResultatCardWithBlocks
            jury={{
              id: jury.id,
              dateOfSession: jury.dateOfSession,
              result: jury.result,
              informationOfResult: jury.informationOfResult,
              juryResultByCompetenceBlocs: jury.juryResultByCompetenceBlocs,
            }}
            previouslyValidatedBlocks={jury.previouslyValidatedBlocks}
            additionalInformation={
              candidacy?.feasibility?.dematerializedFeasibilityFile
                ?.blocsDeCompetences &&
              candidacy?.certification?.competenceBlocs && (
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    feasibilityCompetenceBlocksModal.open();
                  }}
                  className="fr-link"
                >
                  Voir les détails de la recevabilité du candidat sur cette
                  certification <i className="fr-icon-arrow-right-line" />
                </Link>
              )
            }
          />
        ) : (
          <ResultatCard
            jury={{
              id: jury.id,
              dateOfSession: jury.dateOfSession,
              result: jury.result,
              informationOfResult: jury.informationOfResult,
              isResultTemporary: jury.isResultTemporary,
            }}
          />
        )}

        {jury.result != "FULL_SUCCESS_OF_FULL_CERTIFICATION" &&
          jury.result != "FULL_SUCCESS_OF_PARTIAL_CERTIFICATION" && (
            <CallOut
              buttonProps={{
                children: "Accéder au dossier de validation",
                onClick: () => {
                  router.push(
                    `/candidacies/${candidacy.id}/${
                      isFeatureActive("NEW_DV_PAGE")
                        ? "dossier-de-validation-aap-v2"
                        : "dossier-de-validation-aap/"
                    }`,
                  );
                },
              }}
              title="Le candidat peut renvoyer un dossier de validation"
            >
              Suite à ce résultat, le candidat peut repasser devant le jury. Il
              devra, en amont, retravailler sur son dossier de validation. Vous
              devrez le renvoyer au certificateur qui pourra lui transmettre une
              nouvelle date de passage devant le jury.
            </CallOut>
          )}
      </div>
      {candidacy?.feasibility?.dematerializedFeasibilityFile
        ?.blocsDeCompetences &&
        candidacy?.certification?.competenceBlocs && (
          <FeasibilityCompetenceBlocksModal
            receivableBlocks={candidacy?.feasibility?.dematerializedFeasibilityFile?.blocsDeCompetences.map(
              (block) => block.certificationCompetenceBloc,
            )}
            certificationBlocks={candidacy?.certification?.competenceBlocs}
          />
        )}
    </>
  );
}
