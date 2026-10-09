PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS posts (
 id TEXT PRIMARY KEY,
 author TEXT NOT NULL REFERENCES users(id),
 title TEXT NOT NULL,
 body TEXT NOT NULL,
 category TEXT NOT NULL,
 created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS posts_created ON posts(created DESC);
CREATE TABLE IF NOT EXISTS comments (
 id TEXT PRIMARY KEY,
 post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
 author TEXT NOT NULL REFERENCES users(id),
 body TEXT NOT NULL,
 created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_post_created ON comments(post_id,created);
CREATE TABLE IF NOT EXISTS blocks (
 blocker TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 blocked TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 PRIMARY KEY (blocker, blocked),
 CHECK(blocker <> blocked)
);
CREATE TABLE IF NOT EXISTS reports (
 id TEXT PRIMARY KEY,
 reporter TEXT NOT NULL REFERENCES users(id),
 target_type TEXT NOT NULL CHECK(target_type IN ('post','comment','user')),
 target_id TEXT NOT NULL,
 reason TEXT NOT NULL,
 created INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'open'
);
CREATE INDEX IF NOT EXISTS reports_created ON reports(created DESC);
