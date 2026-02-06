
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'mysecretpassword',
  port: 5432,
});

const SALT_ROUNDS = 10;

async function createSuperadmin() {
  const client = await pool.connect();
  try {
    const email = 'superadmin@virtuafinance.com';
    const plainPassword = 'superadmin';

    // Check if user already exists
    const userResult = await client.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    if (userResult.rows.length > 0) {
      console.log(`Usuário com o email ${email} já existe.`);
      // Optionally, update the existing user to be a superadmin
      const existingUser = userResult.rows[0];
      if (existingUser.funcao !== 'Superadmin') {
        await client.query("UPDATE usuarios SET funcao = 'Superadmin' WHERE id = $1", [existingUser.id]);
        console.log(`Usuário ${email} foi atualizado para Superadmin.`);
      }
      return;
    }

    // Create the user if they don't exist
    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    const newId = uuidv4();
    
    await client.query(
      'INSERT INTO usuarios (id, nome, email, senha, funcao, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [newId, 'Super Admin', email, hashedPassword, 'Superadmin', 'ativo']
    );

    console.log(`SUPERADMIN-CRIADO-COM-SUCESSO`);
    console.log(`EMAIL:${email}`);
    console.log(`SENHA:${plainPassword}`);

  } catch (error) {
    console.error('Falha ao criar o superadmin:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createSuperadmin();
