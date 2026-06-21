import { notFound } from "next/navigation";
import { requireWebsitePageAccess } from "@/lib/websites";
import { getAnalyticsRepository } from "@/lib/analytics";
import { VisitorProfile } from "@/components/analytics/visitor-profile";

interface Props {
  params: Promise<{ websiteId: string; visitorId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

function getDateRange(sp: { from?: string; to?: string }) {
  const to = sp.to ? new Date(sp.to) : new Date();
  const from = sp.from
    ? new Date(sp.from)
    : new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
  return { from, to };
}

export default async function VisitorProfilePage({
  params,
  searchParams,
}: Props) {
  const { websiteId: websiteParam, visitorId } = await params;
  const sp = await searchParams;

  const access = await requireWebsitePageAccess(
    websiteParam,
    `/visitors/${visitorId}`,
  );
  if (!access) notFound();
  const { website, numericId: websiteId, publicId } = access;

  const dateRange = getDateRange(sp);
  const repo = await getAnalyticsRepository();
  const profile = await repo.getVisitorProfile(websiteId, visitorId, dateRange);

  if (!profile) notFound();

  return (
    <VisitorProfile
      websiteId={publicId}
      websiteName={website.name as string}
      profile={profile}
    />
  );
}
