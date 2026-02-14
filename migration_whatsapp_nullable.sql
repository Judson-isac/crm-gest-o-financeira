-- Make redeId nullable in whatsapp_instances
-- This allows instances to exist without being immediately assigned to a network.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'whatsapp_instances' AND column_name = 'redeId'
    ) THEN
        -- Check if it's already nullable
        IF (SELECT is_nullable FROM information_schema.columns 
            WHERE table_name = 'whatsapp_instances' AND column_name = 'redeId') = 'NO' THEN
            ALTER TABLE whatsapp_instances ALTER COLUMN "redeId" DROP NOT NULL;
            RAISE NOTICE 'Coluna redeId alterada para NULLABLE.';
        ELSE
            RAISE NOTICE 'Coluna redeId já é NULLABLE.';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela whatsapp_instances ou coluna redeId não encontrada.';
    END IF;
END $$;
