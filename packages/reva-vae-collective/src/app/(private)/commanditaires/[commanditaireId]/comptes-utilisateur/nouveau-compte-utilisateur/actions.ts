"use server";

import { redirect } from "next/navigation";

import { getAccessTokenFromCookie } from "@/helpers/auth/get-access-token-from-cookie/getAccessTokenFromCookie";
import { throwUrqlErrors } from "@/helpers/graphql/throw-urql-errors/throwUrqlErrors";
import { client } from "@/helpers/graphql/urql-client/urqlClient";

import { graphql } from "@/graphql/generated";

type FormState = {
  errors?: {
    accountFirstname?: { message: string };
    accountLastname?: { message: string };
    accountEmail?: { message: string };
    isAAPAccount?: { message: string };
  };
};

const createSousCompteVaeCollectiveMutation = graphql(`
  mutation createSousCompteVaeCollective(
    $commanditaireVaeCollectiveId: ID!
    $accountFirstname: String!
    $accountLastname: String!
    $accountEmail: String!
    $canCreateCohorteVaeCollective: Boolean!
    $isAAPAccount: Boolean!
  ) {
    vaeCollective_createSousCompteVaeCollective(
      commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
      accountFirstname: $accountFirstname
      accountLastname: $accountLastname
      accountEmail: $accountEmail
      canCreateCohorteVaeCollective: $canCreateCohorteVaeCollective
      isAAPAccount: $isAAPAccount
    ) {
      id
    }
  }
`);

export const createSousCompteVaeCollective = async (
  _state: FormState,
  formData: FormData,
) => {
  const accessToken = await getAccessTokenFromCookie();

  const {
    accountFirstname,
    accountLastname,
    accountEmail,
    commanditaireId,
    canCreateCohorteVaeCollective,
    isAAPAccount,
  } = Object.fromEntries(formData.entries());

  for (const [fieldName, field] of Object.entries({
    accountLastname,
    accountEmail,
  })) {
    if (!field) {
      return {
        errors: {
          [fieldName]: { message: "Merci de remplir ce champ" },
        },
      } as FormState;
    }
    if (field.toString().length < 3) {
      return {
        errors: {
          [fieldName]: {
            message: "Ce champ doit contenir au moins 3 caractères",
          },
        },
      } as FormState;
    }
  }

  try {
    const result = throwUrqlErrors(
      await client.mutation(
        createSousCompteVaeCollectiveMutation,
        {
          commanditaireVaeCollectiveId: commanditaireId.toString(),
          accountFirstname: accountFirstname.toString(),
          accountLastname: accountLastname.toString(),
          accountEmail: accountEmail.toString(),
          canCreateCohorteVaeCollective: canCreateCohorteVaeCollective === "on",
          isAAPAccount: isAAPAccount === "on",
        },
        {
          fetchOptions: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        },
      ),
    );

    if (!result.data?.vaeCollective_createSousCompteVaeCollective) {
      throw new Error("Sous compte non trouvé");
    }

    redirect(
      `/commanditaires/${commanditaireId}/comptes-utilisateur/${result.data?.vaeCollective_createSousCompteVaeCollective.id}`,
    );
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("ACCOUNT_ALREADY_EXISTS")
    ) {
      return {
        errors: {
          accountEmail: { message: "Cette adresse email est déjà utilisée" },
        },
      } as FormState;
    }
    throw error;
  }
};
