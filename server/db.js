// db.js — Conexión a MySQL con mysql2 y pool de conexiones
const mysql = require('mysql2/promise');
require('dotenv').config();

const useSsl = process.env.DB_SSL === 'true';

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'slabpro_bd',
  port:     parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  ...(useSsl && { ssl: { rejectUnauthorized: true } }),
});

// Verificar conexión al iniciar
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('[OK] Conectado a MySQL — Base de datos: slabpro_bd');
    conn.release();
  } catch (err) {
    console.error('[ERROR] Error de conexión a MySQL:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;
