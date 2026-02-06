-- Create Ranking Configuration Table
CREATE TABLE IF NOT EXISTS ranking_config (
    "redeId" text PRIMARY KEY REFERENCES redes(id) ON DELETE CASCADE,
    "voiceEnabled" boolean DEFAULT true,
    "voiceSpeed" decimal DEFAULT 1.1,
    "soundEnabled" boolean DEFAULT true,
    "alertMode" text DEFAULT 'confetti', -- 'confetti' or 'alert'
    "soundUrl" text, -- Optional custom MP3 URL
    "updatedAt" timestamp DEFAULT NOW()
);

-- Create Ranking Messages Table (for manual alerts)
CREATE TABLE IF NOT EXISTS ranking_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "redeId" text REFERENCES redes(id) ON DELETE CASCADE,
    message text NOT NULL,
    "createdAt" timestamp DEFAULT NOW()
);

-- Insert default config for existing networks (upsert safety)
INSERT INTO ranking_config ("redeId")
SELECT id FROM redes
ON CONFLICT ("redeId") DO NOTHING;
