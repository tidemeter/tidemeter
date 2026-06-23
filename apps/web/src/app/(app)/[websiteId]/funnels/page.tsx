import { notFound } from "next/navigation";
import { requireWebsitePageAccess } from "@/lib/websites";
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
  const { websiteId: websiteParam } = await params;
  const sp = await searchParams;

  const access = await requireWebsitePageAccess(websiteParam, "/funnels");
  if (!access) notFound();
  const { website, publicId } = access;

  const dateRange = getDateRange(sp);

  return (
    <FunnelsPage
      websiteId={publicId}
      websiteName={website.name as string}
      dateRange={{
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      }}
    />
  );
}
