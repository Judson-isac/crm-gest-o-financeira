#!/bin/bash

# Script para corrigir colunas no banco de dados (INCLUI logoHeight)
# Execute na VPS: ./scripts/fix-db-v2.sh

echo "🔍 Verificando container do banco de dados..."
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    echo "Verifique se o stack está rodando com 'docker stack ps crm'"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️ Aplicando correção no banco de dados..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
-- Adiciona colunas se não existirem

-- Tabela REDES (Já existentes)
ALTER TABLE public.redes 
ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "logoVerticalUrl" TEXT,
ADD COLUMN IF NOT EXISTS "faviconUrl" TEXT;

-- Tabela SYSTEM_CONFIG
-- Não precisa de ALTER TABLE pois é chave-valor, mas o código vai passar a usar APP_LOGO_HEIGHT

EOF

echo "✅ Correção aplicada com sucesso!"
echo "🚀 Agora você pode configurar a altura da logo."
