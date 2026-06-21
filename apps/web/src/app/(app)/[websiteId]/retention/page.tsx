import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { resolveWebsite } from "@/lib/websites";
import { RetentionPage } from "@/components/analytics/retention-page";

interface Props {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<{ from?: string; to?: string; granularity?: string }>;
}

function getDateRange(sp: { from?: string; to?: string }) {
  const to = sp.to ? new Date(sp.to) : new Date();
  const from = sp.from
    ? new Date(sp.from)
    : new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000); // Default 90 days for retention
  return { from, to };
}

export default async function RetentionRoute({ params, searchParams }: Props) {
  const { websiteId: websiteParam } = await params;
  const sp = await searchParams;

  const payload = await getPayload({ config });
  const hdrs = await headers();
  const { user } = await payload.auth({ headers: hdrs });
  if (!user) notFound();

  const website = await resolveWebsite(websiteParam);
  if (!website) notFound();
  const publicId = String(website.publicId ?? website.id);

  const dateRange = getDateRange(sp);

  return (
    <RetentionPage
      websiteId={publicId}
      websiteName={website.name as string}
      dateRange={{
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      }}
    />
  );
}
