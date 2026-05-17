// db.js — Conexión a MySQL con mysql2 y pool de conexiones
const mysql = require('mysql2/promise');
require('dotenv').config();

const useSsl = process.env.DB_SSL === 'true';
const dbName = process.env.DB_NAME || 'slabpro_bd';

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: dbName,
  port:     parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  connectTimeout:     30000,
  ...(useSsl && {
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    },
  }),
});

function logDbError(err) {
  console.error('[ERROR] Error de conexión a MySQL:', err.message || err);
  if (err.code) console.error('  code:', err.code);
  if (err.errno) console.error('  errno:', err.errno);
  console.error('  host:', process.env.DB_HOST, 'port:', process.env.DB_PORT, 'db:', dbName, 'ssl:', useSsl);
}

// Verificar conexión al iniciar (reintentos para TiDB / Render)
(async () => {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const conn = await pool.getConnection();
      console.log(`[OK] Conectado a MySQL — Base de datos: ${dbName}`);
      conn.release();
      return;
    } catch (err) {
      logDbError(err);
      if (attempt < maxAttempts) {
        console.log(`[INFO] Reintento ${attempt + 1}/${maxAttempts} en 3s...`);
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        console.error('[FATAL] Revisa en TiDB: IP allowlist (0.0.0.0/0), DB_PORT=4000, DB_SSL=true, credenciales.');
        process.exit(1);
      }
    }
  }
})();

module.exports = pool;
