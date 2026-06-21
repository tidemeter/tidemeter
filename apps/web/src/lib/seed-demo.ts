/**
 * Server-side demo data seeder.
 *
 * Called from payload onInit when DEMO_MODE=true.
 * Uses Payload Local API (no HTTP needed) to create the demo user,
 * website, and funnels, then inserts analytics data directly via SQL.
 */
import { createHash } from "node:crypto";
import type { Payload } from "payload";
import { hasAnalyticsData, seedAnalyticsData } from "@tidemeter/analytics";
import { generatePublicId } from "@/payload/collections/websites";

const DEMO_EMAIL = "demo@demo.com";
const DEMO_PASSWORD = "demodemo";
const DEMO_DOMAIN = "demo.example.com";
const EVENT_COUNT = 1500;
const DAYS_BACK = 90;

// ---------------------------------------------------------------------------
// Fake data pools (same as scripts/seed-demo.mjs)
// ---------------------------------------------------------------------------

const PAGES = [
  { path: "/", title: "Home — Acme Inc" },
  { path: "/about", title: "About Us — Acme Inc" },
  { path: "/pricing", title: "Pricing — Acme Inc" },
  { path: "/blog", title: "Blog — Acme Inc" },
  { path: "/blog/getting-started", title: "Getting Started Guide — Acme Blog" },
  { path: "/blog/best-practices", title: "Best Practices — Acme Blog" },
  { path: "/blog/release-notes", title: "What's New in v2.0 — Acme Blog" },
  { path: "/docs", title: "Documentation — Acme Inc" },
  { path: "/docs/api", title: "API Reference — Acme Docs" },
  { path: "/contact", title: "Contact Us — Acme Inc" },
  { path: "/signup", title: "Sign Up — Acme Inc" },
  { path: "/login", title: "Login — Acme Inc" },
  { path: "/features", title: "Features — Acme Inc" },
];

const REFERRERS = [
  "",
  "",
  "",
  "",
  "",
  "https://www.google.com/search?q=acme+inc",
  "https://www.google.com/search?q=acme+pricing",
  "https://www.google.com/",
  "https://twitter.com/acme",
  "https://t.co/abc123",
  "https://github.com/acme/project",
  "https://news.ycombinator.com/",
  "https://www.reddit.com/r/programming/",
  "https://dev.to/acme/intro",
  "https://www.linkedin.com/company/acme",
  "https://duckduckgo.com/?q=acme",
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPad; CPU OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

const SCREENS = [
  "1920x1080",
  "1920x1080",
  "1920x1080",
  "2560x1440",
  "2560x1440",
  "1440x900",
  "1366x768",
  "1366x768",
  "3840x2160",
  "390x844",
  "412x915",
  "393x873",
  "820x1180",
  "1024x768",
];

const UTM_CAMPAIGNS: (null | {
  source: string;
  medium: string;
  campaign: string;
})[] = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  { source: "twitter", medium: "social", campaign: "launch" },
  { source: "google", medium: "cpc", campaign: "brand" },
  { source: "newsletter", medium: "email", campaign: "weekly-digest" },
  { source: "producthunt", medium: "referral", campaign: "launch-day" },
];

const GEO_LOCATIONS = [
  { country: "US", region: "California", city: "San Francisco" },
  { country: "US", region: "California", city: "Los Angeles" },
  { country: "US", region: "New York", city: "New York" },
  { country: "US", region: "Texas", city: "Austin" },
  { country: "US", region: "Washington", city: "Seattle" },
  { country: "GB", region: "England", city: "London" },
  { country: "DE", region: "Berlin", city: "Berlin" },
  { country: "DE", region: "Bavaria", city: "Munich" },
  { country: "FR", region: "Île-de-France", city: "Paris" },
  { country: "NL", region: "North Holland", city: "Amsterdam" },
  { country: "JP", region: "Tokyo", city: "Tokyo" },
  { country: "BR", region: "São Paulo", city: "São Paulo" },
  { country: "CA", region: "Ontario", city: "Toronto" },
  { country: "AU", region: "New South Wales", city: "Sydney" },
  { country: "IN", region: "Karnataka", city: "Bangalore" },
];

