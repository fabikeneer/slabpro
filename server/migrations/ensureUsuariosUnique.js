const pool = require('../db');

async function indexExists(indexName) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'usuarios'
       AND INDEX_NAME = ?
     LIMIT 1`,
    [indexName]
  );
  return rows.length > 0;
}

async function findDuplicates(column, normalizeLower = false) {
  const expr = normalizeLower ? `LOWER(TRIM(${column}))` : column;
  const [rows] = await pool.query(
    `SELECT ${expr} AS val, COUNT(*) AS total
     FROM usuarios
     WHERE ${column} IS NOT NULL AND TRIM(${column}) != ''
     GROUP BY ${expr}
     HAVING total > 1`
  );
  return rows;
}

async function ensureUsuariosUnique() {
  try {
    if (!(await indexExists('uk_usuarios_cedula'))) {
      const dupCedula = await findDuplicates('cedula');
      if (dupCedula.length > 0) {
        console.warn('[WARN] Cédulas duplicadas en usuarios; no se aplicó índice único:', dupCedula);
      } else {
        await pool.query('CREATE UNIQUE INDEX uk_usuarios_cedula ON usuarios (cedula)');
        console.log('[OK] Índice único uk_usuarios_cedula en usuarios.cedula');
      }
    }

    if (!(await indexExists('uk_usuarios_email'))) {
      const dupEmail = await findDuplicates('email', true);
      if (dupEmail.length > 0) {
        console.warn('[WARN] Correos duplicados en usuarios; no se aplicó índice único:', dupEmail);
      } else {
        await pool.query('CREATE UNIQUE INDEX uk_usuarios_email ON usuarios (email)');
        console.log('[OK] Índice único uk_usuarios_email en usuarios.email');
      }
    }
  } catch (err) {
    console.warn('[WARN] ensureUsuariosUnique:', err.message);
  }
}

module.exports = ensureUsuariosUnique;
