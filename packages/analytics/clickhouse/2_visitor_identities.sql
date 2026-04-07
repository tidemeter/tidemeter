-- Visitor identity linking table for ClickHouse
-- Maps anonymous visitor_id to authenticated user_id
-- ReplacingMergeTree deduplicates on ORDER BY key, equivalent to PG UNIQUE + ON CONFLICT DO NOTHING

CREATE TABLE IF NOT EXISTS visitor_identities (
    id UUID DEFAULT generateUUIDv4(),
    website_id UUID,
    visitor_id String,
    user_id String,
    linked_at DateTime('UTC') DEFAULT now()
)
ENGINE = ReplacingMergeTree(linked_at)
ORDER BY (website_id, visitor_id, user_id);
