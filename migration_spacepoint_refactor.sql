-- Drop old table (incompatible data)
DROP TABLE IF EXISTS spacepoints;

-- Create new table with target quantities
CREATE TABLE spacepoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "processoSeletivo" TEXT NOT NULL,
    "redeId" TEXT NOT NULL,
    "numeroSpace" INTEGER NOT NULL,
    "dataSpace" DATE NOT NULL,
    "metaEAD" INTEGER DEFAULT 0,
    "metaHibrido" INTEGER DEFAULT 0,
    "metaPos" INTEGER DEFAULT 0,
    "metaProf" INTEGER DEFAULT 0,
    "metaTec" INTEGER DEFAULT 0,
    "metaTotal" INTEGER DEFAULT 0,
    "criadoEm" TIMESTAMP DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX idx_spacepoints_proc_rede ON spacepoints ("processoSeletivo", "redeId");
