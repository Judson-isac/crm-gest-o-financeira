#!/bin/bash

# Script para adicionar coluna bolsaGestor no banco de dados da VPS
# Execute na VPS: ./scripts/migrate-bolsa.sh

echo "🔍 Verificando container do banco de dados..."
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    echo "Verifique se o stack está rodando com 'docker stack ps crm'"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️ Aplicando migration (bolsaGestor)..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
ALTER TABLE public.matriculas 
ADD COLUMN IF NOT EXISTS "bolsaGestor" NUMERIC(5,2);
EOF

echo "✅ Migration aplicada com sucesso!"
