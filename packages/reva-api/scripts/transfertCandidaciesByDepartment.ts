import { Prisma } from "@prisma/client";

import { prismaClient } from "@/prisma/client";

const USAGE =
  "Usage: npx tsx scripts/transfertCandidaciesByDepartment.ts <sourceCertificationAuthorityId> <targetCertificationAuthorityId...> [--dry-run]";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CHUNK_SIZE = 500;
const TRANSACTION_TIMEOUT_MS = 15 * 60 * 1000;

const COUNT_KEYS = [
  "candidacies",
  "feasibilities",
  "dossiersDeValidation",
  "juries",
] as const;

type CountKey = (typeof COUNT_KEYS)[number];

type AuthorityCounts = Record<CountKey, number>;

const COUNT_LABELS: Record<CountKey, string> = {
  candidacies: "candidatures",
  feasibilities: "faisabilités",
  dossiersDeValidation: "dossiers de validation",
  juries: "jurys",
};

const TABLES = {
  candidacy: { table: "candidacy", column: "id" },
  feasibility: { table: "feasibility", column: "candidacy_id" },
  dossier_de_validation: {
    table: "dossier_de_validation",
    column: "candidacy_id",
  },
  jury: { table: "jury", column: "candidacy_id" },
} as const;

type TableName = keyof typeof TABLES;

type Authority = {
  id: string;
  label: string;
  certificationAuthorityOnDepartment: {
    departmentId: string;
    department: { code: string; label: string };
  }[];
};

type TargetTransfer = {
  id: string;
  label: string;
  candidacyIds: string[];
  counts: AuthorityCounts;
};

type LocalAccountLink = {
  id: string;
  emails: string;
  departments: { id: string; code: string; label: string }[];
};

type RoutedByLocalAccount = {
  candidacyId: string;
  targetLabel: string;
  localAccounts: string;
};

type SkippedCandidacy = {
  candidacyId: string;
  departmentCode: string | null;
  departmentLabel: string | null;
  feasibilities: number;
  dossiersDeValidation: number;
  juries: number;
  localAccounts: LocalAccountLink[];
  unroutableReason?: string;
};

class ScriptError extends Error {}

const emptyCounts = (): AuthorityCounts => ({
  candidacies: 0,
  feasibilities: 0,
  dossiersDeValidation: 0,
  juries: 0,
});

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const formatCounts = (counts: AuthorityCounts): string =>
  COUNT_KEYS.map((key) => `${COUNT_LABELS[key]}=${counts[key]}`).join(", ");

const parseArgs = (): {
  dryRun: boolean;
  sourceId: string;
  targetIds: string[];
} => {
  const args = process.argv.slice(2);
  const unknownFlags = args.filter(
    (arg) => arg.startsWith("--") && arg !== "--dry-run",
  );
  if (unknownFlags.length > 0) {
    throw new ScriptError(
      `Option inconnue: ${unknownFlags.join(", ")}\n${USAGE}`,
    );
  }

  const dryRun = args.includes("--dry-run");
  const [sourceId, ...targetIds] = args.filter((arg) => arg !== "--dry-run");

  if (!sourceId || targetIds.length === 0) {
    throw new ScriptError(USAGE);
  }

  assertUuid(sourceId, "Identifiant source");
  targetIds.forEach((targetId, index) => {
    assertUuid(targetId, `Identifiant cible ${index + 1}`);
  });

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const targetId of targetIds) {
    if (seen.has(targetId)) {
      duplicates.add(targetId);
    }
    seen.add(targetId);
  }
  if (duplicates.size > 0) {
    throw new ScriptError(
      `Identifiants cibles en double: ${[...duplicates].join(", ")}`,
    );
  }
  if (targetIds.includes(sourceId)) {
    throw new ScriptError(
      "Le certificateur source figure aussi dans la liste des cibles.",
    );
  }

  return { dryRun, sourceId, targetIds };
};

const assertUuid = (id: string, label: string) => {
  if (!UUID_REGEX.test(id)) {
    throw new ScriptError(`${label} n'est pas un UUID: ${id}`);
  }
};

