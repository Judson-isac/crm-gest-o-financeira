const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'postgres',
    password: process.env.PGPASSWORD || 'mysecretpassword',
    port: parseInt(process.env.PGPORT || '5432', 10),
});

async function runhelper() {
    const client = await pool.connect();
    try {
        console.log('Running migration...');
        await client.query('ALTER TABLE funcoes ADD COLUMN "verRanking" BOOLEAN DEFAULT FALSE;');
        await client.query("UPDATE funcoes SET \"verRanking\" = TRUE WHERE nome = 'Administrador' OR nome = 'Superadmin';");
        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

runhelper();
