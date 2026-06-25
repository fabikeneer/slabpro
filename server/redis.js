const { createClient } = require('redis');
require('dotenv').config();

const REDIS_URL = (process.env.REDIS_URL || '').trim();

const noopClient = {
  isOpen: false,
  async get() { return null; },
  async setEx() {},
  async del() {},
  async quit() {},
};

let redisClient = noopClient;

if (REDIS_URL) {
  const client = createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => (retries > 2 ? false : retries * 500),
    },
    disableOfflineQueue: true,
  });

  client.on('error', (err) => console.error('[ERROR] Redis:', err.message));
  client.on('connect', () => console.log('[OK] Conectado a Redis'));

  redisClient = client;

  client.connect()
    .then(() => console.log('[OK] Redis conectado'))
    .catch((error) => {
      console.warn('[WARN] Redis no disponible, usando solo MySQL:', error.message);
    });
} else {
  console.log('[INFO] REDIS_URL no definido — caché desactivada (solo MySQL)');
}

module.exports = redisClient;
