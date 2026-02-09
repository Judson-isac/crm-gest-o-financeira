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
        const sql = fs.readFileSync(path.join(__dirname, 'migration_spacepoint_dynamic.sql'), 'utf8');
        console.log('Running migration...');
        await client.query(sql);
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Error running migration:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
