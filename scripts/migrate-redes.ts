import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('==========================================');
        console.log('ADDING WHATSAPP DEFAULTS TO REDES TABLE');
        console.log('==========================================');

        const sql = `
            ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE;
            ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_api_url TEXT;
            ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_api_token TEXT;
            ALTER TABLE redes ADD COLUMN IF NOT EXISTS whatsapp_chatwoot_config JSONB DEFAULT '{}'::jsonb;
        `;

        console.log('[1/1] Altering table redes...');
        await client.query(sql);

        console.log('==========================================');
        console.log('SUCCESS! Columns added to redes table.');
        console.log('==========================================');
    } catch (error) {
        console.error('==========================================');
        console.error('ERROR! Failed to alter table redes.');
        console.error(error);
        console.error('==========================================');
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
