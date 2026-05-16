const pool = require('./db');
const bcrypt = require('bcrypt');

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('Uso: node create_user.js <usuario> <cedula> <contraseña>');
  console.log('Ejemplo: node create_user.js Gregory 17782424 grego2511');
  process.exit(1);
}

const [usuario, cedula, password] = args;

async function createUser() {
  try {
    // 1. Verificar si el usuario o cédula ya existen
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE usuario = ? OR cedula = ?', [usuario, cedula]);
    if (rows.length > 0) {
      console.log('❌ Error: El nombre de usuario o la cédula ya están registrados en la base de datos.');
      process.exit(1);
    }

    // 2. Encriptar la contraseña
    const passwordHash = await bcrypt.hash(password, 10);
    
    // 3. Crear formato JSON vacío para las preguntas de seguridad
    const emptyQuestions = JSON.stringify([]);
    const emptyHashes = JSON.stringify([]);

    // 4. Insertar el usuario
    await pool.query(
      'INSERT INTO usuarios (usuario, cedula, password_hash, pregunta_seguridad, respuesta_hash) VALUES (?, ?, ?, ?, ?)',
      [usuario, cedula, passwordHash, emptyQuestions, emptyHashes]
    );

    console.log(`✅ ¡Éxito! El usuario "${usuario}" ha sido creado correctamente.`);
    console.log(`🔑 Cédula: ${cedula} | Contraseña: ${password}`);
    console.log('Nota: El usuario deberá configurar sus preguntas de seguridad y correo al iniciar sesión.');

  } catch (err) {
    console.error('❌ Error al crear usuario:', err.message);
  } finally {
    process.exit(0);
  }
}

createUser();
