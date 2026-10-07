import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";

import { getCandidaciesByCohorteId } from "./getCandidaciesByCohorteId";

describe("getCandidaciesByCohorteId", () => {
  test("should return an empty page when the cohorte has no candidacy", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    const result = await getCandidaciesByCohorteId({
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
    });

    expect(result.rows).toEqual([]);
    expect(result.info).toEqual({
      currentPage: 1,
      pageLength: 10000,
      totalRows: 0,
      totalPages: 0,
    });
  });

  test("should return only the candidacies belonging to the cohorte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const otherCohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    const firstCandidacy = await createCandidacyHelper({
      candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
    });
    const secondCandidacy = await createCandidacyHelper({
      candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
    });
    await createCandidacyHelper({
      candidacyArgs: { cohorteVaeCollectiveId: otherCohorteVaeCollective.id },
    });
    await createCandidacyHelper();

    const result = await getCandidaciesByCohorteId({
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
    });

    expect(result.rows.map((candidacy) => candidacy.id).sort()).toEqual(
      [firstCandidacy.id, secondCandidacy.id].sort(),
    );
    expect(result.info.totalRows).toBe(2);
  });

  test("should return candidacies ordered by createdAt descending", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    const oldest = await createCandidacyHelper({
      candidacyArgs: {
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    });
    const newest = await createCandidacyHelper({
      candidacyArgs: {
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
        createdAt: new Date("2024-03-01T00:00:00.000Z"),
      },
    });
    const middle = await createCandidacyHelper({
      candidacyArgs: {
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
        createdAt: new Date("2024-02-01T00:00:00.000Z"),
      },
    });

    const result = await getCandidaciesByCohorteId({
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
    });

    expect(result.rows.map((candidacy) => candidacy.id)).toEqual([
      newest.id,
      middle.id,
      oldest.id,
    ]);
  });

  test("should paginate with limit and offset while keeping the total count", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    await createCandidacyHelper({
      candidacyArgs: {
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    });
    await createCandidacyHelper({
      candidacyArgs: {
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
        createdAt: new Date("2024-03-01T00:00:00.000Z"),
      },
    });
    const middle = await createCandidacyHelper({
      candidacyArgs: {
        cohorteVaeCollectiveId: cohorteVaeCollective.id,
        createdAt: new Date("2024-02-01T00:00:00.000Z"),
      },
    });

    const result = await getCandidaciesByCohorteId({
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
      limit: 1,
      offset: 1,
    });

    expect(result.rows.map((candidacy) => candidacy.id)).toEqual([middle.id]);
    expect(result.info).toEqual({
      currentPage: 2,
      pageLength: 1,
      totalRows: 3,
      totalPages: 3,
    });
  });

  test("should return an empty page when the offset is past the last candidacy", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    await createCandidacyHelper({
      candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
    });

    const result = await getCandidaciesByCohorteId({
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
      limit: 10,
      offset: 10,
    });

    expect(result.rows).toEqual([]);
    expect(result.info).toEqual({
      currentPage: 2,
      pageLength: 10,
      totalRows: 1,
      totalPages: 1,
    });
  });
});