const loadAuthorities = async (
  sourceId: string,
  targetIds: string[],
): Promise<{ source: Authority; targets: Authority[] }> => {
  const authorities = await prismaClient.certificationAuthority.findMany({
    where: { id: { in: [sourceId, ...targetIds] } },
    select: {
      id: true,
      label: true,
      certificationAuthorityOnDepartment: {
        select: {
          departmentId: true,
          department: { select: { code: true, label: true } },
        },
      },
    },
  });
  const byId = new Map(
    authorities.map((authority) => [authority.id, authority]),
  );
  const missing = [sourceId, ...targetIds].filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new ScriptError(`Certificateur introuvable: ${missing.join(", ")}`);
  }

  return {
    source: byId.get(sourceId) as Authority,
    targets: targetIds.map((id) => byId.get(id) as Authority),
  };
};

const buildTransfers = (
  targets: Authority[],
): {
  transfers: TargetTransfer[];
  departmentToTarget: Map<string, TargetTransfer>;
} => {
  const transfers: TargetTransfer[] = targets.map((target) => ({
    id: target.id,
    label: target.label,
    candidacyIds: [],
    counts: emptyCounts(),
  }));
  const transferById = new Map(
    transfers.map((transfer) => [transfer.id, transfer]),
  );
  const departmentToTarget = new Map<string, TargetTransfer>();
  const conflicts: string[] = [];

  for (const target of targets) {
    const transfer = transferById.get(target.id);
    if (!transfer) {
      continue;
    }
    for (const link of target.certificationAuthorityOnDepartment) {
      const existing = departmentToTarget.get(link.departmentId);
      if (existing) {
        conflicts.push(
          `- ${link.department.code} (${link.department.label}) : ${existing.label} et ${target.label}`,
        );
        continue;
      }
      departmentToTarget.set(link.departmentId, transfer);
    }
  }

  if (conflicts.length > 0) {
    throw new ScriptError(
      `Des certificateurs cibles partagent un département:\n${conflicts.join("\n")}`,
    );
  }

  return { transfers, departmentToTarget };
};

const loadCandidacyIdsOnSource = async (
  sourceId: string,
): Promise<string[]> => {
  const where = { certificationAuthorityId: sourceId };
  const [candidacies, feasibilities, dossiers, juries] = await Promise.all([
    prismaClient.candidacy.findMany({
      where,
      select: { id: true },
    }),
    prismaClient.feasibility.findMany({
      where,
      select: { candidacyId: true },
      distinct: ["candidacyId"],
    }),
    prismaClient.dossierDeValidation.findMany({
      where,
      select: { candidacyId: true },
      distinct: ["candidacyId"],
    }),
    prismaClient.jury.findMany({
      where,
      select: { candidacyId: true },
      distinct: ["candidacyId"],
    }),
  ]);

  return [
    ...new Set([
      ...candidacies.map((candidacy) => candidacy.id),
      ...feasibilities.map((feasibility) => feasibility.candidacyId),
      ...dossiers.map((dossier) => dossier.candidacyId),
      ...juries.map((jury) => jury.candidacyId),
    ]),
  ].sort();
};

const partitionCandidacies = async (
  sourceId: string,
  departmentToTarget: Map<string, TargetTransfer>,
): Promise<{
  missingDepartment: SkippedCandidacy[];
  uncoveredDepartment: SkippedCandidacy[];
}> => {
  const candidacyIds = await loadCandidacyIdsOnSource(sourceId);
  const candidacies = (
    await Promise.all(
      chunk(candidacyIds, CHUNK_SIZE).map((ids) =>
        prismaClient.candidacy.findMany({
          where: { id: { in: ids } },
          orderBy: { id: "asc" },
          select: {
            id: true,
            candidate: {
              select: {
                departmentId: true,
                department: { select: { code: true, label: true } },
              },
            },
            _count: {
              select: {
                Feasibility: true,
                dossierDeValidation: true,
                Jury: true,
              },
            },
          },
        }),
      ),
    )
  ).flat();

  const missingDepartment: SkippedCandidacy[] = [];
  const uncoveredDepartment: SkippedCandidacy[] = [];

  for (const candidacy of candidacies) {
    const departmentId = candidacy.candidate.departmentId;
    const department = candidacy.candidate.department;
    const counts = {
      feasibilities: candidacy._count.Feasibility,
      dossiersDeValidation: candidacy._count.dossierDeValidation,
      juries: candidacy._count.Jury,
    };
    if (!departmentId) {
      missingDepartment.push({
        candidacyId: candidacy.id,
        departmentCode: null,
        departmentLabel: null,
        localAccounts: [],
        ...counts,
      });
      continue;
    }

    const target = departmentToTarget.get(departmentId);
    if (!target) {
      uncoveredDepartment.push({
        candidacyId: candidacy.id,
        departmentCode: department?.code ?? null,
        departmentLabel: department?.label ?? null,
        localAccounts: [],
        ...counts,
      });
      continue;
    }

    target.candidacyIds.push(candidacy.id);
  }

  return { missingDepartment, uncoveredDepartment };
};

