import jwt from "jsonwebtoken";

import { isFeatureActiveForUser } from "@/modules/feature-flipping/feature-flipping.features";

import { getSousCompteVaeCollectiveById } from "./getSousCompteVaeCollectiveById";

export const getMetabaseDashboardIframeUrlForSousCompteVaeCollective = async ({
  sousCompteVaeCollectiveId,
}: {
  sousCompteVaeCollectiveId: string;
}) => {
  const sousCompteVaeCollective = await getSousCompteVaeCollectiveById({
    sousCompteVaeCollectiveId,
  });
  if (!sousCompteVaeCollective) {
    return null;
  }

  const isFeatureActive = await isFeatureActiveForUser({
    feature: "SHOW_METABASE_DASHBOARD_VAE_COLLECTIVE",
  });
  if (!isFeatureActive) {
    return null;
  }

  const METABASE_SITE_URL = process.env.METABASE_SITE_URL;
  const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY;

  if (!METABASE_SITE_URL || !METABASE_SECRET_KEY) {
    console.error(
      "Missing METABASE_SITE_URL or METABASE_SECRET_KEY environment variables",
    );
    return null;
  }

  const payload = {
    resource: { dashboard: 287 },
    params: {
      account: [sousCompteVaeCollective.accountId],
    },
    exp: Math.round(Date.now() / 1000) + 30 * 60, // 30 minute expiration
  };
  const token = jwt.sign(payload, METABASE_SECRET_KEY);

  const dashboardUrl =
    METABASE_SITE_URL +
    "/embed/dashboard/" +
    token +
    "#bordered=true&titled=true";

  return dashboardUrl;
};
