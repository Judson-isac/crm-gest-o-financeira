#!/bin/bash

# Script para adicionar a coluna 'polo' na tabela Spacepoints na VPS
# Uso: ./scripts/add-polo-spacepoints.sh

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
echo "🛠️  Adicionando coluna 'polo' à tabela spacepoints..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
ALTER TABLE spacepoints ADD COLUMN IF NOT EXISTS polo TEXT;
EOF

echo "✅ Coluna 'polo' adicionada com sucesso!"
