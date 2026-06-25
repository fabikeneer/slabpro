const redisClient = require('../redis');
const { PREFIX } = require('./cacheKeys');

/**
 * Obtiene datos de la caché o los busca usando la función proporcionada.
 */
async function getOrSetCache(key, ttlSeconds, fetchFunction) {
  try {
    if (!redisClient.isOpen) {
      return await fetchFunction();
    }

    const cachedData = await Promise.race([
      redisClient.get(key),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 3000)
      ),
    ]);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const data = await fetchFunction();

    if (data !== undefined && data !== null) {
      redisClient.setEx(key, ttlSeconds, JSON.stringify(data)).catch(() => {});
    }

    return data;
  } catch (error) {
    console.warn(`[WARN] Caché falló para ${key}, usando DB:`, error.message);
    return await fetchFunction();
  }
}

async function invalidateCache(key) {
  try {
    if (redisClient.isOpen) {
      await redisClient.del(key);
    }
  } catch (error) {
    console.error(`[ERROR] No se pudo invalidar la caché para ${key}:`, error.message);
  }
}

/** Borra todas las claves que empiezan con el prefijo (ej. sp:pres:) */
async function invalidateByPrefix(prefix) {
  if (!redisClient.isOpen || !prefix) return;
  try {
    const toDelete = [];
    for await (const key of redisClient.scanIterator({ MATCH: `${prefix}*`, COUNT: 50 })) {
      toDelete.push(key);
      if (toDelete.length >= 100) {
        await redisClient.del(toDelete);
        toDelete.length = 0;
      }
    }
    if (toDelete.length) await redisClient.del(toDelete);
  } catch (error) {
    console.warn(`[WARN] invalidateByPrefix ${prefix}:`, error.message);
  }
}

async function invalidateByPrefixes(prefixes) {
  await Promise.all(prefixes.map((p) => invalidateByPrefix(p)));
}

/** Invalidar tras cambios en presupuestos */
async function invalidatePresupuestos() {
  await invalidateByPrefixes([PREFIX.dashboard, PREFIX.presupuestos]);
}

/** Invalidar tras cambios en proyectos */
async function invalidateProyectos() {
  await invalidateByPrefixes([PREFIX.dashboard, PREFIX.proyectos, PREFIX.nomina]);
}

/** Invalidar tras cambios en gastos */
async function invalidateGastos() {
  await invalidateByPrefixes([PREFIX.dashboard, PREFIX.gastos]);
}

/** Invalidar tras cambios en nómina (también afecta gastos y dashboard) */
async function invalidateNomina() {
  await invalidateByPrefixes([PREFIX.dashboard, PREFIX.gastos, PREFIX.nomina]);
}

/** Invalidar tras cambios en clientes */
async function invalidateClientes() {
  await invalidateByPrefixes([PREFIX.clientes, PREFIX.presupuestos]);
}


module.exports = {
  getOrSetCache,
  invalidateCache,
  invalidateByPrefix,
  invalidateByPrefixes,
  invalidatePresupuestos,
  invalidateProyectos,
  invalidateGastos,
  invalidateNomina,
  invalidateClientes,
};