const countByCandidacyIds = async (
  candidacyIds: string[],
  countChunk: (ids: string[]) => Promise<number>,
): Promise<number> => {
  let total = 0;
  for (const ids of chunk(candidacyIds, CHUNK_SIZE)) {
    total += await countChunk(ids);
  }
  return total;
};

const fillTransferCounts = async (
  sourceId: string,
  transfers: TargetTransfer[],
) => {
  for (const transfer of transfers) {
    transfer.counts.candidacies = 0;
    if (transfer.candidacyIds.length === 0) {
      continue;
    }

    const [candidacies, feasibilities, dossiersDeValidation, juries] =
      await Promise.all([
        countByCandidacyIds(transfer.candidacyIds, (ids) =>
          prismaClient.candidacy.count({
            where: { id: { in: ids }, certificationAuthorityId: sourceId },
          }),
        ),
        countByCandidacyIds(transfer.candidacyIds, (ids) =>
          prismaClient.feasibility.count({
            where: {
              candidacyId: { in: ids },
              certificationAuthorityId: sourceId,
            },
          }),
        ),
        countByCandidacyIds(transfer.candidacyIds, (ids) =>
          prismaClient.dossierDeValidation.count({
            where: {
              candidacyId: { in: ids },
              certificationAuthorityId: sourceId,
            },
          }),
        ),
        countByCandidacyIds(transfer.candidacyIds, (ids) =>
          prismaClient.jury.count({
            where: {
              candidacyId: { in: ids },
              certificationAuthorityId: sourceId,
            },
          }),
        ),
      ]);

    transfer.counts.candidacies = candidacies;
    transfer.counts.feasibilities = feasibilities;
    transfer.counts.dossiersDeValidation = dossiersDeValidation;
    transfer.counts.juries = juries;
  }
};

const assignGroupedCount = (
  counts: Map<string, AuthorityCounts>,
  key: CountKey,
  rows: Array<{
    certificationAuthorityId: string | null;
    _count: { _all: number };
  }>,
) => {
  for (const row of rows) {
    if (!row.certificationAuthorityId) {
      continue;
    }
    const current = counts.get(row.certificationAuthorityId);
    if (current) {
      current[key] = row._count._all;
    }
  }
};

const loadCounts = async (
  authorityIds: string[],
): Promise<Map<string, AuthorityCounts>> => {
  const counts = new Map(authorityIds.map((id) => [id, emptyCounts()]));
  const where = { certificationAuthorityId: { in: authorityIds } };
  const [candidacies, feasibilities, dossiers, juries] = await Promise.all([
    prismaClient.candidacy.groupBy({
      by: ["certificationAuthorityId"],
      where,
      _count: { _all: true },
    }),
    prismaClient.feasibility.groupBy({
      by: ["certificationAuthorityId"],
      where,
      _count: { _all: true },
    }),
    prismaClient.dossierDeValidation.groupBy({
      by: ["certificationAuthorityId"],
      where,
      _count: { _all: true },
    }),
    prismaClient.jury.groupBy({
      by: ["certificationAuthorityId"],
      where,
      _count: { _all: true },
    }),
  ]);

  assignGroupedCount(counts, "candidacies", candidacies);
  assignGroupedCount(counts, "feasibilities", feasibilities);
  assignGroupedCount(counts, "dossiersDeValidation", dossiers);
  assignGroupedCount(counts, "juries", juries);

  return counts;
};

