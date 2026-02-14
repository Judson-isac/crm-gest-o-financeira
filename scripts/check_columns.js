const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'mysecretpassword',
    port: 5432,
});

async function checkColumns() {
    const client = await pool.connect();
    try {
        console.log('Checking columns for whatsapp_instances...');
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'whatsapp_instances'
        `);
        console.log('Columns:');
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });
    } catch (err) {
        console.error('Error checking columns:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkColumns();
