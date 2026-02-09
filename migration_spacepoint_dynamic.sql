-- Drop old table
DROP TABLE IF EXISTS spacepoints;

-- Create new table with JSONB for dynamic targets
CREATE TABLE spacepoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "processoSeletivo" TEXT NOT NULL,
    "redeId" TEXT NOT NULL,
    "numeroSpace" INTEGER NOT NULL,
    "dataSpace" DATE NOT NULL,
    "metaTotal" INTEGER DEFAULT 0,
    "metasPorTipo" JSONB DEFAULT '{}'::jsonb, -- Stores {"EAD": 10, "PRESENCIAL": 5, ...}
    "criadoEm" TIMESTAMP DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX idx_spacepoints_proc_rede ON spacepoints ("processoSeletivo", "redeId");
