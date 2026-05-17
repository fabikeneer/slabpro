// routes/proyectos.js — CRUD adaptado al esquema REAL de la tabla proyectos
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// Esquema real de la tabla:
//   id_proyecto (PK auto), nombre_proyecto VARCHAR(200), nombre_cliente VARCHAR(100), rif_cedula VARCHAR(20),
//   descripcion_obra TEXT, fecha_inicio TIMESTAMP, estatus VARCHAR(50), tasa_bcv DECIMAL(10,2), monto_usd DECIMAL(12,2)

(async function initDB() {
  try {
    const [cols] = await db.query('SHOW COLUMNS FROM proyectos');
    const colNames = cols.map(c => c.Field);
    
    if (!colNames.includes('nombre_proyecto')) {
      await db.query('ALTER TABLE proyectos ADD COLUMN nombre_proyecto VARCHAR(200) AFTER id_proyecto');
    }
    if (!colNames.includes('monto_usd')) {
      await db.query('ALTER TABLE proyectos ADD COLUMN monto_usd DECIMAL(12,2)');
    }
    await db.query('ALTER TABLE proyectos MODIFY COLUMN estatus VARCHAR(50)');
  } catch (err) {
    console.error('Error al inicializar schema de proyectos:', err);
  }
})();

// ─────────────────────────────────────────────────────────────
// GET /api/proyectos  → Listar todos
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM proyectos
      ORDER BY fecha_inicio DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error GET /proyectos:', err);
    res.status(500).json({ success: false, message: 'Error al obtener proyectos.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/proyectos/activos  → Solo Activo + En Proceso
// (Para el dropdown de Nómina)
// ─────────────────────────────────────────────────────────────
router.get('/activos', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id_proyecto AS id,
        COALESCE(nombre_proyecto, nombre_cliente) AS nombre,
        estatus
      FROM proyectos
      WHERE estatus IN ('Activo', 'En Proceso')
      ORDER BY nombre ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error GET /proyectos/activos:', err);
    res.status(500).json({ success: false, message: 'Error al obtener proyectos activos.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/proyectos/:id/ficha  → Ficha completa con pagos
// IMPORTANTE: debe ir ANTES de /:id para que Express no capture 'ficha' como id
// ─────────────────────────────────────────────────────────────
router.get('/:id/ficha', async (req, res) => {
  try {
    const { id } = req.params;

    const [[proyecto]] = await db.query(
      'SELECT * FROM proyectos WHERE id_proyecto = ?', [id]
    );

    if (!proyecto) {
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    }

    // Pagos de nómina asociados
    const [pagos] = await db.query(`
      SELECT
        pn.id_pago,
        pn.fecha_pago,
        pn.concepto,
        pn.monto_usd,
        pn.monto_bs,
        pn.tasa_dia,
        COALESCE(e.nombre, pn.beneficiario, 'Externo') AS trabajador,
        COALESCE(e.rol, 'Externo') AS rol
      FROM pagos_nomina pn
      LEFT JOIN empleados e ON pn.id_empleado = e.id
      WHERE pn.id_proyecto = ?
      ORDER BY pn.fecha_pago DESC
    `, [id]);

    const totalNomina = pagos.reduce((acc, p) => acc + (parseFloat(p.monto_usd) || 0), 0);

    res.json({
      success: true,
      data: {
        proyecto,
        pagos,
        resumen: {
          total_pagos:         pagos.length,
          costo_mano_obra_usd: totalNomina,
        }
      }
    });
  } catch (err) {
    console.error('Error GET /proyectos/:id/ficha:', err);
    res.status(500).json({ success: false, message: 'Error al obtener la ficha del proyecto.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/proyectos/:id  → Obtener uno por ID
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'activos') return res.status(404).json({ success: false, message: 'Not found' });

    const [[proyecto]] = await db.query(
      'SELECT * FROM proyectos WHERE id_proyecto = ?', [id]
    );

    if (!proyecto) {
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    }

    res.json({ success: true, data: proyecto });
  } catch (err) {
    console.error('Error GET /proyectos/:id:', err);
    res.status(500).json({ success: false, message: 'Error al obtener el proyecto.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/proyectos  → Crear proyecto
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      nombre_proyecto,
      nombre_cliente,
      rif_cedula,
      descripcion_obra,
      estatus,
      fecha_inicio,
      monto_usd,
    } = req.body;

    if (!nombre_proyecto || !nombre_cliente) {
      return res.status(400).json({ success: false, message: 'El nombre del proyecto y del cliente son obligatorios.' });
    }

    const estatusValidos = ['Activo', 'En Proceso', 'Finalizado'];
    const estatusFinal   = estatusValidos.includes(estatus) ? estatus : 'Activo';

    const fechaFinal = fecha_inicio || new Date().toISOString().split('T')[0];

    const [result] = await db.query(`
      INSERT INTO proyectos
        (nombre_proyecto, nombre_cliente, rif_cedula, descripcion_obra, estatus, fecha_inicio, monto_usd)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      nombre_proyecto,
      nombre_cliente,
      rif_cedula       || null,
      descripcion_obra || null,
      estatusFinal,
      fechaFinal,
      monto_usd        || null,
    ]);

    res.status(201).json({
      success: true,
      message: `Proyecto "${nombre_proyecto}" creado exitosamente.`,
      data: { id_proyecto: result.insertId }
    });
  } catch (err) {
    console.error('Error POST /proyectos:', err);
    res.status(500).json({ success: false, message: 'Error al crear el proyecto.' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/proyectos/:id  → Editar proyecto
// ─────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre_proyecto,
      nombre_cliente,
      rif_cedula,
      descripcion_obra,
      estatus,
      fecha_inicio,
      monto_usd,
    } = req.body;

    const [[existe]] = await db.query(
      'SELECT id_proyecto FROM proyectos WHERE id_proyecto = ?', [id]
    );
    if (!existe) {
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    }

    const estatusValidos = ['Activo', 'En Proceso', 'Finalizado'];
    const estatusFinal   = estatusValidos.includes(estatus) ? estatus : 'Activo';

    await db.query(`
      UPDATE proyectos SET
        nombre_proyecto = ?,
        nombre_cliente  = ?,
        rif_cedula      = ?,
        descripcion_obra = ?,
        estatus         = ?,
        fecha_inicio    = ?,
        monto_usd       = ?
      WHERE id_proyecto = ?
    `, [
      nombre_proyecto,
      nombre_cliente,
      rif_cedula       || null,
      descripcion_obra || null,
      estatusFinal,
      fecha_inicio     || null,
      monto_usd        || null,
      id,
    ]);

    res.json({ success: true, message: 'Proyecto actualizado correctamente.' });
  } catch (err) {
    console.error('Error PUT /proyectos/:id:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar el proyecto.' });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/proyectos/:id/estado  → Cambiar estatus
// ─────────────────────────────────────────────────────────────
router.patch('/:id/estado', async (req, res) => {
  try {
    const { id }     = req.params;
    const { estado } = req.body;

    const estatusValidos = ['Activo', 'En Proceso', 'Finalizado'];
    if (!estatusValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Valores permitidos: ${estatusValidos.join(', ')}`,
      });
    }

    const [result] = await db.query(
      'UPDATE proyectos SET estatus = ? WHERE id_proyecto = ?',
      [estado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    }

    res.json({ success: true, message: `Estado actualizado a "${estado}".` });
  } catch (err) {
    console.error('Error PATCH /proyectos/:id/estado:', err);
    res.status(500).json({ success: false, message: 'Error al cambiar el estado.' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/proyectos/:id  → Eliminar proyecto
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Regla de negocio: no eliminar si tiene pagos
    const [pagos] = await db.query(
      'SELECT id_pago FROM pagos_nomina WHERE id_proyecto = ? LIMIT 1', [id]
    );
    if (pagos.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar: el proyecto tiene pagos de nómina registrados.',
      });
    }

    const [result] = await db.query('DELETE FROM proyectos WHERE id_proyecto = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    }

    res.json({ success: true, message: 'Proyecto eliminado correctamente.' });
  } catch (err) {
    console.error('Error DELETE /proyectos/:id:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar el proyecto.' });
  }
});

module.exports = router;
