const express = require('express');
const router = express.Router();
const db = require('../db'); // Pool de conexión

// GET: Obtener datos
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM configuracion_empresa LIMIT 1');
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontró la configuración' });
    }
    res.json({ success: true, data: rows[0] });
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
    res.json({ success: true, message: 'Configuración actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar la configuración' });
  }
});

module.exports = router;
