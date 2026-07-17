CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  player_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scores_game_rank
  ON scores (game, score DESC, duration ASC);

CREATE INDEX IF NOT EXISTS idx_scores_player_best
  ON scores (game, player_hash, score DESC, duration ASC);

CREATE TABLE IF NOT EXISTS score_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_score_attempts_recent
  ON score_attempts (player_hash, created_at DESC);
