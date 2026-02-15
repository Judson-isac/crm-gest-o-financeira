#!/bin/bash

# Configuration
DB_NAME="crm_gestao"
DB_USER="postgres"

echo "=========================================="
echo "ADDING WHATSAPP DEFAULTS TO REDES TABLE"
echo "=========================================="

# SQL to add columns
SQL_ALTER="
ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_api_url TEXT;
ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_api_token TEXT;
ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_chatwoot_config JSONB DEFAULT '{}'::jsonb;
"

# Execute the SQL
echo "[1/1] Altering table redes..."
psql -d $DB_NAME -U $DB_USER -c "$SQL_ALTER"

if [ $? -eq 0 ]; then
    echo "=========================================="
    echo "SUCCESS! Columns added to redes table."
    echo "=========================================="
else
    echo "=========================================="
    echo "ERROR! Failed to alter table redes."
    echo "=========================================="
    exit 1
fi
