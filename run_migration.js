const pool = require('./server/db');

async function runMigration() {
  try {
    console.log('Iniciando migración...');
    
    try {
      await pool.query('ALTER TABLE usuarios ADD COLUMN email VARCHAR(150) DEFAULT NULL AFTER usuario');
      console.log('Columna email agregada.');
    } catch (e) {
      console.log('Columna email ya existe o error:', e.message);
    }
    
    await pool.query('ALTER TABLE usuarios MODIFY COLUMN pregunta_seguridad TEXT NOT NULL');
    await pool.query('ALTER TABLE usuarios MODIFY COLUMN respuesta_hash TEXT NOT NULL');
    
    await pool.query(`UPDATE usuarios SET pregunta_seguridad = CONCAT('["', REPLACE(pregunta_seguridad, '"', '\\\\\"'), '"]') WHERE pregunta_seguridad NOT LIKE '[%'`);
    await pool.query(`UPDATE usuarios SET respuesta_hash = CONCAT('["', REPLACE(respuesta_hash, '"', '\\\\\"'), '"]') WHERE respuesta_hash NOT LIKE '[%'`);
    
    console.log('Migración completada exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('Error en la migración:', err);
    process.exit(1);
  }
}

runMigration();
