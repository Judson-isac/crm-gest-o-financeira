-- Migration: Adicionar suporte a sons separados para disparo manual
-- Como executar:
--   1. Abra o pgAdmin (ou seu cliente PostgreSQL favorito)
--   2. Conecte-se ao banco de dados 'postgres'
--   3. Execute o comando abaixo:

ALTER TABLE ranking_config 
ADD COLUMN IF NOT EXISTS "manualAlertSoundUrl" TEXT;

-- Verificar se foi adicionada:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ranking_config';

-- Deve mostrar a nova coluna 'manualAlertSoundUrl' no resultado
