const authService = require('./services/authService');
const pool = require('./db');
const bcrypt = require('bcrypt');

async function fix() {
  try {
    const passwordHash = await bcrypt.hash('admin', 10);
    const respuestaHash = await bcrypt.hash('azul', 10);
    await pool.query('UPDATE usuarios SET password_hash = ?, respuesta_hash = ? WHERE usuario = ?', [passwordHash, respuestaHash, 'admin']);
    console.log('Admin password and security question fixed!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
fix();
