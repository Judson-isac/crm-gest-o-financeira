#!/bin/bash

# Script para corrigir erro "column logoUrl does not exist" no banco de dados
# Execute na VPS: ./scripts/fix-db.sh

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
-- Adiciona colunas se não existirem (re-executa migration de forma segura)
ALTER TABLE public.redes 
ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "logoVerticalUrl" TEXT;

-- Verifica se foi criado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'redes' AND column_name IN ('logoUrl', 'logoVerticalUrl');
EOF

echo "✅ Correção aplicada com sucesso!"
echo "🚀 Agora você pode salvar as logos no sistema."
