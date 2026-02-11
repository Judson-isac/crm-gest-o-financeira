
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function check() {
    const client = await pool.connect();
    try {
        console.log('--- Processos Seletivos ---');
        const res = await client.query('SELECT numero, ano, "dataInicial", "dataFinal" FROM processos_seletivos WHERE numero = 51 AND ano = 2026');
        console.table(res.rows);

        console.log('\n--- Spacepoints (Weeks) for this process ---');
        const res2 = await client.query('SELECT "numeroSpace", "dataSpace" FROM spacepoints WHERE "processoSeletivo" IN (SELECT id FROM processos_seletivos WHERE numero = 51 AND ano = 2026) ORDER BY "dataSpace"');
        console.table(res2.rows);
    } finally {
        client.release();
        await pool.end();
    }
}

check().catch(console.error);
