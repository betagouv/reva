import { z } from "zod";

import { deserializeStringToPhoneNumberStructure } from "@/utils/deserializeStringToPhoneNumberStructure.util";
import {
  sanitizedEmail,
  sanitizedOptionalText,
  sanitizedPhone,
  sanitizedText,
  sanitizedZipCode,
} from "@/utils/input-sanitization";

export const contactInformationSchema = () =>
  z
    .object({
      street: sanitizedText(),
      city: sanitizedText(),
      zip: sanitizedZipCode(),
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
          code: "custom",
          message: "Le numéro de téléphone est invalide",
          path: ["phone"],
        });
      }
    });

export type FormContactInformationData = z.infer<
  ReturnType<typeof contactInformationSchema>
>;