const IDENTIFIED_USERS = [
  { userId: "user-alice-001" },
  { userId: "user-bob-002" },
  { userId: "user-carol-003" },
  { userId: "user-dave-004" },
  { userId: "user-eve-005" },
  { userId: "user-frank-006" },
  { userId: "user-grace-007" },
  { userId: "user-henry-008" },
];

const JOURNEY_TEMPLATES = [
  {
    weight: 30,
    steps: [
      { path: "/", title: "Home — Acme Inc" },
      { path: "/pricing", title: "Pricing — Acme Inc" },
      { path: "/signup", title: "Sign Up — Acme Inc" },
      { path: "/signup", title: "Sign Up — Acme Inc", eventName: "signup" },
    ],
    dropoffRates: [0.0, 0.35, 0.4, 0.3],
  },
  {
    weight: 20,
    steps: [
      { path: "/", title: "Home — Acme Inc" },
      { path: "/blog", title: "Blog — Acme Inc" },
      { path: "/features", title: "Features — Acme Inc" },
      { path: "/pricing", title: "Pricing — Acme Inc" },
      { path: "/signup", title: "Sign Up — Acme Inc" },
    ],
    dropoffRates: [0.0, 0.3, 0.35, 0.4, 0.35],
  },
  {
    weight: 15,
    steps: [
      { path: "/", title: "Home — Acme Inc" },
      { path: "/docs", title: "Documentation — Acme Inc" },
      { path: "/docs/api", title: "API Reference — Acme Docs" },
      { path: "/contact", title: "Contact Us — Acme Inc" },
    ],
    dropoffRates: [0.0, 0.25, 0.45, 0.3],
  },
  {
    weight: 15,
    steps: [
      { path: "/", title: "Home — Acme Inc" },
      { path: "/features", title: "Features — Acme Inc" },
      { path: "/pricing", title: "Pricing — Acme Inc" },
      {
        path: "/pricing",
        title: "Pricing — Acme Inc",
        eventName: "add_to_cart",
      },
      { path: "/pricing", title: "Pricing — Acme Inc", eventName: "checkout" },
    ],
    dropoffRates: [0.0, 0.3, 0.35, 0.45, 0.4],
  },
  { weight: 20, steps: null, dropoffRates: null },
];

