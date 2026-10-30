-- Apply with: wrangler d1 execute <database-name> --local --file=schema.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS event_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  registration_open INTEGER NOT NULL DEFAULT 1 CHECK (registration_open IN (0,1))
);
INSERT OR IGNORE INTO event_settings (id, registration_open) VALUES (1, 1);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  data TEXT NOT NULL CHECK (json_valid(data)),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  management_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS registrations_status_created ON registrations(status, created_at DESC);

-- Public creation uses atomic, fixed-window counters. Only hashes of IP addresses are stored.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