const forecastCounts = (
  before: Map<string, AuthorityCounts>,
  sourceId: string,
  transfers: TargetTransfer[],
): Map<string, AuthorityCounts> => {
  const after = new Map<string, AuthorityCounts>();
  for (const [id, counts] of before) {
    after.set(id, { ...counts });
  }

  const source = after.get(sourceId);
  if (!source) {
    throw new ScriptError("Compteurs du certificateur source introuvables.");
  }

  for (const transfer of transfers) {
    const target = after.get(transfer.id);
    if (!target) {
      throw new ScriptError(`Compteurs introuvables pour ${transfer.label}.`);
    }
    for (const key of COUNT_KEYS) {
      source[key] -= transfer.counts[key];
      target[key] += transfer.counts[key];
    }
  }

  return after;
};

const assertForecastNonNegative = (
  forecast: Map<string, AuthorityCounts>,
  authorities: Authority[],
) => {
  const lines: string[] = [];
  for (const authority of authorities) {
    const counts = forecast.get(authority.id);
    if (!counts) {
      continue;
    }
    for (const key of COUNT_KEYS) {
      if (counts[key] < 0) {
        lines.push(`- ${authority.label} ${COUNT_LABELS[key]}=${counts[key]}`);
      }
    }
  }
  if (lines.length > 0) {
    throw new ScriptError(
      `La prévision produit un compteur négatif:\n${lines.join("\n")}`,
    );
  }
};

const printSourceLocalAccounts = async (sourceId: string) => {
  const localAccounts =
    await prismaClient.certificationAuthorityLocalAccount.findMany({
      where: { certificationAuthorityId: sourceId },
      orderBy: { id: "asc" },
      select: {
        id: true,
        certificationAuthorityLocalAccountOnAccount: {
          select: { account: { select: { email: true } } },
        },
        certificationAuthorityLocalAccountOnDepartment: {
          select: {
            department: { select: { code: true, label: true } },
          },
        },
        _count: {
          select: { certificationAuthorityLocalAccountOnCandidacy: true },
        },
      },
    });

  console.log(
    `\nComptes locaux du certificateur source: ${localAccounts.length}`,
  );
  if (localAccounts.length === 0) {
    console.log("Aucun compte local.");
    return;
  }

  for (const localAccount of localAccounts) {
    const emails = localAccount.certificationAuthorityLocalAccountOnAccount
      .map((link) => link.account.email)
      .sort()
      .join(", ");
    const departments =
      localAccount.certificationAuthorityLocalAccountOnDepartment
        .map((link) => `${link.department.code} ${link.department.label}`)
        .sort()
        .join(", ");
    const candidacyCount =
      localAccount._count.certificationAuthorityLocalAccountOnCandidacy;
    console.log(
      `${emails || "sans compte"} | ${localAccount.id} | candidatures=${candidacyCount} | départements=${departments || "aucun"}`,
    );
  }
};

const printAuthorities = (source: Authority, targets: Authority[]) => {
  console.log("\nDépartements des cibles");
  for (const target of targets) {
    const codes = target.certificationAuthorityOnDepartment
      .map((link) => link.department.code)
      .sort()
      .join(", ");
    console.log(`${target.label} (${target.id}): ${codes || "aucun"}`);
    if (target.certificationAuthorityOnDepartment.length === 0) {
      console.log(
        `Attention: ${target.label} n'a aucun département. Aucune candidature ne peut lui être routée.`,
      );
    }
  }
  console.log(`\nSource: ${source.label} (${source.id})`);
};

const printCounts = (
  title: string,
  authorities: Authority[],
  countsById: Map<string, AuthorityCounts>,
  sourceId: string,
) => {
  console.log(`\n${title}`);
  for (const authority of authorities) {
    const counts = countsById.get(authority.id) ?? emptyCounts();
    const role = authority.id === sourceId ? "source" : "cible";
    console.log(
      `${role} | ${authority.label} | ${authority.id} | ${formatCounts(counts)}`,
    );
  }
};

