-- Permits and unsafe-practice observations, stored as JSON documents
-- keyed by the app's own id (p... / o...), so the D1 schema doesn't
-- need to track every field the client-side app evolves.
CREATE TABLE IF NOT EXISTS permits (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
