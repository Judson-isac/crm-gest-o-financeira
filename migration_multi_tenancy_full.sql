DO $$
BEGIN
    -- campanhas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campanhas' AND column_name = 'redeId') THEN
        ALTER TABLE campanhas ADD COLUMN "redeId" text REFERENCES redes(id) ON DELETE CASCADE;
    END IF;

    -- canais
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canais' AND column_name = 'redeId') THEN
        ALTER TABLE canais ADD COLUMN "redeId" text REFERENCES redes(id) ON DELETE CASCADE;
    END IF;

    -- despesas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'despesas' AND column_name = 'redeId') THEN
        ALTER TABLE despesas ADD COLUMN "redeId" text REFERENCES redes(id) ON DELETE CASCADE;
    END IF;

    -- metas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metas' AND column_name = 'redeId') THEN
        ALTER TABLE metas ADD COLUMN "redeId" text REFERENCES redes(id) ON DELETE CASCADE;
    END IF;

    -- numeros_processo_seletivo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'numeros_processo_seletivo' AND column_name = 'redeId') THEN
        ALTER TABLE numeros_processo_seletivo ADD COLUMN "redeId" text REFERENCES redes(id) ON DELETE CASCADE;
    END IF;

    -- processos_seletivos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'processos_seletivos' AND column_name = 'redeId') THEN
        ALTER TABLE processos_seletivos ADD COLUMN "redeId" text REFERENCES redes(id) ON DELETE CASCADE;
    END IF;

    -- tipos_curso
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tipos_curso' AND column_name = 'redeId') THEN
        ALTER TABLE tipos_curso ADD COLUMN "redeId" text REFERENCES redes(id) ON DELETE CASCADE;
    END IF;
END $$;
