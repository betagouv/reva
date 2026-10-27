import fastifyMultipart from "@fastify/multipart";
import { FastifyPluginAsync } from "fastify";

import { FICHIER_NON_TROUVE } from "@/modules/shared/errors/messages";
import { logger } from "@/modules/shared/logger/logger";
import {
  NOT_AUTHORIZED_CANDIDACY_MANAGE,
  NOT_AUTHORIZED_FILE_ACCESS,
  NOT_AUTHORIZED_FILE_VIEW,
} from "@/modules/shared/security/messages";
import { isCandidateOwnerOfCandidacyFeature } from "@/modules/shared/security/middlewares/isCandidateOwnerOfCandidacy.security";
import { prismaClient } from "@/prisma/client";

import { canUserManageCandidacy } from "../feasibility/feasibility.features";
import { UploadedFile } from "../shared/file/file.interface";
import { getDownloadLink } from "../shared/file/file.service";

import { canManageDossierDeValidation } from "./features/canManageDossierDeValidation";
import { getActiveDossierDeValidationByCandidacyId } from "./features/getActiveDossierDeValidationByCandidacyId";
import { getDossierDeValidationOtherFiles } from "./features/getDossierDeValidationOtherFiles";
import { sendDossierDeValidation } from "./features/sendDossierDeValidation";
import { storeJustificationFile } from "./features/submitAmenagementSpecifique";

interface UploadDossierDeValidationBody {
  candidacyId: { value: string };
  dossierDeValidationFile: UploadedFile;
  dossierDeValidationOtherFiles?: UploadedFile | UploadedFile[];
  amenagementSpecifiqueFile?: UploadedFile;
  amenagementSpecifiqueDescription?: { value: string };
}

type MimeType = "application/pdf" | "image/png" | "image/jpg" | "image/jpeg";

