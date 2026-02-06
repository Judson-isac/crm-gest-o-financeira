DROP TABLE IF EXISTS saved_sounds;
CREATE TABLE saved_sounds (
    id TEXT PRIMARY KEY,
    "redeId" TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW()
);
