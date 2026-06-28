import { UAParser } from "ua-parser-js";
import crypto from "crypto";
import type { PageEvent } from "@tidemeter/analytics";
import { eventBuffer } from "./buffer";
import { getAnalyticsRepository } from "@/lib/analytics";
import { lookupGeo } from "./geoip";

interface CollectPayload {
  websiteId: string;
  url: string;
  referrer: string;
  title: string;
  screen: string;
  language: string;
  name: string;
  data?: Record<string, string | number | boolean>;
  userId?: string;
  ip: string;
  userAgent: string;
}

// Bot detection patterns
const BOT_PATTERNS =
  /bot|crawler|spider|crawling|headless|phantom|selenium|webdriver/i;

function isBot(userAgent: string): boolean {
  return BOT_PATTERNS.test(userAgent);
}

function getDailySalt(): string {
  const today = new Date().toISOString().split("T")[0];
  const secret = process.env.SESSION_SALT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SALT_SECRET must be set in production");
  }
  return `${secret || "dev-only-insecure-salt"}-${today}`;
}

function hashVisitorId(
  websiteId: string,
  ip: string,
  userAgent: string,
): string {
  const salt = getDailySalt();
  return crypto
    .createHash("sha256")
    .update(`${websiteId}|${ip}|${userAgent}|${salt}`)
    .digest("hex")
    .substring(0, 16);
}

function hashSessionId(visitorId: string, timestamp: Date): string {
  // Session window: round to 30-minute blocks
  const block = Math.floor(timestamp.getTime() / (30 * 60 * 1000));
  return crypto
    .createHash("sha256")
    .update(`${visitorId}|${block}`)
    .digest("hex")
    .substring(0, 16);
}

function parseUrl(url: string): {
  path: string;
  query: string;
  hostname: string;
} {
  try {
    // Handle relative URLs
    if (url.startsWith("/")) {
      return {
        path: url.split("?")[0] || "/",
        query: url.split("?")[1] || "",
        hostname: "",
      };
    }
    const parsed = new URL(url);
    return {
      path: parsed.pathname,
      query: parsed.search.replace("?", ""),
      hostname: parsed.hostname,
    };
  } catch {
    return { path: url, query: "", hostname: "" };
  }
}

function parseReferrer(referrer: string): { domain: string; path: string } {
  if (!referrer) return { domain: "", path: "" };
  try {
    const parsed = new URL(referrer);
    return { domain: parsed.hostname, path: parsed.pathname };
  } catch {
    return { domain: "", path: "" };
  }
}

function extractUtm(url: string): Record<string, string> {
  try {
    const parsed = new URL(
      url.startsWith("/") ? `http://localhost${url}` : url,
    );
    return {
      utmSource: parsed.searchParams.get("utm_source") || "",
      utmMedium: parsed.searchParams.get("utm_medium") || "",
      utmCampaign: parsed.searchParams.get("utm_campaign") || "",
      utmContent: parsed.searchParams.get("utm_content") || "",
      utmTerm: parsed.searchParams.get("utm_term") || "",
    };
  } catch {
    return {
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      utmContent: "",
      utmTerm: "",
    };
  }
}

function parseDeviceType(deviceType: string | undefined): string {
  if (!deviceType) return "desktop";
  const lower = deviceType.toLowerCase();
  if (lower === "mobile") return "mobile";
  if (lower === "tablet") return "tablet";
  return "desktop";
}

export async function processEvent(payload: CollectPayload): Promise<void> {
  // Filter bots
  if (isBot(payload.userAgent)) return;

  // Parse user agent
  const ua = new UAParser(payload.userAgent);
  const browser = ua.getBrowser();
  const os = ua.getOS();
  const device = ua.getDevice();

  // Parse URLs
  const { path: urlPath, query: urlQuery, hostname } = parseUrl(payload.url);
  const { domain: referrerDomain, path: referrerPath } = parseReferrer(
    payload.referrer,
  );
  const utm = extractUtm(payload.url);

  // Generate visitor and session IDs
  const visitorId = hashVisitorId(
    payload.websiteId,
    payload.ip,
    payload.userAgent,
  );
  const now = new Date();
  const sessionId = hashSessionId(visitorId, now);

  // Handle identify events: only link identity, don't store as page event
  if (payload.name === "identify") {
    if (payload.userId) {
      try {
        const repo = await getAnalyticsRepository();
        await repo.linkVisitorIdentity(
          payload.websiteId,
          visitorId,
          payload.userId,
        );
      } catch (error) {
        console.error("[processor] Failed to link visitor identity:", error);
      }
    }
    return;
  }

  const { country, region, city } = await lookupGeo(payload.ip);

  const event: PageEvent = {
    websiteId: payload.websiteId,
    sessionId,
    visitorId,
    timestamp: now,
    eventName: payload.name || "pageview",
    urlPath,
    urlQuery,
    referrerPath,
    referrerDomain,
    utmSource: utm.utmSource ?? "",
    utmMedium: utm.utmMedium ?? "",
    utmCampaign: utm.utmCampaign ?? "",
    utmContent: utm.utmContent ?? "",
    utmTerm: utm.utmTerm ?? "",
    country,
    region,
    city,
    browser: browser.name || "",
    browserVersion: browser.version || "",
    os: os.name || "",
    osVersion: os.version || "",
    deviceType: parseDeviceType(device.type),
    screenSize: payload.screen || "",
    pageTitle: payload.title || "",
    hostname,
    customData: payload.data,
  };

  // Add to buffer for batch insert
  eventBuffer.add(event);

  // If userId is provided, link visitor identity for journey merging
  if (payload.userId) {
    try {
      const repo = await getAnalyticsRepository();
      await repo.linkVisitorIdentity(
        payload.websiteId,
        visitorId,
        payload.userId,
      );
    } catch (error) {
      console.error("[processor] Failed to link visitor identity:", error);
    }
  }
}
