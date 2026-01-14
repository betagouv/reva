"use client";

import Alert from "@codegouvfr/react-dsfr/Alert";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { useKeycloakContext } from "@/components/auth/keycloak.context";
import { errorToast, graphqlErrorToast } from "@/components/toast/toast";
import { PageLayout } from "@/layouts/page.layout";

import { useResetPassword } from "./reset-password.hooks";

export default function ResetPassword() {
  const params = useSearchParams();
  const router = useRouter();
  const { resetKeycloakInstance } = useKeycloakContext();

  const token =
    params.get("resetPasswordToken") || params.get("setPasswordToken") || "";

  const [password, setPassword] = useState<string>("");
  const [passwordConfirmation, setPasswordConfirmation] = useState<string>("");

  const { resetPassword } = useResetPassword();

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const regex = new RegExp(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{14,}$/,
    );

    if (password != passwordConfirmation) {
      errorToast("Les mots de passe doivent correspondre.");
      return;
    } else if (!regex.test(password)) {
      errorToast("Le mot de passe doit respecter les règles indiquées.");
      return;
    }

    try {
      const response = await resetPassword.mutateAsync({ token, password });
      const tokens = response.candidate_resetPassword;
      if (tokens) {
        resetKeycloakInstance(tokens);
        router.push("/");
      }
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  const title = "Définir un mot de passe";

  return (
    <PageLayout
      title={title}
      data-testid="reset-password-home"
      className="p-6 pt-8"
    >
      <h1 className="mb-10">{title}</h1>

      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <div className="flex flex-col gap-4">
          <Alert
            small
            severity="info"
            className="mb-6"
            description={
              <ul>
                <li>
                  Votre mot de passe doit contenir au moins 14 caractères.
                </li>
                <li>Il doit inclure au moins une lettre majuscule.</li>
                <li>Il doit inclure au moins une lettre minuscule.</li>
                <li>Il doit inclure au moins un chiffre.</li>
                <li>Il doit inclure au moins un caractère spécial.</li>
              </ul>
            }
          />

          <Input
            className="mb-0"
            disabled={resetPassword.isPending}
            nativeInputProps={{
              id: "password",
              name: "password",
              required: true,
              type: "password",
              spellCheck: "false",
              onChange: (e) => setPassword(e.target.value),
            }}
            label="Nouveau mot de passe"
          />

          <Input
            disabled={resetPassword.isPending}
            nativeInputProps={{
              id: "passwordConfirmation",
              name: "passwordConfirmation",
              required: true,
              type: "password",
              spellCheck: "false",
              onChange: (e) => setPasswordConfirmation(e.target.value),
            }}
            label="Confirmation du mot de passe"
          />
        </div>

        <Button
          type="submit"
          className="w-full justify-center"
          data-testid="reset-password-home-submit"
          disabled={resetPassword.isPending}
        >
          Valider
        </Button>
      </form>
    </PageLayout>
  );
}