const attachSourceLocalAccounts = async (
  sourceId: string,
  skipped: SkippedCandidacy[],
) => {
  const linksByCandidacyId = new Map<string, LocalAccountLink[]>();

  for (const ids of chunk(
    skipped.map((candidacy) => candidacy.candidacyId),
    CHUNK_SIZE,
  )) {
    const links =
      await prismaClient.certificationAuthorityLocalAccountOnCandidacy.findMany(
        {
          where: {
            candidacyId: { in: ids },
            certificationAuthorityLocalAccount: {
              certificationAuthorityId: sourceId,
            },
          },
          select: {
            candidacyId: true,
            certificationAuthorityLocalAccount: {
              select: {
                id: true,
                certificationAuthorityLocalAccountOnAccount: {
                  select: { account: { select: { email: true } } },
                },
                certificationAuthorityLocalAccountOnDepartment: {
                  select: {
                    departmentId: true,
                    department: { select: { code: true, label: true } },
                  },
                },
              },
            },
          },
        },
      );

    for (const link of links) {
      const account = link.certificationAuthorityLocalAccount;
      const emails = account.certificationAuthorityLocalAccountOnAccount
        .map((item) => item.account.email)
        .sort()
        .join(", ");
      const current = linksByCandidacyId.get(link.candidacyId) ?? [];
      current.push({
        id: account.id,
        emails: emails || "sans compte",
        departments: account.certificationAuthorityLocalAccountOnDepartment
          .map((item) => ({
            id: item.departmentId,
            code: item.department.code,
            label: item.department.label,
          }))
          .sort((left, right) => left.code.localeCompare(right.code)),
      });
      linksByCandidacyId.set(link.candidacyId, current);
    }
  }

  for (const candidacy of skipped) {
    candidacy.localAccounts = (
      linksByCandidacyId.get(candidacy.candidacyId) ?? []
    ).sort((left, right) => left.emails.localeCompare(right.emails));
  }
};

const formatDepartment = (candidacy: SkippedCandidacy): string => {
  if (!candidacy.departmentCode) {
    return "aucun";
  }
  return candidacy.departmentLabel
    ? `${candidacy.departmentCode} ${candidacy.departmentLabel}`
    : candidacy.departmentCode;
};

const formatLocalAccounts = (candidacy: SkippedCandidacy): string => {
  if (candidacy.localAccounts.length === 0) {
    return "aucun";
  }
  return candidacy.localAccounts
    .map((account) => `${account.emails} (${account.id})`)
    .join(", ");
};

const targetForLocalAccounts = (
  localAccounts: LocalAccountLink[],
  departmentToTarget: Map<string, TargetTransfer>,
): { target?: TargetTransfer; reason: string } => {
  const targets = new Map<string, TargetTransfer>();
  for (const account of localAccounts) {
    for (const department of account.departments) {
      const target = departmentToTarget.get(department.id);
      if (target) {
        targets.set(target.id, target);
      }
    }
  }

  if (targets.size === 1) {
    return { target: [...targets.values()][0], reason: "" };
  }
  if (targets.size === 0) {
    return {
      reason: "aucun département du compte local n'est couvert par une cible",
    };
  }
  return {
    reason: `comptes locaux couverts par plusieurs cibles: ${[
      ...targets.values(),
    ]
      .map((target) => target.label)
      .join(", ")}`,
  };
};

const reassignSkippedCandidaciesWithLocalAccount = (
  missingDepartment: SkippedCandidacy[],
  uncoveredDepartment: SkippedCandidacy[],
  departmentToTarget: Map<string, TargetTransfer>,
): RoutedByLocalAccount[] => {
  const routed: RoutedByLocalAccount[] = [];

  for (const skipped of [missingDepartment, uncoveredDepartment]) {
    const remaining: SkippedCandidacy[] = [];
    for (const candidacy of skipped) {
      if (candidacy.localAccounts.length === 0) {
        remaining.push(candidacy);
        continue;
      }

      const { target, reason } = targetForLocalAccounts(
        candidacy.localAccounts,
        departmentToTarget,
      );
      if (!target) {
        candidacy.unroutableReason = reason;
        remaining.push(candidacy);
        continue;
      }

      target.candidacyIds.push(candidacy.candidacyId);
      routed.push({
        candidacyId: candidacy.candidacyId,
        targetLabel: target.label,
        localAccounts: formatLocalAccounts(candidacy),
      });
    }
    skipped.splice(0, skipped.length, ...remaining);
  }

  return routed.sort((left, right) =>
    left.candidacyId.localeCompare(right.candidacyId),
  );
};