export const dossierDeValidationRoute: FastifyPluginAsync = async (server) => {
  const maxUploadFileSizeInBytes = 10485760;

  server.register(fastifyMultipart, {
    attachFieldsToBody: true,
    limits: { fileSize: maxUploadFileSizeInBytes },
  });

  server.get<{ Params: { candidacyId: string; fileId: string } }>(
    "/candidacy/:candidacyId/dossier-de-validation/file/:fileId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            candidacyId: { type: "string" },
            fileId: { type: "string" },
          },
          required: ["candidacyId", "fileId"],
        },
      },
      handler: async (request, reply) => {
        const { candidacyId, fileId } = request.params;

        const dossierDeValidation =
          await getActiveDossierDeValidationByCandidacyId({
            candidacyId,
          });

        const dossierDeValidationOtherFiles = dossierDeValidation
          ? await getDossierDeValidationOtherFiles({
              dossierDeValidationId: dossierDeValidation.id,
            })
          : [];

        const amenagementFileIds = (
          await prismaClient.amenagementSpecifique.findMany({
            where: { dossierDeValidation: { candidacyId } },
            select: { justificationFileId: true },
          })
        ).map((amenagement) => amenagement.justificationFileId);

        const candidateOwnsCandidacy = await isCandidateOwnerOfCandidacyFeature(
          {
            candidacyId,
            keycloakId: request.auth?.userInfo?.sub,
          },
        );

        const authorized =
          (await canUserManageCandidacy({
            candidacyId,
            hasRole: request.auth.hasRole,
            keycloakId: request.auth?.userInfo?.sub,
          })) ||
          (await canManageDossierDeValidation({
            keycloakId: request.auth?.userInfo?.sub,
            dossierDeValidationId: dossierDeValidation?.id || "",
            roles: request.auth.userInfo?.realm_access?.roles || [],
          })) ||
          (candidateOwnsCandidacy && amenagementFileIds.includes(fileId));

        if (!authorized) {
          return reply.status(403).send({
            err: NOT_AUTHORIZED_FILE_ACCESS,
          });
        }

        if (
          ![
            dossierDeValidation?.dossierDeValidationFileId,
            ...dossierDeValidationOtherFiles.map((f) => f.id),
            ...amenagementFileIds,
          ].includes(fileId)
        ) {
          return reply.status(403).send({
            err: NOT_AUTHORIZED_FILE_VIEW,
          });
        }

        const file = await prismaClient.file.findUnique({
          where: { id: fileId },
        });

        if (!file) {
          throw new Error(FICHIER_NON_TROUVE);
        }

        const fileLink = await getDownloadLink({
          filePath: file.path,
          filename: file.name,
        });

        if (fileLink) {
          reply
            .code(200)
            .header("Content-Type", "application/json; charset=utf-8")
            .send({ url: fileLink });

          return;
        }

        reply.status(400).send("Fichier non trouvé.");
      },
    },
  );

  server.post<{
    Body: UploadDossierDeValidationBody;
  }>("/dossier-de-validation/upload-dossier-de-validation", {
    schema: {
      body: {
        type: "object",
        properties: {
          candidacyId: {
            type: "object",
            properties: {
              value: {
                type: "string",
              },
            },
          },
          dossierDeValidationFile: { type: "object" },
          dossierDeValidationOtherFiles: {
            oneOf: [
              { type: "object" },
              {
                type: "array",
                items: { type: "object" },
              },
            ],
          },
          amenagementSpecifiqueFile: { type: "object" },
          amenagementSpecifiqueDescription: {
            type: "object",
            properties: { value: { type: "string" } },
          },
        },
        required: ["candidacyId", "dossierDeValidationFile"],
      },
    },
    handler: async (request, reply) => {
      const authorized =
        (await canUserManageCandidacy({
          hasRole: request.auth.hasRole,
          candidacyId: request.body.candidacyId.value,
          keycloakId: request.auth?.userInfo?.sub,
        })) ||
        (await isCandidateOwnerOfCandidacyFeature({
          candidacyId: request.body.candidacyId.value,
          keycloakId: request.auth?.userInfo?.sub,
        }));

      if (!authorized) {
        return reply.status(403).send({
          err: NOT_AUTHORIZED_CANDIDACY_MANAGE,
        });
      }

      const dossierDeValidationFile = request.body.dossierDeValidationFile;

      let dossierDeValidationOtherFiles: UploadedFile[] = [];
      if (Array.isArray(request.body.dossierDeValidationOtherFiles)) {
        dossierDeValidationOtherFiles = [
          ...request.body.dossierDeValidationOtherFiles,
        ];
      } else if (request.body.dossierDeValidationOtherFiles) {
        dossierDeValidationOtherFiles = [
          request.body.dossierDeValidationOtherFiles,
        ];
      }

      for (const otherFile of [
        dossierDeValidationFile,
        ...dossierDeValidationOtherFiles,
      ]) {
        if (
          !hasValidMimeType(otherFile, [
            "application/pdf",
            "image/png",
            "image/jpg",
            "image/jpeg",
          ])
        ) {
          return reply
            .status(400)
            .send(
              `Le format de fichier n'est pas supporté. Essayez avec un .jpg, .png ou .pdf.`,
            );
        }

        if (otherFile._buf?.byteLength > maxUploadFileSizeInBytes) {
          return reply
            .status(400)
            .send(
              `La taille du fichier "${
                otherFile.filename
              }" dépasse la taille maximum autorisée. Veuillez soumettre un fichier de moins de ${Math.floor(
                maxUploadFileSizeInBytes / 1024 / 1024,
              )} Mo.`,
            );
        }
      }

      const amenagementSpecifiqueFile = request.body.amenagementSpecifiqueFile;
      const amenagementSpecifiqueDescription =
        request.body.amenagementSpecifiqueDescription?.value;

      if (
        amenagementSpecifiqueDescription &&
        amenagementSpecifiqueDescription.length < 10
      ) {
        return reply
          .status(400)
          .send(
            `La description de l'aménagement spécifique doit contenir au moins 10 caractères.`,
          );
      }

      let uploadedAmenagementFile: {
        id: string;
        path: string;
        name: string;
        mimeType: string;
      } | null = null;
      if (amenagementSpecifiqueFile) {
        if (
          !hasValidMimeType(amenagementSpecifiqueFile, [
            "application/pdf",
            "image/png",
            "image/jpg",
            "image/jpeg",
          ])
        ) {
          return reply
            .status(400)
            .send(
              `Le format de fichier n'est pas supporté. Essayez avec un .jpg, .png ou .pdf.`,
            );
        }

        uploadedAmenagementFile = await storeJustificationFile({
          candidacyId: request.body.candidacyId.value,
          uploadedFile: amenagementSpecifiqueFile,
        });
      }

      try {
        await sendDossierDeValidation({
          candidacyId: request.body.candidacyId.value,
          dossierDeValidationFile,
          dossierDeValidationOtherFiles,
          amenagementSpecifiqueFileId: uploadedAmenagementFile?.id,
          justificationDescription: amenagementSpecifiqueDescription || "",
          userKeycloakId: request.auth?.userInfo?.sub,
          userEmail: request.auth?.userInfo?.email,
          userRoles: request.auth.userInfo?.realm_access?.roles || [],
        });
      } catch (e) {
        logger.error(e);
        reply.code(500);
        const message = e instanceof Error ? e.message : "unknown error";
        reply.send(message);
      }
    },
  });

  const hasValidMimeType = (
    file: UploadedFile,
    validMimeTypes: MimeType[],
  ): boolean => {
    return validMimeTypes.includes(file.mimetype as MimeType);
  };
};
