"use client";

import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth";
import { useKeycloakContext } from "@/components/auth/keycloakContext";

import type { Tokens } from "@/components/auth/keycloak.utils";

type PostLoginClientProps = {
  tokens: Tokens;
  commanditaireVaeCollectiveId?: string;
  redirectAfterLogin?: string;
};

const PostLoginClient = ({
  tokens,
  commanditaireVaeCollectiveId,
  redirectAfterLogin,
}: PostLoginClientProps) => {
  const { resetKeycloakInstance, authenticated } = useKeycloakContext();
  const [ready, setReady] = useState(false);
  const { isVAECollectiveManager, isSousCompteVaeCollective, isAdmin } =
    useAuth();

  useEffect(() => {
    if (!ready) {
      resetKeycloakInstance(tokens);
      setReady(true);
    }
  }, [resetKeycloakInstance, tokens, ready]);

  useEffect(() => {
    if (ready && authenticated && redirectAfterLogin) {
      if (isVAECollectiveManager || isSousCompteVaeCollective) {
        redirect(`/commanditaires/${commanditaireVaeCollectiveId}/cohortes`);
      }

      if (isAdmin) {
        redirect("/commanditaires");
      }
    }
  }, [
    ready,
    authenticated,
    isVAECollectiveManager,
    isSousCompteVaeCollective,
    isAdmin,
    commanditaireVaeCollectiveId,
    redirectAfterLogin,
  ]);

  return null;
};

export default PostLoginClient;
