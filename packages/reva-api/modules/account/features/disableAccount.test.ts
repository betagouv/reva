import * as getKeycloakAdminModule from "@/modules/shared/auth/getKeycloakAdmin";
import { COMPTE_ADMIN_NON_MODIFIABLE } from "@/modules/shared/errors/messages";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";

import { disableAccountById } from "./disableAccount";

const mockKeycloakAdmin = (groups: { name: string }[] = []) =>
  vi.spyOn(getKeycloakAdminModule, "getKeycloakAdmin").mockImplementation(
    () =>
      Promise.resolve({
        users: {
          findOne: vi.fn().mockResolvedValue({}),
          listGroups: vi.fn().mockResolvedValue(groups),
          update: vi.fn().mockResolvedValue(undefined),
        },
      }) as unknown as ReturnType<
        typeof getKeycloakAdminModule.getKeycloakAdmin
      >,
  );

describe("disableAccountById", () => {
  test("disables the account and returns it", async () => {
    mockKeycloakAdmin();
    const account = await createAccountHelper();

    const result = await disableAccountById({ accountId: account.id });

    expect(result.id).toBe(account.id);
    expect(result.disabledAt).not.toBeNull();
  });

  test("throws the error when the account cannot be disabled", async () => {
    mockKeycloakAdmin([{ name: "admin" }]);
    const account = await createAccountHelper();

    await expect(disableAccountById({ accountId: account.id })).rejects.toThrow(
      COMPTE_ADMIN_NON_MODIFIABLE,
    );
  });
});
