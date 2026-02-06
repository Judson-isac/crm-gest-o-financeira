
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
        console.log('Adding polos column to usuarios table...');
        await client.query(`
            ALTER TABLE usuarios 
            ADD COLUMN IF NOT EXISTS polos TEXT[] DEFAULT '{}';
        `);
        console.log('Column added.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}
migrate();
