require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'mysecretpassword',
    database: process.env.PGDATABASE || 'postgres',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('--- Inciando migração: redeId nullable ---');

        // Check if column exists first
        const checkRes = await client.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_instances' AND column_name = 'redeId'
    `);

        if (checkRes.rows.length > 0) {
            if (checkRes.rows[0].is_nullable === 'NO') {
                console.log('Alterando "redeId" para ser NULLABLE...');
                await client.query('ALTER TABLE whatsapp_instances ALTER COLUMN "redeId" DROP NOT NULL');
                console.log('Sucesso!');
            } else {
                console.log('A coluna "redeId" já é NULLABLE.');
            }
        } else {
            console.log('Erro: Coluna "redeId" não encontrada na tabela whatsapp_instances.');
        }

    } catch (err) {
        console.error('Erro na migração:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
