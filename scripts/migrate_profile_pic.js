const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/crm_db',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Adding profilePicUrl column to whatsapp_instances...');
        await client.query(`
      ALTER TABLE whatsapp_instances 
      ADD COLUMN IF NOT EXISTS "profilePicUrl" TEXT;
    `);
        console.log('Migration successful!');
    } catch (err) {
        if (err.code === '42701') {
            console.log('Column profilePicUrl already exists.');
        } else {
            console.error('Migration failed:', err);
        }
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
stone
