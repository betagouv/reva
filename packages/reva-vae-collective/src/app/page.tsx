"use client";
import { redirect } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/auth";
import { useKeycloakContext } from "@/components/auth/keycloakContext";

import { redirectCommanditaireVaeCollective } from "./actions";

export default function Home() {
  const { authenticated } = useKeycloakContext();
  const { isAdmin, isVAECollectiveManager, isSousCompteVaeCollective } =
    useAuth();

  useEffect(() => {
    if (authenticated && isAdmin) {
      redirect("/commanditaires");
    }

    if (
      authenticated &&
      (isVAECollectiveManager || isSousCompteVaeCollective)
    ) {
      redirectCommanditaireVaeCollective();
    }
  }, [
    authenticated,
    isAdmin,
    isVAECollectiveManager,
    isSousCompteVaeCollective,
  ]);

  return null;
}
