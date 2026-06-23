/**
 * Shared, in-process cache of resolved websites for the high-traffic collect
 * endpoint. Kept in its own module so the Websites collection hooks can
 * invalidate it when a website changes (e.g. domain edit or deactivation).
 *
 * NOTE: this cache is per-process. `invalidateWebsiteCache()` only clears the
 * cache of the process that handled the write, so in a multi-replica
 * deployment other replicas can keep serving a stale domain/active flag until
 * their own entry expires (up to `TTL`). If immediate cross-node propagation
 * becomes a requirement, move invalidation to a shared channel (e.g. Redis
 * pub/sub) or lower the TTL.
 */
type Entry = { timestamp: number; id: string; domain: string };

const cache = new Map<string, Entry>();
const TTL = 5 * 60 * 1000;

export function getCachedWebsite(
  key: string,
): { id: string; domain: string } | null {
  const c = cache.get(key);
  if (c && Date.now() - c.timestamp < TTL)
    return { id: c.id, domain: c.domain };
  return null;
}

export function setCachedWebsite(
  key: string,
  value: { id: string; domain: string },
): void {
  cache.set(key, { timestamp: Date.now(), ...value });
}

/** Drop all cached entries. Called from the Websites afterChange/afterDelete hooks. */
export function invalidateWebsiteCache(): void {
  cache.clear();
}
