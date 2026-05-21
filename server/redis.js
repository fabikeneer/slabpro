const { createClient } = require('redis');
require('dotenv').config();

const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.error('[ERROR] Redis Client Error:', err));
redisClient.on('connect', () => console.log('[OK] Conectado a Redis'));

// Conectar inmediatamente
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('[ERROR] Fallo al conectar con Redis:', error.message);
  }
})();

module.exports = redisClient;
