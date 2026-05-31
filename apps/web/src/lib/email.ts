import { nodemailerAdapter } from "@payloadcms/email-nodemailer";
import { resendAdapter } from "@payloadcms/email-resend";

/**
 * Builds the Payload email adapter from environment variables.
 *
 * Selection order:
 *   1. `RESEND_API_KEY` set → Resend (HTTP API, no SMTP)
 *   2. `SMTP_HOST` set      → Nodemailer SMTP (works with any provider:
 *                             SendGrid, Mailgun, Postmark, AWS SES, Postfix, …)
 *   3. neither set          → `undefined`; Payload falls back to its built-in
 *                             console transport. Fine for single-user / private
 *                             deployments where "forgot password" is never used.
 */
export function buildEmailAdapter() {
  const fromAddress = process.env.SMTP_FROM_ADDRESS ?? "no-reply@localhost";
  const fromName = process.env.SMTP_FROM_NAME ?? "TideMeter";

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    return resendAdapter({
      defaultFromAddress: fromAddress,
      defaultFromName: fromName,
      apiKey: resendKey,
    });
  }

  const host = process.env.SMTP_HOST;
  if (!host) return undefined;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  // Default `secure` to true on port 465 (implicit TLS), otherwise false
  // (STARTTLS is negotiated by Nodemailer when the server advertises it).
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true"
      : port === 465;

  return nodemailerAdapter({
    defaultFromAddress: fromAddress,
    defaultFromName: fromName,
    transportOptions: {
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    },
  });
}
