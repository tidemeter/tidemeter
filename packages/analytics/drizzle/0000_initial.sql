-- 0000_initial.sql
-- Initial schema for TideMeter analytics tables

CREATE SCHEMA IF NOT EXISTS analytics;

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS analytics._migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Page events table
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
);

CREATE INDEX IF NOT EXISTS idx_page_events_website_ts ON analytics.page_events (website_id, "timestamp");
CREATE INDEX IF NOT EXISTS idx_page_events_session ON analytics.page_events (session_id);
CREATE INDEX IF NOT EXISTS idx_page_events_visitor ON analytics.page_events (visitor_id);

-- Sessions table
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
  is_bounce BOOLEAN NOT NULL DEFAULT TRUE,
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
);

CREATE INDEX IF NOT EXISTS idx_sessions_website_started ON analytics.sessions (website_id, started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON analytics.sessions (visitor_id);
