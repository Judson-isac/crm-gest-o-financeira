#!/bin/bash

# Script para adicionar colunas de WhatsApp na tabela redes
# Execute na VPS: ./scripts/add-rede-whatsapp-defaults.sh

echo "🔍 Verificando container do banco de dados..."
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️ Aplicando colunas de WhatsApp na tabela redes..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_api_url TEXT;
ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_api_token TEXT;
ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_chatwoot_config JSONB DEFAULT '{}'::jsonb;
EOF

if [ $? -eq 0 ]; then
    echo "=========================================="
    echo "✅ SUCESSO! Colunas adicionadas com sucesso."
    echo "=========================================="
else
    echo "=========================================="
    echo "❌ ERRO! Falha ao alterar a tabela redes."
    echo "=========================================="
    exit 1
fi
