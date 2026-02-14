#!/bin/bash

# Script para restaurar a obrigatoriedade da rede nas instâncias de WhatsApp
# Execute na VPS: ./scripts/restore-rede-not-null.sh

echo "🔍 Verificando container do banco de dados..."
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    echo "Verifique se o stack está rodando com 'docker stack ps crm'"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️ Verificando se existem instâncias sem rede..."

NULL_COUNT=$(docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao -t -c "SELECT count(*) FROM whatsapp_instances WHERE \"redeId\" IS NULL;" | xargs)

if [ "$NULL_COUNT" -gt 0 ]; then
    echo "⚠️  AVISO: Existem $NULL_COUNT instâncias sem rede vinculada."
    echo "Por favor, vincule essas instâncias a uma rede através do CRM antes de prosseguir."
    exit 1
fi

echo "✅ Nenhuma instância órfã encontrada. Aplicando restrição NOT NULL..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
-- Restaura a obrigatoriedade da coluna redeId
ALTER TABLE whatsapp_instances ALTER COLUMN "redeId" SET NOT NULL;

-- Verifica o status final
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_instances' AND column_name = 'redeId';
EOF

echo "✅ Sucesso! O isolamento por rede foi restaurado no banco de dados."
