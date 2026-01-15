import { z } from "zod";

import { deserializeStringToPhoneNumberStructure } from "@/utils/deserializeStringToPhoneNumberStructure.util";
import {
  sanitizedEmail,
  sanitizedOptionalText,
  sanitizedPhone,
  sanitizedZipCode,
} from "@/utils/input-sanitization";

export const contactInformationSchema = () =>
  z
    .object({
      street: sanitizedOptionalText(),
      city: sanitizedOptionalText(),
      zip: z.union([sanitizedZipCode(), z.literal("")]),
      phone: sanitizedPhone(),
      email: sanitizedEmail(),
      addressComplement: sanitizedOptionalText(),
    })
    .superRefine((data, ctx) => {
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

      return data;
    });

export type FormContactInformationData = z.infer<
  ReturnType<typeof contactInformationSchema>
>;
