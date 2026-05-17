const pool = require('./server/db');
const ensureUsuariosUnique = require('./server/migrations/ensureUsuariosUnique');

async function run() {
  try {
    console.log('Aplicando índices únicos en usuarios (cédula y correo)...');
    await ensureUsuariosUnique();
    console.log('Listo.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
