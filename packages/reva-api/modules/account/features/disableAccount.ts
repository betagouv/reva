import { Account } from "../account.types";

import { disableAccounts } from "./disableAccounts";

export const disableAccountById = async (params: {
  accountId: string;
}): Promise<Account> => {
  const {
    disabledAccounts: [account],
    failedAccounts: [failure],
  } = await disableAccounts({ accountIds: [params.accountId] });

  if (failure) {
    throw failure.error;
  }

  return account;
};