const DEMO_FUNNELS = [
  {
    name: "Signup Flow",
    steps: [
      {
        name: "Homepage",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "/",
      },
      {
        name: "Pricing Page",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "/pricing",
      },
      {
        name: "Signup Page",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "/signup",
      },
      {
        name: "Signed Up",
        matchType: "event_name",
        matchOperator: "equals",
        matchValue: "signup",
      },
    ],
  },
  {
    name: "Blog → Signup",
    steps: [
      {
        name: "Homepage",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "/",
      },
      {
        name: "Blog",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "/blog",
      },
      {
        name: "Features",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "/features",
      },
      {
        name: "Pricing",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "/pricing",
      },
      {
        name: "Signup",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "/signup",
      },
    ],
  },
  {
    name: "Purchase Flow",
    steps: [
      {
        name: "Homepage",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "/",
      },
      {
        name: "Features",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "/features",
      },
      {
        name: "Pricing",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "/pricing",
      },
      {
        name: "Add to Cart",
        matchType: "event_name",
        matchOperator: "equals",
        matchValue: "add_to_cart",
      },
      {
        name: "Checkout",
        matchType: "event_name",
        matchOperator: "equals",
        matchValue: "checkout",
      },
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTimestamp(daysBack: number): Date {
  const now = Date.now();
  const past = now - daysBack * 24 * 60 * 60 * 1000;
  const weighted = past + Math.pow(Math.random(), 0.7) * (now - past);
  return new Date(weighted);
}

function hashId(...parts: string[]): string {
  return createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .substring(0, 16);
}

function parseReferrerDomain(ref: string): string {
  if (!ref) return "";
  try {
    return new URL(ref).hostname;
  } catch {
    return "";
  }
}

function parseUA(ua: string) {
  let browser = "Chrome",
    browserVersion = "131",
    os = "Windows",
    osVersion = "10",
    deviceType = "desktop";
  if (ua.includes("Firefox/")) {
    browser = "Firefox";
    browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] ?? "133";
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
    browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] ?? "131";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    browser = "Safari";
    browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] ?? "18";
  } else if (ua.includes("Chrome/")) {
    browser = "Chrome";
    browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] ?? "131";
  }
  if (ua.includes("Windows")) {
    os = "Windows";
    osVersion = "10";
  } else if (ua.includes("Macintosh")) {
    os = "Mac OS";
    osVersion = "10.15";
  } else if (ua.includes("Linux") && !ua.includes("Android")) {
    os = "Linux";
    osVersion = "";
  } else if (ua.includes("Android")) {
    os = "Android";
    osVersion = ua.match(/Android ([\d.]+)/)?.[1] ?? "14";
  } else if (ua.includes("iPhone")) {
    os = "iOS";
    osVersion = ua.match(/iPhone OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") ?? "18";
  } else if (ua.includes("iPad")) {
    os = "iOS";
    osVersion = ua.match(/CPU OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") ?? "18";
  }
  if (ua.includes("Mobile")) deviceType = "mobile";
  else if (ua.includes("iPad")) deviceType = "tablet";
  return { browser, browserVersion, os, osVersion, deviceType };
}

function pickJourney() {
  const totalWeight = JOURNEY_TEMPLATES.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * totalWeight;
  for (const t of JOURNEY_TEMPLATES) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return JOURNEY_TEMPLATES[JOURNEY_TEMPLATES.length - 1];
}

function randomIp(): string {
  return `${100 + Math.floor(Math.random() * 55)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 254)}`;
}

// ---------------------------------------------------------------------------
// Main entry point — called from Payload onInit
// ---------------------------------------------------------------------------

export async function seedDemoData(payload: Payload): Promise<void> {
  const dbUrl =
    process.env.ANALYTICS_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!dbUrl) {
    console.error("[seed-demo] No DATABASE_URL set, skipping demo seed");
    return;
  }

  console.log("[seed-demo] Starting demo data seed...");

  // --- Step 1: Create or find demo user via Payload Local API ---
  let demoUserId: number | string;
  const existingUsers = await payload.find({
    collection: "users",
    where: { email: { equals: DEMO_EMAIL } },
    limit: 1,
    overrideAccess: true,
  });

  if (existingUsers.docs.length > 0) {
    demoUserId = existingUsers.docs[0].id;
    console.log("[seed-demo] Demo user already exists");
  } else {
    const created = await payload.create({
      collection: "users",
      data: {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        displayName: "Demo User",
        roles: ["user"],
      },
      overrideAccess: true,
    });
    demoUserId = created.id;
    console.log("[seed-demo] Created demo user (demo@demo.com / demodemo)");
  }

  // --- Step 2: Create or find demo website ---
  let websiteId: number | string;
  const existingWebsites = await payload.find({
    collection: "websites",
    where: { domain: { equals: DEMO_DOMAIN } },
    limit: 1,
    overrideAccess: true,
  });

  if (existingWebsites.docs.length > 0) {
    websiteId = existingWebsites.docs[0].id;
    console.log(
      `[seed-demo] Demo website already exists: ${websiteId} (id: ${existingWebsites.docs[0].publicId ?? websiteId})`,
    );
  } else {
    const created = await payload.create({
      collection: "websites",
      data: {
        name: "Demo Website",
        domain: DEMO_DOMAIN,
        timezone: "America/New_York",
        isActive: true,
        createdBy: demoUserId,
        publicId: generatePublicId(),
      },
      overrideAccess: true,
    });
    websiteId = created.id;
    console.log(
      `[seed-demo] Created demo website: ${websiteId} (id: ${created.publicId ?? websiteId})`,
    );
  }

  // --- Step 3: Insert analytics data directly via SQL ---
  const existing = await hasAnalyticsData(dbUrl, String(websiteId));
  if (existing) {
    console.log(`[seed-demo] Analytics data already exists, skipping`);
    await seedFunnels(payload, websiteId, demoUserId);
    return;
  }

  console.log(
    `[seed-demo] Generating ${EVENT_COUNT} events over ${DAYS_BACK} days...`,
  );

  // Build events
  const events: Record<string, unknown>[] = [];
  const identityLinks: Record<string, unknown>[] = [];
  const visitorCount = Math.floor(EVENT_COUNT / 3);
  const identifiedCount = Math.min(
    IDENTIFIED_USERS.length,
    Math.floor(visitorCount * 0.3),
  );
  const returningFraction = 0.35;

  for (let i = 0; i < visitorCount; i++) {
    const ua = pick(USER_AGENTS);
    const ip = randomIp();
    const screen = pick(SCREENS);
    const geo = pick(GEO_LOCATIONS);
    const { browser, browserVersion, os, osVersion, deviceType } = parseUA(ua);
    const visitorId = hashId(String(websiteId), ip, ua, "seed-salt");

    const isIdentified = i < identifiedCount;
    const isReturning = isIdentified || Math.random() < returningFraction;

    let sessionCount: number;
    if (isIdentified) sessionCount = 3 + Math.floor(Math.random() * 6);
    else if (isReturning) sessionCount = 2 + Math.floor(Math.random() * 5);
    else sessionCount = 1;

    if (isIdentified) {
      const identifiedUser = IDENTIFIED_USERS[i % IDENTIFIED_USERS.length];
      identityLinks.push({
        website_id: String(websiteId),
        visitor_id: visitorId,
        user_id: identifiedUser.userId,
        linked_at: randomTimestamp(DAYS_BACK),
      });
    }

    for (let s = 0; s < sessionCount; s++) {
      let sessionStart: Date;
      if (isReturning && s > 0) {
        const firstVisitDaysAgo =
          DAYS_BACK - Math.floor(Math.random() * (DAYS_BACK - 14));
        const now = Date.now();
        const firstVisitTime = now - firstVisitDaysAgo * 24 * 60 * 60 * 1000;
        const returnIntervals = [1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60];
        const dayOffset =
          returnIntervals[Math.min(s - 1, returnIntervals.length - 1)] +
          Math.floor(Math.random() * 3);
        sessionStart = new Date(
          firstVisitTime + dayOffset * 24 * 60 * 60 * 1000,
        );
        if (sessionStart.getTime() > now) {
          sessionStart = new Date(now - Math.random() * 24 * 60 * 60 * 1000);
        }
      } else {
        sessionStart = randomTimestamp(DAYS_BACK);
      }

      const sessionBlock = Math.floor(
        sessionStart.getTime() / (30 * 60 * 1000),
      );
      const sessionId = hashId(visitorId, String(sessionBlock), String(s));
      const referrer = pick(REFERRERS);
      const sessionGeo =
        isIdentified && Math.random() < 0.3 ? pick(GEO_LOCATIONS) : geo;
      const journey = pickJourney();
      let utmSource = "",
        utmMedium = "",
        utmCampaign = "";
      const utm = pick(UTM_CAMPAIGNS);
      if (utm) {
        utmSource = utm.source;
        utmMedium = utm.medium;
        utmCampaign = utm.campaign;
      }

      if (journey.steps) {
        for (
          let p = 0;
          p < journey.steps.length && events.length < EVENT_COUNT;
          p++
        ) {
          const step = journey.steps[p];
          const ts = new Date(
            sessionStart.getTime() + p * (15000 + Math.random() * 90000),
          );
          events.push({
            website_id: String(websiteId),
            session_id: sessionId,
            visitor_id: visitorId,
            timestamp: ts,
            event_name: step.eventName || "pageview",
            url_path: step.path,
            url_query: "",
            referrer_path: "",
            referrer_domain: p === 0 ? parseReferrerDomain(referrer) : "",
            utm_source: p === 0 ? utmSource : "",
            utm_medium: p === 0 ? utmMedium : "",
            utm_campaign: p === 0 ? utmCampaign : "",
            utm_content: "",
            utm_term: "",
            country: sessionGeo.country,
            region: sessionGeo.region,
            city: sessionGeo.city,
            browser,
            browser_version: browserVersion,
            os,
            os_version: osVersion,
            device_type: deviceType,
            screen_size: screen,
            page_title: step.title,
            hostname: DEMO_DOMAIN,
          });
          if (
            journey.dropoffRates[p] > 0 &&
            Math.random() < journey.dropoffRates[p]
          )
            break;
        }
      } else {
        const pageCount = isIdentified
          ? 2 + Math.floor(Math.random() * 6)
          : Math.random() < 0.4
            ? 1
            : 1 + Math.floor(Math.random() * 5);
        for (let p = 0; p < pageCount && events.length < EVENT_COUNT; p++) {
          const page = p === 0 ? pick(PAGES.slice(0, 5)) : pick(PAGES);
          const ts = new Date(
            sessionStart.getTime() + p * (10000 + Math.random() * 120000),
          );
          events.push({
            website_id: String(websiteId),
            session_id: sessionId,
            visitor_id: visitorId,
            timestamp: ts,
            event_name:
              isIdentified && p > 0 && Math.random() < 0.2
                ? pick(["signup", "download", "add_to_cart", "checkout"])
                : "pageview",
            url_path: page.path,
            url_query: "",
            referrer_path: "",
            referrer_domain: p === 0 ? parseReferrerDomain(referrer) : "",
            utm_source: p === 0 ? utmSource : "",
            utm_medium: p === 0 ? utmMedium : "",
            utm_campaign: p === 0 ? utmCampaign : "",
            utm_content: "",
            utm_term: "",
            country: sessionGeo.country,
            region: sessionGeo.region,
            city: sessionGeo.city,
            browser,
            browser_version: browserVersion,
            os,
            os_version: osVersion,
            device_type: deviceType,
            screen_size: screen,
            page_title: page.title,
            hostname: DEMO_DOMAIN,
          });
        }
      }
    }
  }

  // Build session records
  const sessionMap = new Map<string, Record<string, unknown>[]>();
  for (const evt of events) {
    const sid = evt.session_id as string;
    if (!sessionMap.has(sid)) sessionMap.set(sid, []);
    sessionMap.get(sid)!.push(evt);
  }

  const sessionRecords: Record<string, unknown>[] = [];
  for (const [sessionId, sessionEvents] of sessionMap) {
    sessionEvents.sort(
      (a, b) =>
        (a.timestamp as Date).getTime() - (b.timestamp as Date).getTime(),
    );
    const first = sessionEvents[0];
    const last = sessionEvents[sessionEvents.length - 1];
    const durationMs =
      (last.timestamp as Date).getTime() - (first.timestamp as Date).getTime();
    const pageviews = sessionEvents.filter(
      (e) => e.event_name === "pageview",
    ).length;
    const customEvents = sessionEvents.filter(
      (e) => e.event_name !== "pageview",
    ).length;

    sessionRecords.push({
      id: sessionId,
      website_id: first.website_id,
      visitor_id: first.visitor_id,
      started_at: first.timestamp,
      ended_at: last.timestamp,
      duration: Math.floor(durationMs / 1000),
      entry_page: first.url_path,
      exit_page: last.url_path,
      pageviews,
      events: customEvents,
      is_bounce: sessionEvents.length === 1,
      referrer_domain: first.referrer_domain,
      referrer_path: first.referrer_path || "",
      utm_source: first.utm_source,
      utm_medium: first.utm_medium,
      utm_campaign: first.utm_campaign,
      country: first.country,
      region: first.region,
      city: first.city,
      browser: first.browser,
      os: first.os,
      device_type: first.device_type,
      screen_size: first.screen_size,
    });
  }

  // Insert via analytics package helper
  const result = await seedAnalyticsData(dbUrl, {
    websiteId: String(websiteId),
    events,
    sessions: sessionRecords,
    identityLinks,
  });

  console.log(
    `[seed-demo] Inserted ${result.events} events, ${result.sessions} sessions, ${result.identityLinks} identity links`,
  );

  // --- Step 4: Create demo funnels ---
  await seedFunnels(payload, websiteId, demoUserId);

  console.log("[seed-demo] Demo data seed complete");
}

async function seedFunnels(
  payload: Payload,
  websiteId: number | string,
  demoUserId: number | string,
): Promise<void> {
  const existingFunnels = await payload.find({
    collection: "funnels",
    where: { website: { equals: websiteId } },
    limit: 50,
    overrideAccess: true,
  });

  if (existingFunnels.docs.length > 0) {
    console.log(
      `[seed-demo] Funnels already exist (${existingFunnels.docs.length}), skipping`,
    );
    return;
  }

  let count = 0;
  for (const funnel of DEMO_FUNNELS) {
    try {
      await payload.create({
        collection: "funnels",
        data: {
          name: funnel.name,
          website: websiteId as number,
          steps: [...funnel.steps],
          createdBy: demoUserId as number,
        },
        overrideAccess: true,
      });
      count++;
    } catch (err) {
      console.error(
        `[seed-demo] Failed to create funnel "${funnel.name}":`,
        err,
      );
    }
  }
  console.log(`[seed-demo] Created ${count} demo funnels`);
}
