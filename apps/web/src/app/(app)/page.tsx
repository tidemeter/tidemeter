import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { WebsiteList } from "@/components/dashboard/website-list";

export default async function HomePage() {
  const payload = await getPayload({ config });
  const hdrs = await headers();
  const { user } = await payload.auth({ headers: hdrs });

  const result = user
    ? await payload.find({
        collection: "websites",
        limit: 100,
        depth: 0,
        user,
      })
    : { docs: [] };

  const websites = result.docs.map((doc) => ({
    id: String(doc.id),
    name: doc.name as string,
    domain: doc.domain as string,
    isActive: (doc.isActive as boolean) ?? true,
  }));

  return <WebsiteList websites={websites} />;
}
