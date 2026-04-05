import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { getAnalyticsRepository } from "@/lib/analytics";
import { parseDateRange, inferInterval } from "@/lib/utils/date";
import { SharedDashboard } from "@/components/analytics/shared-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ shareId: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function SharePage({ params, searchParams }: PageProps) {
  const { shareId } = await params;
  const sp = await searchParams;
  const period = sp.period || "30d";

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "websites",
    where: { shareId: { equals: shareId }, isActive: { equals: true } },
    limit: 1,
    depth: 0,
  });

  const website = result.docs[0];
  if (!website) notFound();

  const websiteId = String(website.id);
  const dateRange = parseDateRange(new URLSearchParams({ period }));
  const repo = await getAnalyticsRepository();
  const interval = inferInterval(dateRange);

  const [stats, timeSeries, pages, referrers] = await Promise.all([
    repo.getStats({ websiteId, dateRange }),
    repo.getTimeSeries({ websiteId, dateRange }, interval),
    repo.getBreakdown({ websiteId, dateRange }, "url_path", 10),
    repo.getBreakdown({ websiteId, dateRange }, "referrer_domain", 10),
  ]);

  return (
    <SharedDashboard
      shareId={shareId}
      period={period}
      website={{
        name: website.name as string,
        domain: website.domain as string,
      }}
      stats={stats}
      timeSeries={timeSeries}
      pages={pages}
      referrers={referrers}
    />
  );
}
