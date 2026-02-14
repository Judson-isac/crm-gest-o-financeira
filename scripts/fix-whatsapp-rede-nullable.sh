#!/bin/bash

# Script para permitir instâncias de WhatsApp sem rede vinculada
# Execute na VPS: ./scripts/fix-whatsapp-rede-nullable.sh

echo "🔍 Verificando container do banco de dados..."
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    echo "Verifique se o stack está rodando com 'docker stack ps crm'"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️ Aplicando alteração: tornando 'redeId' OPCIONAL..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
-- Altera a coluna redeId para permitir NULL
ALTER TABLE whatsapp_instances ALTER COLUMN "redeId" DROP NOT NULL;

-- Verifica se a alteração foi aplicada
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_instances' AND column_name = 'redeId';
EOF

echo "✅ Sucesso! Agora você pode criar instâncias sem selecionar uma rede."
