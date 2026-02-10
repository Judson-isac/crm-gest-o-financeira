
#!/usr/bin / env node
const { Pool } = require('pg');

// Use a connection string from environment if available, or default to localhost
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/financeiro_crm';

const pool = new Pool({ connectionString });

async function run() {
    console.log('--- Iniciando Correção do Banco de Dados ---');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('1. Verificando/Criando coluna "tipoCursoId" na tabela "cursos"...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cursos' AND column_name='tipoCursoId') THEN
                    ALTER TABLE cursos ADD COLUMN "tipoCursoId" UUID;
                    RAISE NOTICE 'Coluna "tipoCursoId" adicionada.';
                ELSE
                    RAISE NOTICE 'Coluna "tipoCursoId" já existe.';
                END IF;
            END $$;
        `);

        console.log('2. Limpando duplicatas na tabela "tipos_curso" para garantir unicidade...');
        await client.query(`
            DELETE FROM tipos_curso tc1
            WHERE tc1.id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY nome, "redeId" ORDER BY id) as row_num
                    FROM tipos_curso
                ) t WHERE t.row_num > 1
            );
        `);

        console.log('3. Verificando/Criando constraint UNIQUE na tabela "tipos_curso"...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conrelid = 'tipos_curso'::regclass 
                    AND conname = 'tipos_curso_nome_redeId_key'
                ) THEN
                    ALTER TABLE tipos_curso ADD CONSTRAINT tipos_curso_nome_redeId_key UNIQUE (nome, "redeId");
                    RAISE NOTICE 'Constraint UNIQUE adicionada.';
                ELSE
                    RAISE NOTICE 'Constraint UNIQUE já existe.';
                END IF;
            END $$;
        `);

        await client.query('COMMIT');
        console.log('--- Correção concluída com sucesso! ---');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('!!! Erro ao executar correção:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
