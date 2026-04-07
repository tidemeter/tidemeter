-- TideMeter ClickHouse initial schema: page_events + sessions

CREATE TABLE IF NOT EXISTS page_events (
    id UUID DEFAULT generateUUIDv4(),
    website_id UUID,
    session_id String,
    visitor_id String,
    timestamp DateTime('UTC'),
    event_name LowCardinality(String) DEFAULT 'pageview',
    url_path String DEFAULT '/',
    url_query String DEFAULT '',
    referrer_path String DEFAULT '',
    referrer_domain LowCardinality(String) DEFAULT '',
    utm_source LowCardinality(String) DEFAULT '',
    utm_medium LowCardinality(String) DEFAULT '',
    utm_campaign LowCardinality(String) DEFAULT '',
    utm_content String DEFAULT '',
    utm_term String DEFAULT '',
    country LowCardinality(String) DEFAULT '',
    region LowCardinality(String) DEFAULT '',
    city String DEFAULT '',
    browser LowCardinality(String) DEFAULT '',
    browser_version LowCardinality(String) DEFAULT '',
    os LowCardinality(String) DEFAULT '',
    os_version LowCardinality(String) DEFAULT '',
    device_type LowCardinality(String) DEFAULT 'desktop',
    screen_size LowCardinality(String) DEFAULT '',
    page_title String DEFAULT '',
    hostname LowCardinality(String) DEFAULT '',
    custom_data String DEFAULT '{}'
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (website_id, timestamp, visitor_id);

CREATE TABLE IF NOT EXISTS sessions (
    id String,
    website_id UUID,
    visitor_id String,
    started_at DateTime('UTC'),
    ended_at DateTime('UTC'),
    duration UInt32 DEFAULT 0,
    entry_page String DEFAULT '/',
    exit_page String DEFAULT '/',
    pageviews UInt32 DEFAULT 1,
    events UInt32 DEFAULT 0,
    is_bounce UInt8 DEFAULT 1,
    referrer_domain LowCardinality(String) DEFAULT '',
    referrer_path String DEFAULT '',
    utm_source LowCardinality(String) DEFAULT '',
    utm_medium LowCardinality(String) DEFAULT '',
    utm_campaign LowCardinality(String) DEFAULT '',
    country LowCardinality(String) DEFAULT '',
    region LowCardinality(String) DEFAULT '',
    city String DEFAULT '',
    browser LowCardinality(String) DEFAULT '',
    os LowCardinality(String) DEFAULT '',
    device_type LowCardinality(String) DEFAULT 'desktop',
    screen_size LowCardinality(String) DEFAULT '',
    sign Int8 DEFAULT 1
)
ENGINE = CollapsingMergeTree(sign)
PARTITION BY toYYYYMM(started_at)
ORDER BY (website_id, started_at, id);
