import { notFound } from "next/navigation";
import { resolveWebsite } from "@/lib/websites";
import { WebsiteSettings } from "@/components/dashboard/website-settings";

interface Props {
  params: Promise<{ websiteId: string }>;
}

export default async function WebsiteSettingsPage({ params }: Props) {
  const { websiteId: websiteParam } = await params;

  const website = await resolveWebsite(websiteParam);
  if (!website) notFound();

  return (
    <WebsiteSettings
      websiteId={String(website.id)}
      publicId={String(website.publicId ?? website.id)}
    />
  );
}
