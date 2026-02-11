#!/bin/bash

# Script para criar a tabela metas_usuarios
# Execute na VPS: ./scripts/create-metas-usuarios.sh

echo "🔍 Verificando container do banco de dados..."
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "⚠️  Container 'pgvector' não encontrado. Tentando 'postgres'..."
    CONTAINER_ID=$(docker ps -q -f name=postgres)
fi

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️  Criando tabela metas_usuarios..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
-- Create metas_usuarios table if not exists
CREATE TABLE IF NOT EXISTS metas_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "usuarioId" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "numeroSemana" INTEGER NOT NULL,
    "metaQtd" INTEGER DEFAULT 0,
    "redeId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP DEFAULT NOW(),
    UNIQUE("usuarioId", "processoId", "numeroSemana", "redeId")
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_metas_usuarios_upn ON metas_usuarios ("usuarioId", "processoId", "redeId");

-- Check if exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'metas_usuarios';
EOF

echo "✅ Tabela metas_usuarios configurada com sucesso!"
