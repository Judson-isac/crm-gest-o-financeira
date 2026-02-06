
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432', 10),
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Creating system_config table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_config (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT
            );
        `);
        console.log('Table created.');

        // Seed default values
        console.log('Seeding default values...');
        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_NAME', 'VirtuaFinance') ON CONFLICT (key) DO NOTHING;
        `);
        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO', '') ON CONFLICT (key) DO NOTHING;
        `);
        console.log('Seeded.');

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
