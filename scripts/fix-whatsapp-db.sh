#!/bin/bash
# Script para corrigir a tabela whatsapp_instances (redeId nullable)
# Uso: ./scripts/fix-whatsapp-db.sh

echo "🗄️  Iniciando correção da tabela whatsapp_instances..."

# Encontrar o container do banco de dados (pgvector)
PG_CONTAINER=$(docker ps -q -f name=pgvector | head -n 1)

if [ -z "$PG_CONTAINER" ]; then
    echo "❌ Erro: Não foi possível encontrar o container 'pgvector'."
    exit 1
fi

echo "🐘 Container encontrado: $PG_CONTAINER"

# Caminho do SQL (assume que o script é rodado da raiz do projeto)
SQL_FILE="migration_whatsapp_nullable.sql"

if [ -f "$SQL_FILE" ]; then
    echo "📄 Aplicando arquivo $SQL_FILE..."
    docker exec -i "$PG_CONTAINER" psql -U crm_user -d crm_gestao < "$SQL_FILE"
else
    echo "⚡ Executando comando direto (arquivo não encontrado)..."
    docker exec -i "$PG_CONTAINER" psql -U crm_user -d crm_gestao -c 'ALTER TABLE whatsapp_instances ALTER COLUMN "redeId" DROP NOT NULL;'
fi

echo "✅ Pronto! A coluna redeId agora aceita valores nulos."
