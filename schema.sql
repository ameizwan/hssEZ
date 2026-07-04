-- HSSE e-PTW — Cloudflare D1 (SQLite) schema
-- Each permit is stored as a JSON blob (data) plus a few indexed columns
-- so the app's existing permit object shape doesn't need to change.

CREATE TABLE IF NOT EXISTS permits (
  id         TEXT PRIMARY KEY,
  no         TEXT NOT NULL,
  type       TEXT NOT NULL,
  status     TEXT NOT NULL,
  data       TEXT NOT NULL,   -- full permit JSON (source of truth)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_permits_status ON permits(status);
CREATE INDEX IF NOT EXISTS idx_permits_type   ON permits(type);
