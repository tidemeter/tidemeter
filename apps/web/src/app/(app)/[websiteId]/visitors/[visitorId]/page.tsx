import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { resolveWebsite } from "@/lib/websites";
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

  const payload = await getPayload({ config });
  const hdrs = await headers();
  const { user } = await payload.auth({ headers: hdrs });
  if (!user) notFound();

  const website = await resolveWebsite(websiteParam);
  if (!website) notFound();
  const websiteId = String(website.id);
  const publicId = String(website.publicId ?? website.id);

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
