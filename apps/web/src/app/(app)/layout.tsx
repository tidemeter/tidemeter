import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { DashboardShell } from "@/components/dashboard/shell";
import type { AuthUser } from "@/components/dashboard/shell";
import { ThemeScript } from "@/components/theme-script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TideMeter — Web Analytics",
  description: "Simple, privacy-focused web analytics",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const payload = await getPayload({ config });
  const hdrs = await headers();
  const { user: payloadUser } = await payload.auth({ headers: hdrs });

  const user: AuthUser | null = payloadUser
    ? {
        id: String(payloadUser.id),
        email: payloadUser.email,
        displayName: (payloadUser as unknown as { displayName?: string })
          .displayName,
        roles: (payloadUser as unknown as { roles?: string[] }).roles ?? [],
      }
    : null;

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-slate-50 text-gray-900 antialiased dark:bg-gray-900 dark:text-gray-100`}
      >
        <DashboardShell user={user}>{children}</DashboardShell>
      </body>
    </html>
  );
}
