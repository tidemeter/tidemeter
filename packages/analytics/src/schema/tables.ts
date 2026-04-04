import {
  pgTable,
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const analyticsSchema = pgSchema("analytics");

export const pageEvents = analyticsSchema.table(
  "page_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    websiteId: varchar("website_id", { length: 64 }).notNull(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    visitorId: varchar("visitor_id", { length: 64 }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    eventName: varchar("event_name", { length: 255 })
      .notNull()
      .default("pageview"),
    urlPath: varchar("url_path", { length: 2048 }).notNull().default("/"),
    urlQuery: varchar("url_query", { length: 2048 }).notNull().default(""),
    referrerPath: varchar("referrer_path", { length: 2048 })
      .notNull()
      .default(""),
    referrerDomain: varchar("referrer_domain", { length: 512 })
      .notNull()
      .default(""),
    utmSource: varchar("utm_source", { length: 255 }).notNull().default(""),
    utmMedium: varchar("utm_medium", { length: 255 }).notNull().default(""),
    utmCampaign: varchar("utm_campaign", { length: 255 }).notNull().default(""),
    utmContent: varchar("utm_content", { length: 255 }).notNull().default(""),
    utmTerm: varchar("utm_term", { length: 255 }).notNull().default(""),
    country: varchar("country", { length: 2 }).notNull().default(""),
    region: varchar("region", { length: 128 }).notNull().default(""),
    city: varchar("city", { length: 255 }).notNull().default(""),
    browser: varchar("browser", { length: 64 }).notNull().default(""),
    browserVersion: varchar("browser_version", { length: 32 })
      .notNull()
      .default(""),
    os: varchar("os", { length: 64 }).notNull().default(""),
    osVersion: varchar("os_version", { length: 32 }).notNull().default(""),
    deviceType: varchar("device_type", { length: 16 })
      .notNull()
      .default("desktop"),
    screenSize: varchar("screen_size", { length: 16 }).notNull().default(""),
    pageTitle: varchar("page_title", { length: 512 }).notNull().default(""),
    hostname: varchar("hostname", { length: 512 }).notNull().default(""),
    customData: jsonb("custom_data"),
  },
  (table) => [
    index("idx_page_events_website_ts").on(table.websiteId, table.timestamp),
    index("idx_page_events_session").on(table.sessionId),
    index("idx_page_events_visitor").on(table.visitorId),
  ],
);

export const sessions = analyticsSchema.table(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    websiteId: varchar("website_id", { length: 64 }).notNull(),
    visitorId: varchar("visitor_id", { length: 64 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    duration: integer("duration").notNull().default(0),
    entryPage: varchar("entry_page", { length: 2048 }).notNull().default("/"),
    exitPage: varchar("exit_page", { length: 2048 }).notNull().default("/"),
    pageviews: integer("pageviews").notNull().default(1),
    events: integer("events").notNull().default(0),
    isBounce: boolean("is_bounce").notNull().default(true),
    referrerDomain: varchar("referrer_domain", { length: 512 })
      .notNull()
      .default(""),
    referrerPath: varchar("referrer_path", { length: 2048 })
      .notNull()
      .default(""),
    utmSource: varchar("utm_source", { length: 255 }).notNull().default(""),
    utmMedium: varchar("utm_medium", { length: 255 }).notNull().default(""),
    utmCampaign: varchar("utm_campaign", { length: 255 }).notNull().default(""),
    country: varchar("country", { length: 2 }).notNull().default(""),
    region: varchar("region", { length: 128 }).notNull().default(""),
    city: varchar("city", { length: 255 }).notNull().default(""),
    browser: varchar("browser", { length: 64 }).notNull().default(""),
    os: varchar("os", { length: 64 }).notNull().default(""),
    deviceType: varchar("device_type", { length: 16 })
      .notNull()
      .default("desktop"),
    screenSize: varchar("screen_size", { length: 16 }).notNull().default(""),
  },
  (table) => [
    index("idx_sessions_website_started").on(table.websiteId, table.startedAt),
    index("idx_sessions_visitor").on(table.visitorId),
  ],
);

/**
 * Links anonymous visitor hashes to known user identities.
 * When a user logs in, the tracker sends a userId that maps to the
 * hashed visitorId so we can merge anonymous + authenticated activity.
 */
export const visitorIdentities = analyticsSchema.table(
  "visitor_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    websiteId: varchar("website_id", { length: 64 }).notNull(),
    visitorId: varchar("visitor_id", { length: 64 }).notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_visitor_identity_unique").on(
      table.websiteId,
      table.visitorId,
      table.userId,
    ),
    index("idx_visitor_identity_user").on(table.websiteId, table.userId),
    index("idx_visitor_identity_visitor").on(table.websiteId, table.visitorId),
  ],
);
