-- Adiciona a coluna polo à tabela spacepoints se ela ainda não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spacepoints' AND column_name = 'polo') THEN
        ALTER TABLE spacepoints ADD COLUMN polo TEXT;
    END IF;
END $$;
