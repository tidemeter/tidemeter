import { notFound } from "next/navigation";
import { requireWebsitePageAccess } from "@/lib/websites";
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

  const access = await requireWebsitePageAccess(websiteParam, "/retention");
  if (!access) notFound();
  const { website, publicId } = access;

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
