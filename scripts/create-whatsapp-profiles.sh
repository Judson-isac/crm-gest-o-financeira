#!/bin/bash

# Script para criar a tabela de perfis globais de WhatsApp/Chatwoot
# Execute na VPS: ./scripts/create-whatsapp-profiles.sh

echo "🔍 Verificando container do banco de dados..."
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️ Criando tabela whatsapp_profiles e vinculando à tabela redes..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
-- 1. Criar tabela de perfis globais
CREATE TABLE IF NOT EXISTS whatsapp_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    api_url TEXT,
    api_token TEXT,
    chatwoot_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Adicionar coluna de vínculo na tabela redes
ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_profile_id UUID REFERENCES whatsapp_profiles(id);

-- 3. Trigger para updated_at (opcional, mas boa prática)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
\$\$ language 'plpgsql';

DO \$\$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_whatsapp_profiles') THEN
        CREATE TRIGGER set_timestamp_whatsapp_profiles
        BEFORE UPDATE ON whatsapp_profiles
        FOR EACH ROW
        EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END \$\$;
EOF

if [ $? -eq 0 ]; then
    echo "=========================================="
    echo "✅ SUCESSO! Sistema de perfis globais criado."
    echo "=========================================="
else
    echo "=========================================="
    echo "❌ ERRO! Falha ao criar tabelas de perfis."
    echo "=========================================="
    exit 1
fi
