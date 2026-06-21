#!/usr/bin/env node
/**
 * TideMeter Demo Seed Script
 *
 * Logs in as admin, creates a demo user (demo@demo.com), then uses
 * that demo user to create a website and inserts simulated pageview
 * events directly into PostgreSQL with realistic historical timestamps.
 *
 * Usage:
 *   node scripts/seed-demo.mjs                     # defaults: localhost:3700
 *   node scripts/seed-demo.mjs --events 500        # send 500 events (default: 200)
 *   node scripts/seed-demo.mjs --days 30           # spread events over 30 days (default: 30)
 *   node scripts/seed-demo.mjs --base-url http://localhost:3700
 *   node scripts/seed-demo.mjs --admin-email admin@admin.com --admin-password adminadmin
 *   node scripts/seed-demo.mjs --db-url postgresql://tidemeter:tidemeter@localhost:5480/tidemeter
 */

import { createHash, randomUUID } from "node:crypto";

const BASE_URL = getArg("--base-url") || "http://localhost:3700";
const ADMIN_EMAIL = getArg("--admin-email") || "admin@admin.com";
const ADMIN_PASSWORD = getArg("--admin-password") || "adminadmin";
const DB_URL =
  getArg("--db-url") ||
  process.env.DATABASE_URL ||
  "postgresql://tidemeter:tidemeter@localhost:5480/tidemeter";
const DEMO_EMAIL = "demo@demo.com";
const DEMO_PASSWORD = "demodemo";
const EVENT_COUNT = parseInt(getArg("--events") || "1500", 10);
const DAYS_BACK = parseInt(getArg("--days") || "90", 10);

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
}

// --- Realistic fake data pools ---

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
  "", // 40% direct
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
  // Desktop Chrome (Windows)
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  // Desktop Chrome (Mac)
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  // Desktop Firefox (Windows)
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  // Desktop Firefox (Mac)
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
  // Desktop Safari (Mac)
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  // Desktop Edge
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  // Mobile Chrome (Android)
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  // Mobile Safari (iPhone)
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1",
  // Tablet (iPad)
  "Mozilla/5.0 (iPad; CPU OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1",
  // Desktop Linux Chrome
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

const SCREENS = [
  "1920x1080",
  "1920x1080",
  "1920x1080", // common desktop
  "2560x1440",
  "2560x1440",
  "1440x900",
  "1366x768",
  "1366x768",
  "3840x2160",
  "390x844", // iPhone 14
  "412x915", // Pixel 7
  "393x873", // Pixel 8
  "820x1180", // iPad Air
  "1024x768", // iPad
];

const LANGUAGES = [
  "en-US",
  "en-US",
  "en-US",
  "en-US", // weighted
  "en-GB",
  "en-GB",
  "de-DE",
  "fr-FR",
  "es-ES",
  "ja-JP",
  "pt-BR",
  "nl-NL",
];

