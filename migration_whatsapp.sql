-- Create whatsapp_instances table
CREATE TABLE IF NOT EXISTS whatsapp_instances (
    id TEXT PRIMARY KEY,
    "redeId" TEXT NOT NULL REFERENCES redes(id) ON DELETE CASCADE,
    "instanceName" TEXT NOT NULL,
    "instanceToken" TEXT NOT NULL,
    "ownerId" TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Disconnected',
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE("instanceName")
);

-- Note: Permissoes is stored as JSON in funcoes.permissoes. 
-- Existing functions will naturally accept the new field if we handle it in code.
-- However, we might want to update the default Admin role for existing networks if needed.
-- For now, we will handle the logic in db.ts to include 'whatsapp' in moduleMap.
