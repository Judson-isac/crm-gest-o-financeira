#!/bin/bash

# Script to decouple Evolution and Chatwoot profiles on the VPS
# Execute on VPS: ./scripts/create-decoupled-profiles.sh

echo "🔍 Verificando container do banco de dados..."
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "⚠️  Container 'pgvector' não encontrado. Tentando 'postgres'..."
    CONTAINER_ID=$(docker ps -q -f name=postgres)
fi

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️  Migrando banco de dados para perfis desacoplados..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
-- 1. WhatsApp Profiles Table: Add type column if not exists
DO \$\$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_profiles' AND column_name='type') THEN
        ALTER TABLE whatsapp_profiles ADD COLUMN type TEXT DEFAULT 'both';
    END IF;
END \$\$;

-- 2. Redes Table: Add new profiling columns if they don't exist
DO \$\$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='redes' AND column_name='whatsapp_evolution_profile_id') THEN
        ALTER TABLE redes ADD COLUMN whatsapp_evolution_profile_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='redes' AND column_name='whatsapp_chatwoot_profile_id') THEN
        ALTER TABLE redes ADD COLUMN whatsapp_chatwoot_profile_id TEXT;
    END IF;
END \$\$;

-- 3. Data Migration: Copy legacy profile_id to new columns if legacy column exists
DO \$\$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='redes' AND column_name='whatsapp_profile_id') THEN
        UPDATE redes 
        SET whatsapp_evolution_profile_id = whatsapp_profile_id,
            whatsapp_chatwoot_profile_id = whatsapp_profile_id
        WHERE whatsapp_profile_id IS NOT NULL 
        AND whatsapp_evolution_profile_id IS NULL;
    END IF;
END \$\$;

-- Check changes
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('redes', 'whatsapp_profiles') 
AND column_name IN ('type', 'whatsapp_evolution_profile_id', 'whatsapp_chatwoot_profile_id');
EOF

echo "✅ Banco de dados migrado com sucesso para perfis desacoplados!"
