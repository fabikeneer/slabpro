const pool = require('./db');
const bcrypt = require('bcrypt');

async function force() {
  try {
    const passwordHash = await bcrypt.hash('admin', 10);
    const respuestaHash = await bcrypt.hash('azul', 10);
    
    // 1. Verificar qué hay en la base de datos actualmente
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE usuario = ?', ['admin']);
    console.log('Estado actual en BD antes de forzar:', rows.length > 0 ? 'Admin existe' : 'Admin NO existe');

    // 2. Eliminar admin anterior si existe
    await pool.query('DELETE FROM usuarios WHERE usuario = ?', ['admin']);
    
    // 3. Insertar nuevo admin garantizado
    await pool.query(
      'INSERT INTO usuarios (usuario, password_hash, pregunta_seguridad, respuesta_hash) VALUES (?, ?, ?, ?)',
      ['admin', passwordHash, '¿Cuál es tu color favorito?', respuestaHash]
    );
    console.log('[EXITO] Usuario admin ha sido re-creado con éxito.');
    console.log('[INFO] Credenciales => Usuario: admin | Contraseña: admin');
  } catch (err) {
    console.error('[ERROR] forcing admin:', err);
  } finally {
    process.exit(0);
  }
}
force();
