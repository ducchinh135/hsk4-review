-- Spaced-repetition state, one row per (user, word). due/added are day numbers
-- (days since epoch, local 4am rollover), ivl in days (0 = learning), ease = factor x 1000.
-- updated_at is the client's edit time (ms) and drives last-write-wins merging.
CREATE TABLE srs (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word       TEXT NOT NULL,
  due        INTEGER NOT NULL,
  ivl        INTEGER NOT NULL,
  ease       INTEGER NOT NULL,
  reps       INTEGER NOT NULL,
  lapses     INTEGER NOT NULL,
  added      INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, word)
);
