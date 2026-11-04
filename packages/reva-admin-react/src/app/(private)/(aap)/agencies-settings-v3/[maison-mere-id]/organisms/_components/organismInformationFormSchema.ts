import { z } from "zod";

import {
  sanitizedEmail,
  sanitizedOptionalText,
  sanitizedOptionalUrl,
  sanitizedPhone,
  sanitizedText,
  sanitizedZipCode,
} from "@/utils/input-sanitization";

const AddressFragmentsSchema = z.object({
  adresseNumeroEtNomDeRue: sanitizedText(),
  adresseCodePostal: sanitizedZipCode(),
  adresseVille: sanitizedText(),
});

export const organismInformationFormSchema = z
  .object({
    adresseComplete: sanitizedText(),
    adresseFragments: AddressFragmentsSchema.optional(),
    adresseInformationsComplementaires: sanitizedOptionalText(),
    nomPublic: sanitizedText({ minLength: 2 }),
    telephone: sanitizedPhone(),
    siteInternet: sanitizedOptionalUrl(),
    emailContact: sanitizedEmail(),
    conformeNormesAccessibilite: z
      .enum(["CONFORME", "NON_CONFORME", ""])
      .superRefine((val, ctx) => {
        if (val === "") {
          ctx.addIssue({
            code: "custom",
            message: "Ce champ est obligatoire",
          });
        }
      }),
  })
  .superRefine((val, ctx) => {
    if (!val.adresseFragments) {
      ctx.addIssue({
        code: "custom",
        path: ["adresseComplete"],
        message: "Veuillez saisir puis sélectionner une adresse.",
      });
    }
  })
  .transform(({ adresseFragments, adresseComplete: _omit, ...rest }) => ({
    ...rest,
    ...adresseFragments,
  }))
  .pipe(
    z.object({
      adresseNumeroEtNomDeRue: sanitizedText(),
      adresseCodePostal: sanitizedZipCode(),
      adresseVille: sanitizedText(),
      adresseInformationsComplementaires: sanitizedText({ minLength: 0 }),
      nomPublic: sanitizedText(),
      telephone: sanitizedPhone(),
      siteInternet: sanitizedOptionalUrl(),
      emailContact: sanitizedEmail(),
      conformeNormesAccessibilite: z.enum(["CONFORME", "NON_CONFORME"]),
    }),
  );

export type OrganismInformationInputData = z.input<
  typeof organismInformationFormSchema
>;

export type OrganismInformationOutputData = z.output<
  typeof organismInformationFormSchema
>;
