#!/bin/bash

# Script para corrigir a tabela Spacepoints (Recriar com nova estrutura)
# Execute na VPS: ./scripts/fix-spacepoints-db.sh

echo "🔍 Verificando container do banco de dados..."
# Tenta encontrar o container do postgres (pode ser 'pgvector' ou outro nome dependendo do stack)
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "⚠️  Container 'pgvector' não encontrado. Tentando 'postgres'..."
    CONTAINER_ID=$(docker ps -q -f name=postgres)
fi

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    echo "Verifique se o stack está rodando com 'docker stack ps crm' ou 'docker ps'"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️  Aplicando correção na tabela spacepoints..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
-- Drop old table if exists
DROP TABLE IF EXISTS spacepoints;

-- Create new table with JSONB for dynamic targets
CREATE TABLE spacepoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "processoSeletivo" TEXT NOT NULL,
    "redeId" TEXT NOT NULL,
    "numeroSpace" INTEGER NOT NULL,
    "dataSpace" DATE NOT NULL,
    "metaTotal" INTEGER DEFAULT 0,
    "metasPorTipo" JSONB DEFAULT '{}'::jsonb,
    "criadoEm" TIMESTAMP DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_spacepoints_proc_rede ON spacepoints ("processoSeletivo", "redeId");

-- Check if created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'spacepoints';
EOF

echo "✅ Tabela spacepoints recriada com sucesso!"
echo "🚀 Agora o erro 'column dataSpace does not exist' deve sumir."
