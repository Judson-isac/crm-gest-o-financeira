
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'mysecretpassword',
  port: 5432,
});

const SALT_ROUNDS = 10;

async function resetAdminPassword() {
  const client = await pool.connect();
  try {
    // Use the correct role name found in the previous step
    const userResult = await client.query("SELECT * FROM usuarios WHERE funcao = 'Administrador' LIMIT 1");
    const user = userResult.rows[0];

    if (!user) {
      console.log('Usuário Administrador não encontrado.');
      return;
    }

    const newPassword = 'admin123'; // A new, simple, temporary password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await client.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [hashedPassword, user.id]);

    console.log(`SENHA-RESETADA-COM-SUCESSO`);
    console.log(`EMAIL:${user.email}`);
    console.log(`SENHA:${newPassword}`);

  } catch (error) {
    console.error('Falha ao redefinir a senha do administrador:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

resetAdminPassword();
