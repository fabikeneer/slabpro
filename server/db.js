// db.js — Conexión a MySQL con mysql2 y pool de conexiones
const mysql = require('mysql2/promise');
require('dotenv').config();

const useSsl = process.env.DB_SSL === 'true';
const dbName = process.env.DB_NAME || 'slabpro_bd';

let dbConnected = false;

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`[FATAL] Falta la variable de entorno: ${key}`);
  }
}

console.log('[INFO] Config DB:', {
  host: process.env.DB_HOST || '(vacío)',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || '(vacío)',
  database: dbName,
  ssl: useSsl,
});

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
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
    },
  }),
});

function logDbError(err) {
  console.error('[ERROR] MySQL:', err.message || err);
  if (err.code) console.error('  code:', err.code);
}

async function verifyConnection() {
  const conn = await pool.getConnection();
  conn.release();
  dbConnected = true;
  console.log(`[OK] Conectado a MySQL — Base de datos: ${dbName}`);
}

// Reintentos en segundo plano (no tumbar el proceso → evita 502 en Render)
async function connectWithRetry() {
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await verifyConnection();
      return;
    } catch (err) {
      dbConnected = false;
      logDbError(err);
      if (attempt < maxAttempts) {
        console.log(`[INFO] Reintento MySQL ${attempt + 1}/${maxAttempts} en 5s...`);
        await new Promise((r) => setTimeout(r, 5000));
      } else {
        console.error('[WARN] MySQL no disponible. API arriba; revisa TiDB IP 0.0.0.0/0 y DB_HOST.');
      }
    }
  }
}

connectWithRetry();

function isDbConnected() {
  return dbConnected;
}

module.exports = pool;
module.exports.isDbConnected = isDbConnected;
