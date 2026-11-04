import { z } from "zod";

import {
  sanitizedOptionalEmail,
  sanitizedOptionalUrl,
  sanitizedPhone,
  sanitizedText,
} from "@/utils/input-sanitization";

export const informationRemoteFormSchema = z
  .object({
    nomPublic: sanitizedText(),
    telephone: sanitizedPhone(),
    siteInternet: sanitizedOptionalUrl(),
    emailContact: sanitizedOptionalEmail(),
    isRemoteFranceMetropolitaine: z.boolean(),
    isRemoteGuadeloupe: z.boolean(),
    isRemoteGuyane: z.boolean(),
    isRemoteMartinique: z.boolean(),
    isRemoteMayotte: z.boolean(),
    isRemoteLaReunion: z.boolean(),
    isRemoteSaintPierreEtMiquelon: z.boolean(),
    isRemoteSainteLucieSaintMartin: z.boolean(),
    isRemoteSaintBarthelemy: z.boolean(),
  })
  .superRefine(
    (
      {
        isRemoteFranceMetropolitaine,
        isRemoteGuadeloupe,
        isRemoteGuyane,
        isRemoteLaReunion,
        isRemoteMartinique,
        isRemoteMayotte,
        isRemoteSaintBarthelemy,
        nomPublic,
        emailContact,
        telephone,
      },
      { addIssue },
    ) => {
      const assertRequiredField = ({
        fieldName,
        fieldValue,
      }: {
        fieldName: string;
        fieldValue: unknown;
      }) => {
        if (!fieldValue) {
          addIssue({
            path: [fieldName],
            message: "Merci de remplir ce champ",
            code: "custom",
          });
        }
      };
      [
        {
          fieldName: "nomPublic",
          fieldValue: nomPublic,
        },
        {
          fieldName: "emailContact",
          fieldValue: emailContact,
        },
        {
          fieldName: "telephone",
          fieldValue: telephone,
        },
      ].forEach(assertRequiredField);
      if (
        ![
          isRemoteFranceMetropolitaine,
          isRemoteGuadeloupe,
          isRemoteGuyane,
          isRemoteLaReunion,
          isRemoteMartinique,
          isRemoteMayotte,
          isRemoteSaintBarthelemy,
        ].some((r) => !!r)
      ) {
        addIssue({
          path: ["isRemoteFranceMetropolitaine"],
          message: "Au moins une case doit être cochée",
          code: "custom",
        });
      }
    },
  );

export type InformationRemoteFormData = z.infer<
  typeof informationRemoteFormSchema
>;
