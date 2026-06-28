import { Reader, type ReaderModel } from "@maxmind/geoip2-node";

let readerPromise: Promise<ReaderModel | null> | undefined;

export interface GeoResult {
  country: string;
  region: string;
  city: string;
}

const EMPTY_GEO: GeoResult = {
  country: "",
  region: "",
  city: "",
};

/**
 * Normalizes common proxy formats:
 * - "::ffff:203.0.113.10" -> "203.0.113.10"
 * - "203.0.113.10:1234" -> "203.0.113.10"
 * - "[2001:db8::1]:1234" -> "2001:db8::1"
 */
function normalizeIp(value: string): string {
  const ip = value.trim();

  if (!ip) {
    return "";
  }

  // IPv6 in brackets, optionally with port: [2001:db8::1]:443
  const bracketedIpv6 = ip.match(/^\[([^\]]+)](?::\d+)?$/);
  if (bracketedIpv6) {
    return bracketedIpv6[1];
  }

  // IPv4 with port: 203.0.113.10:443
  const ipv4WithPort = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort) {
    return ipv4WithPort[1];
  }

  // IPv4-mapped IPv6: ::ffff:203.0.113.10
  if (ip.toLowerCase().startsWith("::ffff:")) {
    return ip.slice("::ffff:".length);
  }

  return ip;
}

/**
 * Returns true for IP ranges that should not be geolocated.
 *
 * This is intentionally not a full IP-address validation library.
 * Invalid public-looking addresses are safely handled by lookupGeo().
 */
function isPrivateOrLocalIp(value: string): boolean {
  const ip = normalizeIp(value).toLowerCase();

  if (
    !ip ||
    ip === "0.0.0.0" ||
    ip === "::" ||
    ip === "::1" ||
    ip === "127.0.0.1"
  ) {
    return true;
  }

  const ipv4Parts = ip.split(".").map(Number);

  if (
    ipv4Parts.length === 4 &&
    ipv4Parts.every(
      (part) => Number.isInteger(part) && part >= 0 && part <= 255,
    )
  ) {
    const [a, b] = ipv4Parts;

    return (
      a === 10 || // 10.0.0.0/8
      a === 127 || // 127.0.0.0/8
      (a === 169 && b === 254) || // 169.254.0.0/16
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 100 && b >= 64 && b <= 127) // 100.64.0.0/10
    );
  }

  // IPv6 unique-local and link-local ranges.
  return ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:");
}

/**
 * Lazily opens the MaxMind MMDB database.
 *
 * Returns null when GEOIP_DB_PATH is not configured or the database
 * cannot be opened. A failed attempt may be retried later.
 */
async function getReader(): Promise<ReaderModel | null> {
  if (readerPromise) {
    return readerPromise;
  }

  const dbPath = process.env.GEOIP_DB_PATH;

  if (!dbPath) {
    return null;
  }

  readerPromise = Reader.open(dbPath).catch((error: unknown) => {
    // Allow a later request to retry after a transient failure.
    readerPromise = undefined;

    console.warn(
      `[geoip] No GeoIP database found at "${dbPath}". Location data will be empty.`,
      error,
    );

    return null;
  });

  return readerPromise;
}

/**
 * Looks up country, region, and city for an IPv4 or IPv6 address.
 *
 * Returns empty strings when:
 * - the IP is private, loopback, link-local, or unavailable;
 * - GEOIP_DB_PATH is not configured;
 * - the MMDB file cannot be opened;
 * - the address is invalid or has no record in the database.
 */
export async function lookupGeo(ip: string): Promise<GeoResult> {
  const normalizedIp = normalizeIp(ip);

  if (isPrivateOrLocalIp(normalizedIp)) {
    return EMPTY_GEO;
  }

  const reader = await getReader();

  if (!reader) {
    return EMPTY_GEO;
  }

  try {
    const result = reader.city(normalizedIp);

    return {
      country: result.country?.isoCode ?? "",
      region: result.subdivisions?.[0]?.names?.en ?? "",
      city: result.city?.names?.en ?? "",
    };
  } catch {
    return EMPTY_GEO;
  }
}
