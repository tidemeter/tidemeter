import { WebsiteSettings } from '@/components/dashboard/website-settings';

interface Props {
  params: Promise<{ websiteId: string }>;
}

export default async function WebsiteSettingsPage({ params }: Props) {
  const { websiteId } = await params;

  return <WebsiteSettings websiteId={websiteId} />;
}
