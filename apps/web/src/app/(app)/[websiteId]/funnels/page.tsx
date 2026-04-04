import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { FunnelsPage } from "@/components/analytics/funnels-page";

interface Props {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

function getDateRange(sp: { from?: string; to?: string }) {
  const to = sp.to ? new Date(sp.to) : new Date();
  const from = sp.from
    ? new Date(sp.from)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

export default async function FunnelsRoute({ params, searchParams }: Props) {
  const { websiteId } = await params;
  const sp = await searchParams;

  const payload = await getPayload({ config });
  const hdrs = await headers();
  const { user } = await payload.auth({ headers: hdrs });
  if (!user) notFound();

  const website = await payload
    .findByID({ collection: "websites", id: websiteId, depth: 0 })
    .catch(() => null);
  if (!website) notFound();

  const dateRange = getDateRange(sp);

  return (
    <FunnelsPage
      websiteId={websiteId}
      websiteName={website.name as string}
      dateRange={{
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      }}
    />
  );
}
