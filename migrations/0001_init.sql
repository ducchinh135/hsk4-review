CREATE TABLE users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash   TEXT NOT NULL,
  salt        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

-- One row per (user, word). status: 'k' = known, 'r' = needs review, '' = cleared.
-- updated_at is the client's edit time (ms) and drives last-write-wins merging.
CREATE TABLE progress (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word        TEXT NOT NULL,
  status      TEXT NOT NULL,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, word)
);

-- Failed login / register throttling.
CREATE TABLE attempts (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
