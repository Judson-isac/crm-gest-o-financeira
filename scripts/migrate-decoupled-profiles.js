const { Pool } = require('pg');
require('dotenv').config();

const config = process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'mysecretpassword',
    database: process.env.PGDATABASE || 'postgres',
};

const pool = new Pool(config);

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('--- MIGRATIDNG TO DECOUPLED PROFILES ---');

        // 1. WhatsApp Profiles Table
        console.log('Ensuring whatsapp_profiles exists...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_profiles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                api_url TEXT,
                api_token TEXT,
                chatwoot_config JSONB,
                type TEXT DEFAULT 'both',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Checking for type column...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_profiles' AND column_name='type') THEN
                    ALTER TABLE whatsapp_profiles ADD COLUMN type TEXT DEFAULT 'both';
                END IF;
            END $$;
        `);

        // 2. Redes Table
        console.log('Updating redes table columns...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='redes' AND column_name='whatsapp_evolution_profile_id') THEN
                    ALTER TABLE redes ADD COLUMN whatsapp_evolution_profile_id TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='redes' AND column_name='whatsapp_chatwoot_profile_id') THEN
                    ALTER TABLE redes ADD COLUMN whatsapp_chatwoot_profile_id TEXT;
                END IF;
            END $$;
        `);

        // 3. Data Migration (Copy legacy profile_id to new columns)
        console.log('Migrating legacy data if possible...');
        const legacyCheck = await client.query(`
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='redes' AND column_name='whatsapp_profile_id'
        `);

        if (legacyCheck.rows.length > 0) {
            await client.query(`
                UPDATE redes 
                SET whatsapp_evolution_profile_id = whatsapp_profile_id,
                    whatsapp_chatwoot_profile_id = whatsapp_profile_id
                WHERE whatsapp_profile_id IS NOT NULL 
                AND whatsapp_evolution_profile_id IS NULL;
            `);
            console.log('Legacy data migrated.');
        } else {
            console.log('No legacy whatsapp_profile_id found, skipping data migration.');
        }

        console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
