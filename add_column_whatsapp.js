const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432', 10),
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query('ALTER TABLE whatsapp_instances ADD COLUMN "apiUrl" TEXT;');
        console.log('Coluna apiUrl adicionada com sucesso.');
    } catch (e) {
        console.error('Falha ao adicionar coluna:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
