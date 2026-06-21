import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { resolveWebsite } from "@/lib/websites";
import { getAnalyticsRepository } from "@/lib/analytics";
import { VisitorList } from "@/components/analytics/visitor-list";

interface Props {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<{
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
    search?: string;
  }>;
}

function getDateRange(sp: { from?: string; to?: string }) {
  const to = sp.to ? new Date(sp.to) : new Date();
  const from = sp.from
    ? new Date(sp.from)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

export default async function VisitorsPage({ params, searchParams }: Props) {
  const { websiteId: websiteParam } = await params;
  const sp = await searchParams;

  const payload = await getPayload({ config });
  const hdrs = await headers();
  const { user } = await payload.auth({ headers: hdrs });
  if (!user) notFound();

  const website = await resolveWebsite(websiteParam);
  if (!website) notFound();
  const websiteId = String(website.id);
  const publicId = String(website.publicId ?? website.id);

  const dateRange = getDateRange(sp);
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(sp.pageSize || "25", 10)),
  );
  const search = sp.search || undefined;

  const repo = await getAnalyticsRepository();
  const visitors = await repo.getVisitors(
    websiteId,
    dateRange,
    page,
    pageSize,
    search,
  );

  return (
    <VisitorList
      websiteId={publicId}
      websiteName={website.name as string}
      initialData={visitors}
      dateRange={{
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      }}
    />
  );
}