const assignSkippedWithoutLocalAccountToFirstTarget = (
  missingDepartment: SkippedCandidacy[],
  uncoveredDepartment: SkippedCandidacy[],
  transfers: TargetTransfer[],
): SkippedCandidacy[] => {
  const firstTarget = transfers[0];
  if (!firstTarget) {
    throw new ScriptError("Aucun compte cible.");
  }

  const routed: SkippedCandidacy[] = [];
  for (const skipped of [missingDepartment, uncoveredDepartment]) {
    const remaining: SkippedCandidacy[] = [];
    for (const candidacy of skipped) {
      if (candidacy.localAccounts.length > 0) {
        remaining.push(candidacy);
        continue;
      }
      firstTarget.candidacyIds.push(candidacy.candidacyId);
      routed.push(candidacy);
    }
    skipped.splice(0, skipped.length, ...remaining);
  }

  return routed.sort((left, right) =>
    left.candidacyId.localeCompare(right.candidacyId),
  );
};

const assignRemainingSkippedToFirstTarget = (
  missingDepartment: SkippedCandidacy[],
  uncoveredDepartment: SkippedCandidacy[],
  transfers: TargetTransfer[],
): SkippedCandidacy[] => {
  const firstTarget = transfers[0];
  if (!firstTarget) {
    throw new ScriptError("Aucun compte cible.");
  }

  const routed = [...missingDepartment, ...uncoveredDepartment];
  for (const candidacy of routed) {
    firstTarget.candidacyIds.push(candidacy.candidacyId);
  }
  missingDepartment.splice(0, missingDepartment.length);
  uncoveredDepartment.splice(0, uncoveredDepartment.length);

  return routed.sort((left, right) =>
    left.candidacyId.localeCompare(right.candidacyId),
  );
};

const CANDIDACY_ADMIN_URL = "https://vae.gouv.fr/admin2/candidacies";

const candidacyAdminUrl = (
  candidacyId: string,
  page: "summary" | "feasibility",
) => `${CANDIDACY_ADMIN_URL}/${candidacyId}/${page}/`;

const printSkipped = (
  title: string,
  candidacies: Array<SkippedCandidacy & { reason: string }>,
) => {
  console.log(`\n${title}: ${candidacies.length}`);
  for (const candidacy of candidacies) {
    const adminUrls =
      candidacy.localAccounts.length === 0
        ? ` | ${candidacyAdminUrl(candidacy.candidacyId, "summary")} | ${candidacyAdminUrl(candidacy.candidacyId, "feasibility")}`
        : "";
    const unroutable = candidacy.unroutableReason
      ? ` | non transférée: ${candidacy.unroutableReason}`
      : "";
    console.log(
      `- ${candidacy.candidacyId} (département ${formatDepartment(candidacy)}) | ${candidacy.reason} | faisabilités=${candidacy.feasibilities} | dossiers de validation=${candidacy.dossiersDeValidation} | jurys=${candidacy.juries} | compte local=${formatLocalAccounts(candidacy)}${unroutable}${adminUrls}`,
    );
  }
};

