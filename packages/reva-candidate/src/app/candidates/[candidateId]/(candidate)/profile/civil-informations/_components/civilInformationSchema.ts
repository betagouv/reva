import { isBefore, sub, toDate } from "date-fns";
import { z } from "zod";

import { GenderEnum } from "@/constants/genders.constant";
import { deserializeStringToPhoneNumberStructure } from "@/utils/deserializeStringToPhoneNumberStructure.util";
import {
  sanitizedEmail,
  sanitizedOptionalText,
  sanitizedPhone,
  sanitizedText,
  sanitizedZipCode,
} from "@/utils/input-sanitization";

export const candidateInformationSchema = () =>
  z
    .object({
      gender: z.nativeEnum(GenderEnum).default(GenderEnum.undisclosed),
      lastname: sanitizedText(),
      givenName: sanitizedOptionalText(),
      firstname: sanitizedText(),
      firstname2: sanitizedOptionalText(),
      firstname3: sanitizedOptionalText(),
      birthdate: sanitizedOptionalText(),
      country: sanitizedText().default("France"),
      birthDepartment: sanitizedOptionalText(),
      birthCity: sanitizedOptionalText(),
      nationality: sanitizedOptionalText(),
      countryIsFrance: z.boolean(),
      street: sanitizedOptionalText(),
      city: sanitizedOptionalText(),
      zip: z.union([sanitizedZipCode(), z.literal("")]),
      phone: sanitizedPhone(),
      email: sanitizedEmail(),
      addressComplement: sanitizedOptionalText(),
    })
    .superRefine((data, ctx) => {
      if (data.birthdate) {
        const date = toDate(data.birthdate);
        if (date.toString() === "Invalid Date") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La date de naissance est invalide",
            path: ["birthdate"],
          });
        }

        const today = new Date();

        const sixteenYearsAgo = sub(today, { years: 16 });
        const candidateBirthdayIsOlderThan16YearsAgo = isBefore(
          date,
          sixteenYearsAgo,
        );

        if (!candidateBirthdayIsOlderThan16YearsAgo) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Le candidat doit avoir plus de 16 ans",
            path: ["birthdate"],
          });
        }
      }

      const phoneNumberFormatted = deserializeStringToPhoneNumberStructure(
        data.phone,
      );

      if (
        phoneNumberFormatted.length >= 10 &&
        phoneNumberFormatted.length <= 14
      ) {
        data.phone = phoneNumberFormatted;
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le numéro de téléphone est invalide",
          path: ["phone"],
        });
      }

      if (data.countryIsFrance && !data.birthDepartment?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Merci de remplir ce champ",
          path: ["birthDepartment"],
        });
      }

      return data;
    });

export type FormCandidateInformationData = z.infer<
  ReturnType<typeof candidateInformationSchema>
>;
