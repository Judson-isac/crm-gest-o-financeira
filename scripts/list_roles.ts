
import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'mysecretpassword',
  port: 5432,
});

async function listUserRoles() {
  const client = await pool.connect();
  try {
    console.log('Buscando funções de usuário no banco de dados...');
    const result = await client.query('SELECT DISTINCT funcao FROM usuarios');
    
    if (result.rows.length === 0) {
      console.log('Nenhuma função encontrada na tabela de usuários.');
      return;
    }

    console.log('Funções encontradas:');
    result.rows.forEach(row => {
      console.log(`- "${row.funcao}"`);
    });

  } catch (error) {
    console.error('Falha ao buscar as funções:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

listUserRoles();
