import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { UserSettings } from "@/components/dashboard/user-settings";

export default async function SettingsPage() {
  const payload = await getPayload({ config });
  const hdrs = await headers();
  const { user: payloadUser } = await payload.auth({ headers: hdrs });

  const user = payloadUser
    ? {
        id: String(payloadUser.id),
        email: payloadUser.email,
        displayName: (payloadUser as unknown as { displayName?: string })
          .displayName,
        roles: (payloadUser as unknown as { roles?: string[] }).roles ?? [],
      }
    : null;

  return <UserSettings user={user} />;
}
