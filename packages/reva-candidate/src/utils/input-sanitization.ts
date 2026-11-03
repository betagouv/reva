import { z } from "zod";

const REGEX_SPECIAL_CHARACTERS = /[&\\;`@{}[\]<>|~^$%#*+=/]/;
const REGEX_SPECIAL_CHARACTERS_MESSAGE =
  "Les caractères spéciaux ne sont pas autorisés";
const REGEX_ZIP_CODE = /^\d{5}$/;
const REGEX_ZIP_CODE_MESSAGE = "Le code postal doit contenir 5 chiffres";
const REGEX_PHONE = /^\+?(\d\s?){10,12}$/;
const REGEX_PHONE_MESSAGE =
  "Le numéro de téléphone doit commencer par + (facultatif) suivi de 10 à 12 chiffres";
const DEFAULT_MAX_LENGTH = 10000;

/**
 * Zod schema for text
 * Validates against special characters and enforces length
 */
export const sanitizedText = ({
  minLength = 1,
  maxLength = DEFAULT_MAX_LENGTH,
  invalid_type_error,
}: {
  minLength?: number;
  maxLength?: number;
  invalid_type_error?: string;
} = {}) => {
  return z
    .string()
    .trim()
    .min(
      minLength,
      invalid_type_error ||
        `Ce champ doit contenir au moins ${minLength === 1 ? "1 caractère" : `${minLength} caractères`}`,
    )
    .max(
      maxLength,
      `Ce champ doit contenir maximum ${maxLength === 1 ? "1 caractère" : `${maxLength} caractères`}`,
    )
    .refine(
      (value: string) => {
        if (!value) return true;
        return !REGEX_SPECIAL_CHARACTERS.test(value);
      },
      {
        message: REGEX_SPECIAL_CHARACTERS_MESSAGE,
      },
    );
};

export const sanitizedOptionalText = ({
  maxLength = DEFAULT_MAX_LENGTH,
}: { maxLength?: number } = {}) => {
  return z
    .string()
    .optional()
    .transform((val) => val ?? "")
    .pipe(sanitizedText({ minLength: 0, maxLength }));
};

/**
 * Zod schema for text
 * Enforces length
 */
export const sanitizedTextAllowSpecialCharacters = ({
  minLength = 1,
  maxLength = DEFAULT_MAX_LENGTH,
}: { minLength?: number; maxLength?: number } = {}) => {
  return z
    .string()
    .trim()
    .min(
      minLength,
      `Ce champ doit contenir au moins ${minLength === 1 ? "1 caractère" : `${minLength} caractères`}`,
    )
    .max(
      maxLength,
      `Ce champ doit contenir maximum ${maxLength === 1 ? "1 caractère" : `${maxLength} caractères`}`,
    );
};

/**
 * Zod schema for phone numbers
 * Validates against special characters and enforces length
 */
export const sanitizedPhone = () => {
  return z.string().trim().regex(REGEX_PHONE, REGEX_PHONE_MESSAGE);
};

/**
 * Zod schema for zip codes
 * Validates against special characters and enforces numeric pattern
 */
export const sanitizedZipCode = () => {
  return z.string().trim().regex(REGEX_ZIP_CODE, REGEX_ZIP_CODE_MESSAGE);
};

/**
 * Zod schema for emails
 * Validates against special characters and enforces email pattern
 */
export const sanitizedEmail = () => {
  return z
    .string()
    .trim()
    .email("Le champ doit contenir une adresse électronique valide");
};
