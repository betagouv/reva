import Alert from "@codegouvfr/react-dsfr/Alert";
import { CallOut } from "@codegouvfr/react-dsfr/CallOut";
import { useRouter } from "next/navigation";

import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";

import { HistoryResultatView } from "./HistoryResultatView";
import { useJuryAAP } from "./jury-aap.hook";
import { ResultatCard } from "./ResultatCard";

export const ResultatTab = () => {
  const router = useRouter();
  const { isFeatureActive } = useFeatureflipping();

  const { candidacy } = useJuryAAP();

  if (!candidacy) {
    return null;
  }

  const { jury, historyJury } = candidacy;

  if (!jury || !jury.result) {
    return (
      <div className="flex flex-col gap-10">
        <HistoryResultatView
          historyJury={historyJury.map((jury) => ({
            id: jury.id,
            dateOfSession: jury.dateOfSession,
            // Only jury with result are in jury history
            result: jury.result!,
            informationOfResult: jury.informationOfResult,
          }))}
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
    );
  }

  return (
    <>
      {" "}
      <h2>Résultat suite au passage devant le jury</h2>
      <div className="flex flex-col gap-10">
        <HistoryResultatView
          historyJury={historyJury.map((jury) => ({
            id: jury.id,
            dateOfSession: jury.dateOfSession,
            // Only jury with result are in jury history
            result: jury.result!,
            informationOfResult: jury.informationOfResult,
          }))}
        />

        <ResultatCard
          jury={{
            id: jury.id,
            dateOfSession: jury.dateOfSession,
            result: jury.result,
            informationOfResult: jury.informationOfResult,
            isResultTemporary: jury.isResultTemporary,
          }}
        />

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
    </>
  );
};
