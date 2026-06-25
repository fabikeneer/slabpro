const express = require('express');
const router = express.Router();
const db = require('../db'); // Pool de conexión

const { getOrSetCache, invalidateCache } = require('../utils/cacheUtils');
const { TTL, PREFIX } = require('../utils/cacheKeys');

const CONFIG_CACHE_KEY = PREFIX.config;

// GET: Obtener datos
router.get('/', async (req, res) => {
  try {
    const configData = await getOrSetCache(CONFIG_CACHE_KEY, TTL.CONFIG, async () => {
      const [rows] = await db.query('SELECT * FROM configuracion_empresa LIMIT 1');
      return rows.length > 0 ? rows[0] : null;
    });

    if (!configData) {
      return res.status(404).json({ success: false, message: 'No se encontró la configuración' });
    }
    
    res.json({ success: true, data: configData });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ success: false, message: 'Error en servidor' });
  }
});

// PUT: Actualizar datos
router.put('/', async (req, res) => {
  const { nombre_empresa, rif, direccion, telefono, email, logo_data, terminos_condiciones, tasa_cambio } = req.body;
  try {
    await db.query(
      `UPDATE configuracion_empresa SET 
      nombre_empresa = ?, rif = ?, direccion = ?, telefono = ?, email = ?, 
      logo_data = ?, terminos_condiciones = ?, tasa_cambio = ? 
      WHERE id = 1`,
      [nombre_empresa, rif, direccion, telefono, email, logo_data, terminos_condiciones, tasa_cambio]
    );
    
    // INVALIDAR la caché para que la próxima petición GET vuelva a consultar la BD actualizada
    await invalidateCache(CONFIG_CACHE_KEY);

    res.json({ success: true, message: 'Configuración actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar la configuración' });
  }
});

module.exports = router;
