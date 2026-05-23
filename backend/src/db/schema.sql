CREATE TABLE IF NOT EXISTS children (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT NOT NULL DEFAULT '',
  access_code_hash      TEXT NOT NULL UNIQUE,
  recovery_answer_hash  TEXT NOT NULL,
  created_date          TEXT NOT NULL,
  stars_spent           INTEGER NOT NULL DEFAULT 0 CHECK (stars_spent >= 0),
  created_at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  child_id    INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_child ON sessions(child_id);

CREATE TABLE IF NOT EXISTS day_stars (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id  INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,
  earned    INTEGER NOT NULL DEFAULT 0 CHECK (earned IN (0,1)),
  UNIQUE (child_id, date)
);
CREATE INDEX IF NOT EXISTS idx_day_stars_child ON day_stars(child_id);

CREATE TABLE IF NOT EXISTS agenda_entries (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id  INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,
  hour      INTEGER NOT NULL CHECK (hour BETWEEN 7 AND 20),
  activity  TEXT NOT NULL DEFAULT '',
  UNIQUE (child_id, date, hour)
);
CREATE INDEX IF NOT EXISTS idx_agenda_child_date ON agenda_entries(child_id, date);

CREATE TABLE IF NOT EXISTS wants (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id    INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  cost        INTEGER NOT NULL CHECK (cost BETWEEN 1 AND 5),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wants_child ON wants(child_id);
