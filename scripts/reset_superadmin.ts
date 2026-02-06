
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

async function resetSuperadminPassword() {
  const client = await pool.connect();
  try {
    const userResult = await client.query("SELECT * FROM usuarios WHERE funcao = 'Superadmin' LIMIT 1");
    const user = userResult.rows[0];

    if (!user) {
      console.log('Usuário Superadmin não encontrado.');
      return;
    }

    const newPassword = 'superadmin';
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await client.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [hashedPassword, user.id]);

    console.log(`SENHA-RESETADA`);
    console.log(`EMAIL:${user.email}`);
    console.log(`SENHA:${newPassword}`);

  } catch (error) {
    console.error('Falha ao redefinir a senha do superadmin:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

resetSuperadminPassword();
