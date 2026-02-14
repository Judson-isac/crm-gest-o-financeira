const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'mysecretpassword',
    port: 5432,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Running migration...');
        await client.query('ALTER TABLE whatsapp_instances ADD COLUMN IF NOT EXISTS "profileName" TEXT;');
        console.log('Migration successful: profileName column added.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
