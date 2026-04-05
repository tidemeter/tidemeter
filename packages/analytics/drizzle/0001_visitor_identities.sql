-- 0001_visitor_identities.sql
-- Add visitor_identities table for linking anonymous visitors to known users

CREATE TABLE IF NOT EXISTS analytics.visitor_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id VARCHAR(64) NOT NULL,
  visitor_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_visitor_identity_unique
  ON analytics.visitor_identities (website_id, visitor_id, user_id);

CREATE INDEX IF NOT EXISTS idx_visitor_identity_user
  ON analytics.visitor_identities (website_id, user_id);

CREATE INDEX IF NOT EXISTS idx_visitor_identity_visitor
  ON analytics.visitor_identities (website_id, visitor_id);
