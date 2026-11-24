import { format } from "date-fns";

import { sendEmailUsingTemplate } from "@/modules/shared/email/sendEmailUsingTemplate";

export const sendInactiveAccountDisablingWarningEmail = async ({
  email,
  accountFullName,
  accountDisablingDate,
  accountLastLoginDate,
}: {
  email: string;
  accountFullName: string;
  accountDisablingDate: Date;
  accountLastLoginDate: Date | null;
}) =>
  sendEmailUsingTemplate({
    to: { email },
    templateId: 791,
    params: {
      accountFullName,
      accountEmail: email,
      accountDisablingDate: format(accountDisablingDate, "dd/MM/yyyy"),
      accountLastLoginDate: accountLastLoginDate
        ? format(accountLastLoginDate, "dd/MM/yyyy")
        : "inconnue",
    },
  });
