const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Verificando coluna avatarUrl na tabela usuarios...');
        const checkColumnQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'usuarios' AND column_name = 'avatarUrl';
        `;
        const res = await client.query(checkColumnQuery);

        if (res.rows.length === 0) {
            console.log('Adicionando coluna avatarUrl...');
            await client.query('ALTER TABLE usuarios ADD COLUMN "avatarUrl" TEXT;');
            console.log('Coluna avatarUrl adicionada com sucesso.');
        } else {
            console.log('A coluna avatarUrl já existe.');
        }
    } catch (err) {
        console.error('Erro na migração:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
