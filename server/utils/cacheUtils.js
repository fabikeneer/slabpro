const redisClient = require('../redis');

/**
 * Obtiene datos de la caché o los busca usando la función proporcionada.
 * @param {string} key - Clave única en Redis (ej. 'config:empresa')
 * @param {number} ttlSeconds - Tiempo de vida en segundos (ej. 3600 = 1 hora)
 * @param {function} fetchFunction - Función asíncrona para buscar en la BD si no hay caché
 */
async function getOrSetCache(key, ttlSeconds, fetchFunction) {
  try {
    if (!redisClient.isOpen) {
        console.warn(`[WARN] Redis cerrado, obteniendo datos de DB para key ${key}`);
        return await fetchFunction();
    }

    // 1. Intentar obtener de Redis
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // 2. Si no está en caché, ejecutar la función que consulta a la BD
    const data = await fetchFunction();

    // 3. Si hay datos, guardarlos en Redis con el TTL especificado
    if (data) {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
    }

    return data;
  } catch (error) {
    console.error(`[ERROR] Falló la caché para ${key}:`, error);
    // Fallback de seguridad
    return await fetchFunction();
  }
}

/**
 * Invalida (borra) una clave de la caché
 */
async function invalidateCache(key) {
  try {
    if (redisClient.isOpen) {
      await redisClient.del(key);
    }
  } catch (error) {
    console.error(`[ERROR] No se pudo invalidar la caché para ${key}:`, error);
  }
}

module.exports = { getOrSetCache, invalidateCache };
