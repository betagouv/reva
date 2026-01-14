import { generateJwt } from "@/modules/shared/auth/auth.helper";
import { sendEmailUsingTemplate } from "@/modules/shared/email/sendEmailUsingTemplate";

export const sendRegistrationWithPasswordEmail = async ({
  email,
  certificationId,
}: {
  email: string;
  certificationId?: string;
}) => {
  const baseUrl = process.env.BASE_URL || "http://localhost";
  const token = generateJwt(
    { email, action: "finalize-registration", certificationId },
    4 * 60 * 60,
  ); // 4 hours
  const path = `/candidat/reset-password?setPasswordToken=${token}`;
  const url = new URL(path, baseUrl);

  return sendEmailUsingTemplate({
    to: { email },
    templateId: 506,
    params: {
      candidateRegistrationUrl: url.toString(),
    },
  });
};
