#!/bin/bash

# Script to decouple Evolution and Chatwoot profiles in the database

DB_PATH="database.sqlite"

echo "=========================================="
echo "MIGRATING WHATSAPP PROFILES (DECOUPLED)"
echo "=========================================="

# 1. Add 'type' to whatsapp_profiles
echo "[1/4] Adding 'type' column to whatsapp_profiles..."
sqlite3 $DB_PATH "ALTER TABLE whatsapp_profiles ADD COLUMN type TEXT DEFAULT 'both';"

# 2. Add new profile ID columns to redes
echo "[2/4] Adding profiling columns to redes..."
sqlite3 $DB_PATH "ALTER TABLE redes ADD COLUMN whatsapp_evolution_profile_id TEXT;"
sqlite3 $DB_PATH "ALTER TABLE redes ADD COLUMN whatsapp_chatwoot_profile_id TEXT;"

# 3. Migrate existing data (Legacy Link)
echo "[3/4] Migrating legacy links..."
sqlite3 $DB_PATH "UPDATE redes SET whatsapp_evolution_profile_id = whatsapp_profile_id WHERE whatsapp_profile_id IS NOT NULL;"
sqlite3 $DB_PATH "UPDATE redes SET whatsapp_chatwoot_profile_id = whatsapp_profile_id WHERE whatsapp_profile_id IS NOT NULL;"

echo "[4/4] Done! Decoupled columns added and populated."
echo "=========================================="