const UTM_CAMPAIGNS = [
  null,
  null,
  null,
  null,
  null,
  null,
  null, // mostly no utm
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

// Identified users — visitors who "log in" and get a userId linked
const IDENTIFIED_USERS = [
  { userId: "user-alice-001", name: "Alice Johnson" },
  { userId: "user-bob-002", name: "Bob Chen" },
  { userId: "user-carol-003", name: "Carol Williams" },
  { userId: "user-dave-004", name: "Dave Kim" },
  { userId: "user-eve-005", name: "Eve Martinez" },
  { userId: "user-frank-006", name: "Frank Müller" },
  { userId: "user-grace-007", name: "Grace Tanaka" },
  { userId: "user-henry-008", name: "Henry Dubois" },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomIp() {
  // Generate plausible-looking (non-real) IPs in private-ish ranges
  return `${100 + Math.floor(Math.random() * 55)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 254)}`;
}

function randomTimestamp(daysBack) {
  const now = Date.now();
  const past = now - daysBack * 24 * 60 * 60 * 1000;
  // Weight towards more recent days
  const weighted = past + Math.pow(Math.random(), 0.7) * (now - past);
  return new Date(weighted);
}

// Simple UA -> browser/os/device parser (avoids needing ua-parser-js in script)
function parseUA(ua) {
  let browser = "Chrome",
    browserVersion = "131",
    os = "Windows",
    osVersion = "10",
    deviceType = "desktop";

  if (ua.includes("Firefox/")) {
    browser = "Firefox";
    browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || "133";
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
    browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || "131";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    browser = "Safari";
    browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || "18";
  } else if (ua.includes("Chrome/")) {
    browser = "Chrome";
    browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || "131";
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
    osVersion = ua.match(/Android ([\d.]+)/)?.[1] || "14";
  } else if (ua.includes("iPhone")) {
    os = "iOS";
    osVersion = ua.match(/iPhone OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "18";
  } else if (ua.includes("iPad")) {
    os = "iOS";
    osVersion = ua.match(/CPU OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "18";
  }

  if (ua.includes("Mobile")) deviceType = "mobile";
  else if (ua.includes("iPad")) deviceType = "tablet";
  else deviceType = "desktop";

  return { browser, browserVersion, os, osVersion, deviceType };
}

function hashId(...parts) {
  return createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .substring(0, 16);
}

function parseReferrerDomain(ref) {
  if (!ref) return "";
  try {
    return new URL(ref).hostname;
  } catch {
    return "";
  }
}

// --- Main ---

async function main() {
  console.log(`\n🌊 TideMeter Demo Seed`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Events:   ${EVENT_COUNT} spread over ${DAYS_BACK} days\n`);

  // Step 1: Login as admin
  console.log("→ Logging in as admin...");
  const adminLoginRes = await fetch(`${BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!adminLoginRes.ok) {
    console.error(
      `✗ Admin login failed (${adminLoginRes.status}). Make sure admin user exists.`,
    );
    console.error("  Create one at /admin (first-user setup)");
    process.exit(1);
  }
  const { token: adminToken } = await adminLoginRes.json();
  console.log("  ✓ Logged in as admin");

  // Step 2: Create demo user if it doesn't exist
  console.log("→ Setting up demo user...");
  let demoToken;
  const demoLoginRes = await fetch(`${BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  if (demoLoginRes.ok) {
    const demoLogin = await demoLoginRes.json();
    demoToken = demoLogin.token;
    console.log("  ✓ Demo user already exists");
  } else {
    // Create demo user via admin
    const createUserRes = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `JWT ${adminToken}`,
      },
      body: JSON.stringify({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        displayName: "Demo User",
        roles: ["user"],
      }),
    });
    if (!createUserRes.ok) {
      const err = await createUserRes.text();
      console.error(
        `✗ Failed to create demo user (${createUserRes.status}): ${err}`,
      );
      process.exit(1);
    }
    console.log("  ✓ Created demo user (demo@demo.com / demodemo)");
    // Login as demo user
    const loginRes2 = await fetch(`${BASE_URL}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    });
    const login2 = await loginRes2.json();
    demoToken = login2.token;
  }

  // Step 3: Create or find demo website (as demo user)
  console.log("→ Setting up demo website...");
  const DEMO_DOMAIN = "demo.example.com";

  const existingRes = await fetch(
    `${BASE_URL}/api/websites?where[domain][equals]=${DEMO_DOMAIN}&limit=1`,
    {
      headers: { Authorization: `JWT ${demoToken}` },
    },
  );
  const existing = await existingRes.json();

  let websiteId;
  let publicId;
  if (existing.docs && existing.docs.length > 0) {
    websiteId = existing.docs[0].id;
    publicId = existing.docs[0].publicId ?? existing.docs[0].id;
    console.log(
      `  ✓ Found existing demo website: ${websiteId} (id: ${publicId})`,
    );
  } else {
    const createRes = await fetch(`${BASE_URL}/api/websites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `JWT ${demoToken}`,
      },
      body: JSON.stringify({
        name: "Demo Website",
        domain: DEMO_DOMAIN,
        timezone: "America/New_York",
        isActive: true,
      }),
    });
    if (!createRes.ok) {
      const err = await createRes.text();
      console.error(`✗ Failed to create website (${createRes.status}): ${err}`);
      process.exit(1);
    }
    const created = await createRes.json();
    websiteId = created.doc.id;
    publicId = created.doc.publicId ?? created.doc.id;
    console.log(`  ✓ Created demo website: ${websiteId} (id: ${publicId})`);
  }

  // Step 4: Generate events and insert directly into PostgreSQL
  console.log(`→ Generating ${EVENT_COUNT} events over ${DAYS_BACK} days...`);

  // Dynamic import of postgres
  let pg;
  try {
    pg = (await import("postgres")).default;
  } catch {
    // Not at root — try from analytics package
    const { createRequire } = await import("node:module");
    const require = createRequire(
      new URL("../packages/analytics/package.json", import.meta.url),
    );
    pg = require("postgres");
  }
  const sql = pg(DB_URL, { onnotice: () => {} });

  // Ensure analytics schema and table exist
  await sql`CREATE SCHEMA IF NOT EXISTS analytics`;
  await sql`
    CREATE TABLE IF NOT EXISTS analytics.page_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      website_id VARCHAR(64) NOT NULL,
      session_id VARCHAR(64) NOT NULL,
      visitor_id VARCHAR(64) NOT NULL,
      "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      event_name VARCHAR(255) NOT NULL DEFAULT 'pageview',
      url_path VARCHAR(2048) NOT NULL DEFAULT '/',
      url_query VARCHAR(2048) NOT NULL DEFAULT '',
      referrer_path VARCHAR(2048) NOT NULL DEFAULT '',
      referrer_domain VARCHAR(512) NOT NULL DEFAULT '',
      utm_source VARCHAR(255) NOT NULL DEFAULT '',
      utm_medium VARCHAR(255) NOT NULL DEFAULT '',
      utm_campaign VARCHAR(255) NOT NULL DEFAULT '',
      utm_content VARCHAR(255) NOT NULL DEFAULT '',
      utm_term VARCHAR(255) NOT NULL DEFAULT '',
      country VARCHAR(2) NOT NULL DEFAULT '',
      region VARCHAR(128) NOT NULL DEFAULT '',
      city VARCHAR(255) NOT NULL DEFAULT '',
      browser VARCHAR(64) NOT NULL DEFAULT '',
      browser_version VARCHAR(32) NOT NULL DEFAULT '',
      os VARCHAR(64) NOT NULL DEFAULT '',
      os_version VARCHAR(32) NOT NULL DEFAULT '',
      device_type VARCHAR(16) NOT NULL DEFAULT 'desktop',
      screen_size VARCHAR(16) NOT NULL DEFAULT '',
      page_title VARCHAR(512) NOT NULL DEFAULT '',
      hostname VARCHAR(512) NOT NULL DEFAULT '',
      custom_data JSONB
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS analytics.sessions (
      id VARCHAR(64) PRIMARY KEY,
      website_id VARCHAR(64) NOT NULL,
      visitor_id VARCHAR(64) NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      duration INTEGER NOT NULL DEFAULT 0,
      entry_page VARCHAR(2048) NOT NULL DEFAULT '/',
      exit_page VARCHAR(2048) NOT NULL DEFAULT '/',
      pageviews INTEGER NOT NULL DEFAULT 1,
      events INTEGER NOT NULL DEFAULT 0,
      is_bounce BOOLEAN NOT NULL DEFAULT true,
      referrer_domain VARCHAR(512) NOT NULL DEFAULT '',
      referrer_path VARCHAR(2048) NOT NULL DEFAULT '',
      utm_source VARCHAR(255) NOT NULL DEFAULT '',
      utm_medium VARCHAR(255) NOT NULL DEFAULT '',
      utm_campaign VARCHAR(255) NOT NULL DEFAULT '',
      country VARCHAR(2) NOT NULL DEFAULT '',
      region VARCHAR(128) NOT NULL DEFAULT '',
      city VARCHAR(255) NOT NULL DEFAULT '',
      browser VARCHAR(64) NOT NULL DEFAULT '',
      os VARCHAR(64) NOT NULL DEFAULT '',
      device_type VARCHAR(16) NOT NULL DEFAULT 'desktop',
      screen_size VARCHAR(16) NOT NULL DEFAULT ''
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_website_started ON analytics.sessions (website_id, started_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON analytics.sessions (visitor_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS analytics.visitor_identities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      website_id VARCHAR(64) NOT NULL,
      visitor_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vi_website_visitor ON analytics.visitor_identities (website_id, visitor_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vi_website_user ON analytics.visitor_identities (website_id, user_id)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_vi_unique ON analytics.visitor_identities (website_id, visitor_id, user_id)`;

  // Clear old demo data for this website
  const deleted =
    await sql`DELETE FROM analytics.page_events WHERE website_id = ${String(websiteId)}`;
  if (deleted.count > 0) {
    console.log(`  ✓ Cleared ${deleted.count} old demo events`);
  }
  await sql`DELETE FROM analytics.sessions WHERE website_id = ${String(websiteId)}`;
  await sql`DELETE FROM analytics.visitor_identities WHERE website_id = ${String(websiteId)}`;

  // --- Journey templates for realistic funnel paths ---
  // Each template is a sequence of { path, title, eventName? }
  // Visitors following a template may drop off at any step
  const JOURNEY_TEMPLATES = [
    // Signup funnel: Home → Pricing → Signup → (signup event)
    {
      weight: 30,
      steps: [
        { path: "/", title: "Home — Acme Inc" },
        { path: "/pricing", title: "Pricing — Acme Inc" },
        { path: "/signup", title: "Sign Up — Acme Inc" },
        { path: "/signup", title: "Sign Up — Acme Inc", eventName: "signup" },
      ],
      dropoffRates: [0.0, 0.35, 0.4, 0.3], // chance of stopping AFTER this step
    },
    // Blog → Signup: Home → Blog → Features → Pricing → Signup
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
    // Docs exploration: Home → Docs → Docs/API → Contact
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
    // E-commerce: Home → Features → Pricing → (add_to_cart) → (checkout)
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
        {
          path: "/pricing",
          title: "Pricing — Acme Inc",
          eventName: "checkout",
        },
      ],
      dropoffRates: [0.0, 0.3, 0.35, 0.45, 0.4],
    },
    // Random browsing (no template — use the old random approach)
    { weight: 20, steps: null, dropoffRates: null },
  ];

  // Pick a journey template based on weights
  function pickJourney() {
    const totalWeight = JOURNEY_TEMPLATES.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * totalWeight;
    for (const t of JOURNEY_TEMPLATES) {
      r -= t.weight;
      if (r <= 0) return t;
    }
    return JOURNEY_TEMPLATES[JOURNEY_TEMPLATES.length - 1];
  }

  // Build all events
  const events = [];
  const identityLinks = []; // { websiteId, visitorId, userId, linkedAt }
  const visitorCount = Math.floor(EVENT_COUNT / 3); // ~3 pageviews per visitor avg

  // Assign identified users to first N visitors
  const identifiedCount = Math.min(
    IDENTIFIED_USERS.length,
    Math.floor(visitorCount * 0.3),
  );

  // --- Retention-friendly visitor generation ---
  // A portion of visitors return across multiple days/weeks to create
  // visible retention cohorts in the retention grid.
  // "Returning" visitors get 2-6 sessions spread across different days.
  const returningFraction = 0.35; // 35% of visitors will return

  for (let i = 0; i < visitorCount; i++) {
    const ua = pick(USER_AGENTS);
    const ip = randomIp();
    const screen = pick(SCREENS);
    const lang = pick(LANGUAGES);
    const geo = pick(GEO_LOCATIONS);
    const { browser, browserVersion, os, osVersion, deviceType } = parseUA(ua);
    const visitorId = hashId(String(websiteId), ip, ua, "seed-salt");

    // Identified visitors get multiple sessions spread across days
    const isIdentified = i < identifiedCount;
    const isReturning = isIdentified || Math.random() < returningFraction;

    // Returning visitors get sessions on separate days
    let sessionCount;
    if (isIdentified) {
      sessionCount = 3 + Math.floor(Math.random() * 6); // 3-8 sessions
    } else if (isReturning) {
      sessionCount = 2 + Math.floor(Math.random() * 5); // 2-6 sessions
    } else {
      sessionCount = 1;
    }

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
      let sessionStart;
      if (isReturning && s > 0) {
        // For returning visitors, spread sessions across different days/weeks
        // First session is the "cohort start", subsequent sessions happen later
        const firstVisitDaysAgo =
          DAYS_BACK - Math.floor(Math.random() * (DAYS_BACK - 14));
        const now = Date.now();
        const firstVisitTime = now - firstVisitDaysAgo * 24 * 60 * 60 * 1000;
        // Return on day 1, 3, 7, 14, 21, 30+ with decreasing probability
        const returnIntervals = [1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60];
        const dayOffset =
          returnIntervals[Math.min(s - 1, returnIntervals.length - 1)] +
          Math.floor(Math.random() * 3);
        sessionStart = new Date(
          firstVisitTime + dayOffset * 24 * 60 * 60 * 1000,
        );
        // Ensure session is not in the future
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
        // Follow a journey template — visitor progresses through steps with dropoff
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
            hostname: "demo.example.com",
          });

          // Check if visitor drops off after this step
          if (
            journey.dropoffRates[p] > 0 &&
            Math.random() < journey.dropoffRates[p]
          ) {
            break;
          }
        }
      } else {
        // Random browsing (original behavior)
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
            hostname: "demo.example.com",
          });
        }
      }
    }
  }

  // --- Build session records from events ---
  console.log("→ Building session records...");
  const sessionMap = new Map(); // sessionId -> { events[] }
  for (const evt of events) {
    if (!sessionMap.has(evt.session_id)) {
      sessionMap.set(evt.session_id, []);
    }
    sessionMap.get(evt.session_id).push(evt);
  }

  const sessionRecords = [];
  for (const [sessionId, sessionEvents] of sessionMap) {
    sessionEvents.sort((a, b) => a.timestamp - b.timestamp);
    const first = sessionEvents[0];
    const last = sessionEvents[sessionEvents.length - 1];
    const durationMs = last.timestamp.getTime() - first.timestamp.getTime();
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

  // Insert events in batches
  const BATCH = 100;
  for (let i = 0; i < events.length; i += BATCH) {
    const batch = events.slice(i, i + BATCH);
    await sql`INSERT INTO analytics.page_events ${sql(batch)}`;
  }

  // Insert sessions in batches
  for (let i = 0; i < sessionRecords.length; i += BATCH) {
    const batch = sessionRecords.slice(i, i + BATCH);
    await sql`INSERT INTO analytics.sessions ${sql(batch)}`;
  }

  // Insert identity links
  if (identityLinks.length > 0) {
    await sql`INSERT INTO analytics.visitor_identities ${sql(identityLinks)}`;
  }

  await sql.end();

  console.log(`  ✓ Inserted ${events.length} events directly into database`);
  console.log(`  ✓ Inserted ${sessionRecords.length} session records`);
  console.log(
    `  ✓ Linked ${identityLinks.length} visitors to known user identities`,
  );

  // Step 5: Create demo funnels
  console.log("→ Creating demo funnels...");

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
  ];

  // Delete existing funnels for this website
  const existingFunnels = await fetch(
    `${BASE_URL}/api/funnels?where[website][equals]=${websiteId}&limit=50`,
    { headers: { Authorization: `JWT ${demoToken}` } },
  );
  if (existingFunnels.ok) {
    const funnelData = await existingFunnels.json();
    for (const doc of funnelData.docs || []) {
      await fetch(`${BASE_URL}/api/funnels/${doc.id}`, {
        method: "DELETE",
        headers: { Authorization: `JWT ${demoToken}` },
      });
    }
  }

  let funnelCount = 0;
  for (const funnel of DEMO_FUNNELS) {
    const res = await fetch(`${BASE_URL}/api/funnels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `JWT ${demoToken}`,
      },
      body: JSON.stringify({
        name: funnel.name,
        website: websiteId,
        steps: funnel.steps,
      }),
    });
    if (res.ok) {
      funnelCount++;
    } else {
      const err = await res.text();
      console.error(`  ✗ Failed to create funnel "${funnel.name}": ${err}`);
    }
  }
  console.log(`  ✓ Created ${funnelCount} demo funnels`);

  console.log(`\n✓ Done!`);
  console.log(`\n  Login with: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(
    `  Open ${BASE_URL} and click on "Demo Website" to see analytics.`,
  );
  console.log(`  The data covers the last ${DAYS_BACK} days.`);
  console.log(
    `  Visit /${publicId}/visitors to see user journeys for ${identityLinks.length} identified users.`,
  );
  console.log(`  Visit /${publicId}/retention to see cohort retention grid.\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
