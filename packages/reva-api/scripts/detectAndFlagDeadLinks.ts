import { DeadLinkResolvedReason, DeadLinkSource } from "@prisma/client";

import { logger } from "../modules/shared/logger/logger";
import { prismaClient } from "../prisma/client";

import {
  checkUrl,
  normalizeStoredUrl,
  readUrlsFromText,
  type UrlCheckOutcome,
} from "./deadLinkCheck";

const CHECK_CONCURRENCY = 8;
const UPDATE_CHUNK_SIZE = 500;

const ADDITIONAL_INFO_URL_FIELDS = [
  ["linkToReferential", "link_to_referential"],
  ["linkToCorrespondenceTable", "link_to_corresponence_table"],
  ["dossierDeValidationLink", "dossier_de_validation_link"],
  ["linkToJuryGuide", "link_to_jury_guide"],
] as const;

type MonitoredLink = {
  sourceTable: DeadLinkSource;
  sourceId: string;
  fieldName: string | null;
  url: string;
};

export async function detectAndFlagDeadLinks(): Promise<void> {
  const { links, skipped } = await collectMonitoredLinks();
  const checkedAt = new Date();
  const outcomeByUrl = await checkLinks(links);

  const removed = await resolveUnmonitoredIncidents(links, checkedAt);

  let opened = 0;
  let stillDead = 0;
  let recovered = 0;

  for (const link of links) {
    const outcome = outcomeByUrl.get(link.url);
    if (!outcome) {
      continue;
    }

    if (outcome.dead) {
      const created = await recordDeadLink(link, outcome, checkedAt);
      if (created) {
        opened += 1;
      } else {
        stillDead += 1;
      }
    } else if (await recordRecoveredLink(link, outcome.httpStatus, checkedAt)) {
      recovered += 1;
    }
  }

  logger.info(
    {
      checked: links.length,
      requests: outcomeByUrl.size,
      opened,
      stillDead,
      recovered,
      removed,
      skipped,
    },
    "Dead link check finished",
  );
}

async function collectMonitoredLinks(): Promise<{
  links: MonitoredLink[];
  skipped: number;
}> {
  const links: MonitoredLink[] = [];
  let skipped = 0;

  const additionalInfos =
    await prismaClient.certificationAdditionalInfo.findMany({
      select: {
        id: true,
        linkToReferential: true,
        linkToCorrespondenceTable: true,
        dossierDeValidationLink: true,
        linkToJuryGuide: true,
        usefulResources: true,
      },
    });

  for (const info of additionalInfos) {
    for (const [property, fieldName] of ADDITIONAL_INFO_URL_FIELDS) {
      skipped += pushStoredLink(links, {
        sourceTable: DeadLinkSource.CERTIFICATION_ADDITIONAL_INFO,
        sourceId: info.id,
        fieldName,
        raw: info[property],
      });
    }

    const extracted = readUrlsFromText(info.usefulResources);
    skipped += extracted.discarded;
    for (const url of extracted.urls) {
      links.push({
        sourceTable: DeadLinkSource.CERTIFICATION_ADDITIONAL_INFO,
        sourceId: info.id,
        fieldName: "useful_resources",
        url,
      });
    }
  }

  const authorities = await prismaClient.certificationAuthority.findMany({
    select: { id: true, websiteUrl: true },
  });
  for (const authority of authorities) {
    skipped += pushStoredLink(links, {
      sourceTable: DeadLinkSource.CERTIFICATION_AUTHORITY,
      sourceId: authority.id,
      fieldName: "website_url",
      raw: authority.websiteUrl,
    });
  }

  const organisms = await prismaClient.organism.findMany({
    select: { id: true, website: true, siteInternet: true },
  });
  for (const organism of organisms) {
    skipped += pushStoredLink(links, {
      sourceTable: DeadLinkSource.ORGANISM,
      sourceId: organism.id,
      fieldName: "website",
      raw: organism.website,
    });
    skipped += pushStoredLink(links, {
      sourceTable: DeadLinkSource.ORGANISM,
      sourceId: organism.id,
      fieldName: "site_internet",
      raw: organism.siteInternet,
    });
  }

  const maisonsMeres = await prismaClient.maisonMereAAP.findMany({
    select: { id: true, siteWeb: true },
  });
  for (const maisonMere of maisonsMeres) {
    skipped += pushStoredLink(links, {
      sourceTable: DeadLinkSource.MAISON_MERE_AAP,
      sourceId: maisonMere.id,
      fieldName: "site_web",
      raw: maisonMere.siteWeb,
    });
  }

  const manualLinks = await prismaClient.manualMonitoredLink.findMany({
    where: { disabledAt: null },
    select: { id: true, url: true },
  });
  for (const manualLink of manualLinks) {
    skipped += pushStoredLink(links, {
      sourceTable: DeadLinkSource.MANUAL,
      sourceId: manualLink.id,
      fieldName: null,
      raw: manualLink.url,
    });
  }

  return { links, skipped };
}

