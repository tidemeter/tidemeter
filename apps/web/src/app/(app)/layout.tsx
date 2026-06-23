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

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const isDemoMode = process.env.DEMO_MODE === "true";

  // Fetch websites for the sidebar site selector
  const websitesResult = payloadUser
    ? await payload.find({
        collection: "websites",
        limit: 100,
        depth: 0,
        user: payloadUser,
      })
    : { docs: [] };

  const websites = websitesResult.docs.map((doc) => ({
    id: String(doc.publicId ?? doc.id),
    name: doc.name as string,
    domain: doc.domain as string,
  }));

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-slate-50 text-gray-900 antialiased dark:bg-[#0b0b11] dark:text-gray-100`}
      >
        <DashboardShell user={user} isDemoMode={isDemoMode} websites={websites}>
          {children}
        </DashboardShell>
      </body>
    </html>
  );
}
