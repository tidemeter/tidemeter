/**
 * Authorization predicate for website access, isolated in a dependency-free
 * module so it can be unit-tested and reused by both API routes and
 * server-rendered pages without pulling in Payload or Next request context.
 */
export function canAccessWebsite(
  user: { id: string | number; roles?: string[] } | null | undefined,
  website: { createdBy: unknown },
): boolean {
  if (!user) return false;
  const roles = user.roles ?? [];
  if (roles.includes("admin")) return true;
  return String(website.createdBy) === String(user.id);
}
