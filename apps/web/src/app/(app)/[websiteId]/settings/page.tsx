import { notFound } from "next/navigation";
import { requireWebsitePageAccess } from "@/lib/websites";
import { WebsiteSettings } from "@/components/dashboard/website-settings";

interface Props {
  params: Promise<{ websiteId: string }>;
}

export default async function WebsiteSettingsPage({ params }: Props) {
  const { websiteId: websiteParam } = await params;

  const access = await requireWebsitePageAccess(websiteParam, "/settings");
  if (!access) notFound();

  return <WebsiteSettings publicId={access.publicId} />;
}
