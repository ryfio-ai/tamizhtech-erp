/**
 * Client-safe certificate URL helper.
 */
export function getCertificateVerificationUrl(verificationId: string): string {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.tamizhtech.in";
  const cleanBase = baseUrl.replace(/\/+$/, "");
  return `${cleanBase}/certificate/verify/${verificationId}`;
}
