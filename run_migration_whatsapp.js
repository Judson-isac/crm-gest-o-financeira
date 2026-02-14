const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432', 10),
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Iniciando migração do WhatsApp...');
        const migrationPath = path.join(__dirname, 'migration_whatsapp.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await client.query(sql);
        console.log('Migração concluída com sucesso!');
    } catch (e) {
        console.error('Falha na migração:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