const printSummary = (
  transfers: TargetTransfer[],
  missingDepartment: SkippedCandidacy[],
  uncoveredDepartment: SkippedCandidacy[],
  routedByLocalAccount: RoutedByLocalAccount[],
  routedToFirstTarget: SkippedCandidacy[],
  routedRemainingOnSource: SkippedCandidacy[],
) => {
  const firstTarget = transfers[0];
  console.log("\nRécapitulatif du routage");
  for (const transfer of transfers) {
    console.log(
      `${transfer.label} (${transfer.id}): ${formatCounts(transfer.counts)}`,
    );
  }

  console.log(
    `\nTransférées via un compte local: ${routedByLocalAccount.length}`,
  );
  for (const candidacy of routedByLocalAccount) {
    console.log(
      `- ${candidacy.candidacyId} -> ${candidacy.targetLabel} | compte local=${candidacy.localAccounts}`,
    );
  }

  console.log(
    `\nTransférées vers le premier compte cible${firstTarget ? ` (${firstTarget.label})` : ""}: ${routedToFirstTarget.length}`,
  );
  for (const candidacy of routedToFirstTarget) {
    const reason = candidacy.departmentCode
      ? "hors périmètre"
      : "sans département";
    console.log(
      `- ${candidacy.candidacyId} | ${reason} | ${candidacyAdminUrl(candidacy.candidacyId, "summary")} | ${candidacyAdminUrl(candidacy.candidacyId, "feasibility")}`,
    );
  }

  console.log(
    `\nTransférées vers le premier compte cible, compte local non routable${firstTarget ? ` (${firstTarget.label})` : ""}: ${routedRemainingOnSource.length}`,
  );
  for (const candidacy of routedRemainingOnSource) {
    const reason = candidacy.unroutableReason ?? "compte local non routable";
    console.log(
      `- ${candidacy.candidacyId} | ${reason} | compte local=${formatLocalAccounts(candidacy)} | ${candidacyAdminUrl(candidacy.candidacyId, "summary")} | ${candidacyAdminUrl(candidacy.candidacyId, "feasibility")}`,
    );
  }

  const ignored = [
    ...missingDepartment.map((candidacy) => ({
      ...candidacy,
      reason: "sans département",
    })),
    ...uncoveredDepartment.map((candidacy) => ({
      ...candidacy,
      reason: "hors périmètre",
    })),
  ].sort((left, right) => left.candidacyId.localeCompare(right.candidacyId));

  printSkipped(
    "Ignorées associées à un compte local",
    ignored.filter((candidacy) => candidacy.localAccounts.length > 0),
  );
  printSkipped(
    "Ignorées sans compte local",
    ignored.filter((candidacy) => candidacy.localAccounts.length === 0),
  );
};

const updateCertificationAuthority = async (
  tx: Prisma.TransactionClient,
  table: TableName,
  sourceId: string,
  targetId: string,
  candidacyIds: string[],
): Promise<number> => {
  const { table: tableName, column } = TABLES[table];
  let updated = 0;
  for (const ids of chunk(candidacyIds, CHUNK_SIZE)) {
    updated += await tx.$executeRaw`
      UPDATE ${Prisma.raw(tableName)}
      SET certification_authority_id = ${targetId}::uuid
      WHERE certification_authority_id = ${sourceId}::uuid
        AND ${Prisma.raw(column)}::text IN (${Prisma.join(ids)})
    `;
  }
  return updated;
};

const assertAffected = (
  entity: string,
  transfer: TargetTransfer,
  affected: number,
  expected: number,
) => {
  if (affected !== expected) {
    throw new ScriptError(
      `${transfer.label}: ${affected} ligne(s) de ${entity} mises à jour, ${expected} attendue(s). Transaction annulée.`,
    );
  }
};

