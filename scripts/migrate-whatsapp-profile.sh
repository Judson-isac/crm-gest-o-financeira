#!/bin/bash

# Script para adicionar colunas de Perfil (Nome e Foto) à tabela de WhatsApp
# Execute na VPS: ./scripts/migrate-whatsapp-profile.sh

echo "🔍 Verificando container do banco de dados..."
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    echo "Verifique se o banco de dados está rodando."
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️ Adicionando colunas de perfil..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
-- Adiciona profileName se não existir
DO \$\$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_instances' AND column_name='profileName') THEN
        ALTER TABLE whatsapp_instances ADD COLUMN "profileName" TEXT;
    END IF;
END \$\$;

-- Adiciona profilePicUrl se não existir
DO \$\$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_instances' AND column_name='profilePicUrl') THEN
        ALTER TABLE whatsapp_instances ADD COLUMN "profilePicUrl" TEXT;
    END IF;
END \$\$;
EOF

echo "✅ Colunas 'profileName' e 'profilePicUrl' adicionadas com sucesso!"
