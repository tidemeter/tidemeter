import { afterEach, expect, it, vi } from "vitest";
import { nodemailerAdapter } from "@payloadcms/email-nodemailer";
import { buildEmailAdapter } from "@/lib/email";

vi.mock("@payloadcms/email-nodemailer", () => ({ nodemailerAdapter: vi.fn() }));
vi.mock("@payloadcms/email-resend", () => ({ resendAdapter: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("requires STARTTLS with the public certificate name on an internal SMTP connection", () => {
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("SMTP_HOST", "mailserver.mailserver.svc.cluster.local");
  vi.stubEnv("SMTP_PORT", "587");
  vi.stubEnv("SMTP_SECURE", "false");
  vi.stubEnv("SMTP_TLS_SERVERNAME", "mx.mailcog.com");
  buildEmailAdapter();

  expect(nodemailerAdapter).toHaveBeenCalledWith(expect.objectContaining({
    transportOptions: expect.objectContaining({
      host: "mailserver.mailserver.svc.cluster.local",
      port: 587,
      secure: false,
      requireTLS: true,
      tls: { servername: "mx.mailcog.com" },
    }),
  }));
});

it("keeps Nodemailer's TLS defaults when no certificate name is configured", () => {
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("SMTP_HOST", "smtp.example.com");
  vi.stubEnv("SMTP_TLS_SERVERNAME", undefined);
  buildEmailAdapter();

  const options = vi.mocked(nodemailerAdapter).mock.calls[0][0]?.transportOptions;
  expect(options).not.toHaveProperty("tls");
  expect(options).not.toHaveProperty("requireTLS");
});
