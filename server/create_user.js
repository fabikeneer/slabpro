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
    const cedulaNorm = String(cedula).trim();
    if (!cedulaNorm) {
      console.log('❌ Error: La cédula es obligatoria.');
      process.exit(1);
    }

    // 1. Verificar unicidad de usuario y cédula
    const [byUsuario] = await pool.query('SELECT id FROM usuarios WHERE usuario = ? LIMIT 1', [usuario]);
    if (byUsuario.length > 0) {
      console.log('❌ Error: El nombre de usuario ya está registrado.');
      process.exit(1);
    }

    const [byCedula] = await pool.query('SELECT id FROM usuarios WHERE cedula = ? LIMIT 1', [cedulaNorm]);
    if (byCedula.length > 0) {
      console.log('❌ Error: La cédula ya está registrada en otro usuario.');
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
      [usuario, cedulaNorm, passwordHash, emptyQuestions, emptyHashes]
    );

    console.log(`✅ ¡Éxito! El usuario "${usuario}" ha sido creado correctamente.`);
    console.log(`🔑 Cédula: ${cedulaNorm} | Contraseña: ${password}`);
    console.log('Nota: El usuario deberá configurar sus preguntas de seguridad y correo al iniciar sesión.');

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.message.includes('uk_usuarios_cedula') || err.message.includes('cedula')) {
        console.error('❌ Error: La cédula ya está registrada en otro usuario.');
      } else if (err.message.includes('uk_usuarios_email') || err.message.includes('email')) {
        console.error('❌ Error: El correo ya está registrado en otro usuario.');
      } else {
        console.error('❌ Error: Usuario, cédula o correo duplicado.');
      }
    } else {
      console.error('❌ Error al crear usuario:', err.message);
    }
  } finally {
    process.exit(0);
  }
}

createUser();
