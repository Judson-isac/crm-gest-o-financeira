const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Running migration_spacepoint_refactor...');
        const sql = fs.readFileSync(path.join(__dirname, 'migration_spacepoint_refactor.sql'), 'utf8');
        await client.query(sql);
        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
