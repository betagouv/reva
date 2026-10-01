import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";

import { getCandidacyCountByCohorteId } from "./getCandidacyCountByCohorteId";

describe("getCandidacyCountByCohorteId", () => {
  test("should return 0 when the cohorte has no candidacy", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    const count = await getCandidacyCountByCohorteId({
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
    });

    expect(count).toBe(0);
  });

  test("should count only the candidacies belonging to the cohorte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const otherCohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    await createCandidacyHelper({
      candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
    });
    await createCandidacyHelper({
      candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
    });
    await createCandidacyHelper({
      candidacyArgs: { cohorteVaeCollectiveId: otherCohorteVaeCollective.id },
    });

    const count = await getCandidacyCountByCohorteId({
      cohorteVaeCollectiveId: cohorteVaeCollective.id,
    });

    expect(count).toBe(2);
  });
});
