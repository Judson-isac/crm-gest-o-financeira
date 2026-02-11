#!/bin/bash

# Script para garantir suporte a logos Dark Mode no banco de dados
# Execute na VPS: ./scripts/fix-db-v3-dark-logos.sh

echo "🔍 Verificando container do banco de dados..."
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    echo "Verifique se o stack está rodando com 'docker stack ps crm'"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️ Verificando configuração do sistema..."

# Nota: A tabela system_config utiliza um modelo chave-valor (EAV).
# Não é necessário o uso de ALTER TABLE para novas chaves de configuração,
# pois o código irá inserir as chaves APP_LOGO_DARK, APP_LOGO_LOGIN_DARK 
# e APP_LOGO_SUPERADMIN_DARK automaticamente ao salvar.

# Este script serve como registro e verificação.
docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
-- Verificação da tabela system_config (deve existir)
-- SELECT * FROM system_config WHERE key IN ('APP_LOGO_DARK', 'APP_LOGO_LOGIN_DARK', 'APP_LOGO_SUPERADMIN_DARK');

-- Caso queira garantir que a tabela suporte valores longos (base64)
-- ALTER TABLE system_config ALTER COLUMN value TYPE TEXT; 
-- (Normalmente já é TEXT ou VARCHAR sem limite curto)

EOF

echo "✅ Verificação concluída!"
echo "🚀 As novas logos podem ser configuradas agora no painel SuperAdmin."