const applyTransfers = async (
  sourceId: string,
  transfers: TargetTransfer[],
) => {
  const toApply = transfers.filter(
    (transfer) => transfer.candidacyIds.length > 0,
  );
  if (toApply.length === 0) {
    console.log("\nAucune candidature à transférer.");
    return;
  }

  console.log("\nÉcriture du transfert.");
  await prismaClient.$transaction(
    async (tx) => {
      for (const transfer of toApply) {
        console.log(
          `Transfert vers ${transfer.label}: ${transfer.candidacyIds.length} candidature(s).`,
        );
        const candidacies = await updateCertificationAuthority(
          tx,
          "candidacy",
          sourceId,
          transfer.id,
          transfer.candidacyIds,
        );
        assertAffected(
          "candidatures",
          transfer,
          candidacies,
          transfer.counts.candidacies,
        );

        const feasibilities = await updateCertificationAuthority(
          tx,
          "feasibility",
          sourceId,
          transfer.id,
          transfer.candidacyIds,
        );
        assertAffected(
          "faisabilités",
          transfer,
          feasibilities,
          transfer.counts.feasibilities,
        );

        const dossiers = await updateCertificationAuthority(
          tx,
          "dossier_de_validation",
          sourceId,
          transfer.id,
          transfer.candidacyIds,
        );
        assertAffected(
          "dossiers de validation",
          transfer,
          dossiers,
          transfer.counts.dossiersDeValidation,
        );

        const juries = await updateCertificationAuthority(
          tx,
          "jury",
          sourceId,
          transfer.id,
          transfer.candidacyIds,
        );
        assertAffected("jurys", transfer, juries, transfer.counts.juries);
      }
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );
  console.log("Écriture terminée.");
};

const assertCountsMatch = (
  expected: Map<string, AuthorityCounts>,
  actual: Map<string, AuthorityCounts>,
  authorities: Authority[],
) => {
  const lines: string[] = [];
  for (const authority of authorities) {
    const expectedCounts = expected.get(authority.id);
    const actualCounts = actual.get(authority.id);
    if (!expectedCounts || !actualCounts) {
      lines.push(`- ${authority.label}: compteurs absents`);
      continue;
    }
    for (const key of COUNT_KEYS) {
      if (expectedCounts[key] !== actualCounts[key]) {
        lines.push(
          `- ${authority.label} ${COUNT_LABELS[key]}: attendu ${expectedCounts[key]}, obtenu ${actualCounts[key]}`,
        );
      }
    }
  }
  if (lines.length > 0) {
    throw new ScriptError(
      `Le transfert est enregistré, mais les compteurs après coup ne correspondent pas à la prévision:\n${lines.join("\n")}`,
    );
  }
};

const run = async () => {
  const { dryRun, sourceId, targetIds } = parseArgs();
  const { source, targets } = await loadAuthorities(sourceId, targetIds);
  await printSourceLocalAccounts(sourceId);
  const { transfers, departmentToTarget } = buildTransfers(targets);
  const { missingDepartment, uncoveredDepartment } = await partitionCandidacies(
    sourceId,
    departmentToTarget,
  );
  await attachSourceLocalAccounts(sourceId, [
    ...missingDepartment,
    ...uncoveredDepartment,
  ]);
  const routedByLocalAccount = reassignSkippedCandidaciesWithLocalAccount(
    missingDepartment,
    uncoveredDepartment,
    departmentToTarget,
  );
  const routedToFirstTarget = assignSkippedWithoutLocalAccountToFirstTarget(
    missingDepartment,
    uncoveredDepartment,
    transfers,
  );
  const routedRemainingOnSource = assignRemainingSkippedToFirstTarget(
    missingDepartment,
    uncoveredDepartment,
    transfers,
  );
  await fillTransferCounts(sourceId, transfers);

  const authorities = [source, ...targets];
  const authorityIds = authorities.map((authority) => authority.id);
  const before = await loadCounts(authorityIds);
  const forecast = forecastCounts(before, sourceId, transfers);

  printAuthorities(source, targets);
  printCounts("Compteurs avant transfert", authorities, before, sourceId);
  printSummary(
    transfers,
    missingDepartment,
    uncoveredDepartment,
    routedByLocalAccount,
    routedToFirstTarget,
    routedRemainingOnSource,
  );
  assertForecastNonNegative(forecast, authorities);

  if (dryRun) {
    printCounts("Prévision après transfert", authorities, forecast, sourceId);
    console.log("\nDry run: aucune écriture.");
    return;
  }

  await applyTransfers(sourceId, transfers);
  const after = await loadCounts(authorityIds);
  printCounts("Compteurs après transfert", authorities, after, sourceId);
  assertCountsMatch(forecast, after, authorities);
  console.log(
    "\nTransfert terminé. Les compteurs correspondent à la prévision.",
  );
};

const main = async () => {
  try {
    await run();
  } catch (error) {
    if (error instanceof ScriptError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    await prismaClient.$disconnect();
  }
};

main();
