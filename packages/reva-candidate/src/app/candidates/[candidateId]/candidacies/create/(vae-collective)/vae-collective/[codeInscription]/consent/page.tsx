"use client";

import Button from "@codegouvfr/react-dsfr/Button";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { useRouter, useParams, useSearchParams } from "next/navigation";

import { Panel } from "@/components/layout/Panel";
import { errorToast } from "@/components/toast/toast";

import { useGetVaeCollectiveCohort } from "../getVaeCollective.hook";

import { useCreateVaeCollectiveCandidacy } from "./createVaeCollectiveCandidacy.hook";

const declinedConsentModal = createModal({
  id: "declined-consent-modal",
  isOpenedByDefault: false,
});

export default function DataConsentVaeCollectivePage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const searchParams = useSearchParams();

  const certificationId = searchParams.get("certificationId");

  const router = useRouter();

  const { createCandidacy } = useCreateVaeCollectiveCandidacy();
  const { isPending: isCreatingCandidacy } = createCandidacy;

  const { cohorteVaeCollective, isLoading: isLoadingCohortVaeCollective } =
    useGetVaeCollectiveCohort();

  const handleCreateCandidacy = async () => {
    const data = await createCandidacy.mutateAsync({
      candidateId: candidateId,
      data: {
        cohorteVaeCollectiveId: cohorteVaeCollective?.id,
        certificationId: certificationId,
      },
    });

    if (data.candidacy_createCandidacy) {
      router.push(`../../../../${data.candidacy_createCandidacy.id}`);
    } else {
      errorToast(
        "Une erreur est survenue lors de la création de la candidature",
      );
    }
  };

  return (
    <Panel>
      <div className="px-4 lg:px-6 pb-2">
        <div className="flex flex-col gap-6">
          <h1 className="mt-4 mb-0">Rejoindre une VAE collective</h1>

          <p className="text-xl">
            Dans le cadre de votre participation à cette démarche collective de
            Validation des Acquis de l'Expérience (VAE), certaines informations
            vous concernant pourront être transmises à votre porteur de projet.
          </p>

          <div>
            <p className="text-lg">
              Ces informations peuvent notamment inclure :
            </p>
            <ul className="text-lg my-0">
              <li>Vos données d'identification et de contact ;</li>
              <li>Vos données relatives aux étapes de votre candidature ;</li>
              <li>
                Vos données relatives à la session d'évaluation et aux résultats
                obtenus ;
              </li>
            </ul>
            <p className="text-lg mt-6">
              Ce partage a pour finalité de permettre :{" "}
            </p>
            <ol className="text-lg my-0">
              <li>
                La gestion des demandes d'inscription à de tels parcours ;
              </li>
              <li>
                Le suivi des parcours et des certifications professionnelles ou
                blocs de compétences obtenus dans ce cadre ;
              </li>
              <li>
                L'accompagnement, des personnes engagées dans ces parcours par
                les architectes-accompagnateurs de parcours ;{" "}
              </li>
              <li>
                La gestion de la prise en charge des frais exposés par les
                personnes engagées dans ces parcours et, le cas échéant, la
                récupération des sommes indûment perçues ;
              </li>
            </ol>
          </div>
          <div>
            <p className="font-bold text-lg">
              Accepter que mes données personnelles, ainsi que les informations
              relatives à ma candidature et à la réalisation de mon parcours
              VAE, soient partagées avec le porteur de projet de la démarche
              collective à laquelle je participe ?
            </p>
            <p className="text-lg">
              Si vous ne souhaitez pas consentir à ce partage, ou si vous avez
              des questions concernant l'utilisation de vos données, nous vous
              invitons à vous rapprocher de votre porteur de projet ou à
              contacter le service support de France VAE.
            </p>
          </div>

          <div className="flex flex-row justify-between mt-6">
            <Button
              className="justify-center w-[100%]  md:w-fit"
              onClick={() => declinedConsentModal.open()}
              priority="tertiary"
            >
              Refuser
            </Button>
            <Button
              disabled={
                isCreatingCandidacy ||
                isLoadingCohortVaeCollective ||
                !cohorteVaeCollective
              }
              className="justify-center w-[100%]  md:w-fit"
              onClick={handleCreateCandidacy}
            >
              Accepter
            </Button>
          </div>
        </div>
      </div>
      <declinedConsentModal.Component
        title="Refuser le partage de mes données personnelles ?"
        size="large"
        buttons={[
          {
            priority: "secondary",
            children: "Annuler",
            doClosesModal: true,
          },
          {
            priority: "primary",
            children: "Refuser",
            nativeButtonProps: {
              onClick: () => router.back(),
            },
          },
        ]}
      >
        <p>
          Si vous ne souhaitez pas consentir à ce partage, ou si vous avez des
          questions concernant l'utilisation de vos données, nous vous invitons
          à vous rapprocher de votre porteur de projet ou à contacter le service
          support de France VAE.
        </p>
      </declinedConsentModal.Component>
    </Panel>
  );
}
