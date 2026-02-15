# Configuration
$DB_NAME = "crm_gestao"
$DB_USER = "postgres"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ADDING WHATSAPP DEFAULTS TO REDES TABLE" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# SQL to add columns
$SQL_ALTER = @"
ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_api_url TEXT;
ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_api_token TEXT;
ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_chatwoot_config JSONB DEFAULT '{}'::jsonb;
"@

# Execute the SQL
Write-Host "[1/1] Altering table redes..."
& psql -d $DB_NAME -U $DB_USER -c "$SQL_ALTER"

if ($LASTEXITCODE -eq 0) {
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "SUCCESS! Columns added to redes table." -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "ERROR! Failed to alter table redes." -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    exit 1
}
