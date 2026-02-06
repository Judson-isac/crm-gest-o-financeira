DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cursos' AND column_name = 'redeid'
    ) THEN
        ALTER TABLE cursos RENAME COLUMN redeid TO "redeId";
    END IF;
    
    -- Ensure constraints exist
    ALTER TABLE cursos DROP CONSTRAINT IF EXISTS cursos_sigla_rede_key;
    ALTER TABLE cursos ADD CONSTRAINT cursos_sigla_rede_key UNIQUE (sigla, "redeId");
END $$;
