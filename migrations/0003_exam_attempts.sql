-- Exam attempts (practice and real exam), one row per (user, attempt id). `data` is the JSON of the
-- answers, self-marks and scores. updated_at is the client's edit time (ms) and drives last-write-wins
-- merging; a deleted attempt stays as a row with deleted = 1 so other devices learn about the deletion.
CREATE TABLE exam_attempts (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  test       INTEGER NOT NULL,
  mode       TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted    INTEGER NOT NULL DEFAULT 0,
  data       TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