function pushStoredLink(
  links: MonitoredLink[],
  input: {
    sourceTable: DeadLinkSource;
    sourceId: string;
    fieldName: string | null;
    raw: string | null;
  },
): number {
  if (input.raw == null || input.raw.trim() === "") {
    return 0;
  }

  const url = normalizeStoredUrl(input.raw);
  if (!url) {
    return 1;
  }

  links.push({
    sourceTable: input.sourceTable,
    sourceId: input.sourceId,
    fieldName: input.fieldName,
    url,
  });
  return 0;
}

async function checkLinks(
  links: MonitoredLink[],
): Promise<Map<string, UrlCheckOutcome>> {
  const uniqueUrls = [...new Set(links.map((link) => link.url))];
  const outcomes = await mapWithConcurrency(
    uniqueUrls,
    CHECK_CONCURRENCY,
    async (url) => [url, await checkUrl(url)] as const,
  );
  return new Map(outcomes);
}

async function resolveUnmonitoredIncidents(
  links: MonitoredLink[],
  checkedAt: Date,
): Promise<number> {
  const monitoredKeys = new Set(links.map(incidentKey));
  const openIncidents = await prismaClient.deadLink.findMany({
    where: { resolvedAt: null },
    select: {
      id: true,
      sourceTable: true,
      sourceId: true,
      fieldName: true,
      url: true,
    },
  });

  const staleIds = openIncidents
    .filter((incident) => !monitoredKeys.has(incidentKey(incident)))
    .map((incident) => incident.id);

  for (let index = 0; index < staleIds.length; index += UPDATE_CHUNK_SIZE) {
    await prismaClient.deadLink.updateMany({
      where: { id: { in: staleIds.slice(index, index + UPDATE_CHUNK_SIZE) } },
      data: {
        resolvedAt: checkedAt,
        resolvedReason: DeadLinkResolvedReason.NO_LONGER_PRESENT,
        lastCheckedAt: checkedAt,
      },
    });
  }

  return staleIds.length;
}

async function recordDeadLink(
  link: MonitoredLink,
  outcome: Extract<UrlCheckOutcome, { dead: true }>,
  checkedAt: Date,
): Promise<boolean> {
  const existing = await prismaClient.deadLink.findFirst({
    where: {
      sourceTable: link.sourceTable,
      sourceId: link.sourceId,
      fieldName: link.fieldName,
      url: link.url,
      resolvedAt: null,
    },
    select: { id: true },
  });

  if (existing) {
    await prismaClient.deadLink.update({
      where: { id: existing.id },
      data: {
        httpStatus: outcome.httpStatus,
        errorMessage: outcome.errorMessage,
        lastCheckedAt: checkedAt,
      },
    });
    return false;
  }

  await prismaClient.deadLink.create({
    data: {
      sourceTable: link.sourceTable,
      sourceId: link.sourceId,
      fieldName: link.fieldName,
      url: link.url,
      httpStatus: outcome.httpStatus,
      errorMessage: outcome.errorMessage,
      lastCheckedAt: checkedAt,
    },
  });
  return true;
}

async function recordRecoveredLink(
  link: MonitoredLink,
  httpStatus: number,
  checkedAt: Date,
): Promise<boolean> {
  const existing = await prismaClient.deadLink.findFirst({
    where: {
      sourceTable: link.sourceTable,
      sourceId: link.sourceId,
      fieldName: link.fieldName,
      url: link.url,
      resolvedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    return false;
  }

  await prismaClient.deadLink.update({
    where: { id: existing.id },
    data: {
      httpStatus,
      errorMessage: null,
      lastCheckedAt: checkedAt,
      resolvedAt: checkedAt,
      resolvedReason: DeadLinkResolvedReason.RECOVERED,
    },
  });
  return true;
}

function incidentKey(link: {
  sourceTable: DeadLinkSource;
  sourceId: string;
  fieldName: string | null;
  url: string;
}): string {
  return `${link.sourceTable}\0${link.sourceId}\0${link.fieldName ?? ""}\0${link.url}`;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

const main = async () => {
  await detectAndFlagDeadLinks();
};

if (require.main === module) {
  main().catch((error) => {
    logger.error(error, "Unhandled error");
    process.exit(1);
  });
}
