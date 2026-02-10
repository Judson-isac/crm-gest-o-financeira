#!/bin/bash

# Script para adicionar a coluna avatarUrl no banco de dados
# Execute na VPS: ./scripts/fix-db-avatar.sh

echo "🔍 Verificando container do banco de dados..."
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    echo "Verifique se o stack está rodando com 'docker stack ps crm'"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️ Aplicando correção no banco de dados (Adicionando avatarUrl)..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
-- Adiciona coluna avatarUrl se não existir
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
EOF

echo "✅ Correção aplicada com sucesso!"
echo "🚀 Agora os usuários podem salvar fotos de perfil."
