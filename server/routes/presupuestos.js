// routes/presupuestos.js — CRUD completo del Módulo de Presupuestos
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { getOrSetCache, invalidatePresupuestos, invalidateProyectos } = require('../utils/cacheUtils');
const { TTL, keys } = require('../utils/cacheKeys');

(async function initDB() {
  try {
    const [cols] = await db.query('SHOW COLUMNS FROM clientes');
    const colNames = cols.map(c => c.Field);
    if (!colNames.includes('rif')) {
      await db.query('ALTER TABLE clientes ADD COLUMN rif VARCHAR(50)');
    }
  } catch (err) {
    console.error('Error al inicializar schema de clientes:', err);
  }
})();

// ─────────────────────────────────────────────
// GET /api/presupuestos  → Listar todos
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const payload = await getOrSetCache(
      keys.presupuestosList(page, limit),
      TTL.LIST,
      async () => {
        const offset = (page - 1) * limit;
        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM presupuestos');

        const [rows] = await db.query(`
      SELECT p.*, p.id_presupuesto AS id, c.nombre AS cliente_nombre, c.rif AS cliente_rif, c.telefono AS cliente_telefono, c.email AS cliente_email, c.direccion AS cliente_direccion
      FROM presupuestos p
      LEFT JOIN clientes c ON p.cliente_id = c.id_cliente
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

        let lineasPorId = {};
        if (rows.length > 0) {
          const ids = rows.map(p => p.id);
          const [todasLineas] = await db.query(
            'SELECT * FROM presupuesto_lineas WHERE presupuesto_id IN (?) ORDER BY presupuesto_id, orden ASC',
            [ids]
          );
          for (const linea of todasLineas) {
            if (!lineasPorId[linea.presupuesto_id]) lineasPorId[linea.presupuesto_id] = [];
            lineasPorId[linea.presupuesto_id].push(linea);
          }
        }
        for (const presupuesto of rows) {
          presupuesto.lineas = lineasPorId[presupuesto.id] || [];
        }

        return {
          success: true,
          data: rows,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      }
    );

    res.json(payload);
  } catch (err) {
    console.error('Error GET /presupuestos:', err);
    res.status(500).json({ success: false, message: 'Error al obtener presupuestos.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/presupuestos/:id  → Obtener uno
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [[presupuesto]] = await db.query(`
      SELECT p.*, p.id_presupuesto AS id, c.nombre AS cliente_nombre, c.rif AS cliente_rif,
             c.telefono AS cliente_telefono, c.email AS cliente_email,
             c.direccion AS cliente_direccion
      FROM presupuestos p
      LEFT JOIN clientes c ON p.cliente_id = c.id_cliente
      WHERE p.id_presupuesto = ?
    `, [id]);

    if (!presupuesto) {
      return res.status(404).json({ success: false, message: 'Presupuesto no encontrado' });
    }

    const [lineas] = await db.query(
      'SELECT * FROM presupuesto_lineas WHERE presupuesto_id = ? ORDER BY orden ASC',
      [id]
    );
    presupuesto.lineas = lineas;

    res.json({ success: true, data: presupuesto });
  } catch (err) {
    console.error('Error GET /presupuestos/:id:', err);
    res.status(500).json({ success: false, message: 'Error al obtener el presupuesto.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/presupuestos  → Crear nuevo
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      // Datos del cliente (puede ser nuevo o existente)
      cliente_id,          // null si es nuevo cliente
      cliente_nombre,
      cliente_rif,
      cliente_telefono,
      cliente_email,
      cliente_direccion,

      // Datos del presupuesto
      numero_presupuesto,  // opcional, el servidor puede generarlo
      proyecto_descripcion,
      tasa_cambio_usd_bs,  // tasa de cambio del día
      descripcion_legal,   // texto legal para el PDF
      observaciones,
      validez_dias,        // días de validez del presupuesto

      // Líneas del presupuesto (array)
      lineas,              // [{ tipo, descripcion, metros_lineales, precio_unitario_usd, cantidad, orden }]
    } = req.body;

    // ── 1. Resolver cliente ──────────────────
    let finalClienteId = cliente_id;

    if (!finalClienteId) {
      // Crear cliente nuevo
      if (!cliente_nombre) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'El nombre del cliente es obligatorio.' });
      }
      const [result] = await conn.query(
        `INSERT INTO clientes (nombre, rif, telefono, email, direccion)
         VALUES (?, ?, ?, ?, ?)`,
        [cliente_nombre, cliente_rif || null, cliente_telefono || null,
         cliente_email || null, cliente_direccion || null]
      );
      finalClienteId = result.insertId;
    }

    // ── 2. Calcular totales ──────────────────
    const tasa = parseFloat(tasa_cambio_usd_bs) || 0;

    let subtotal_usd = 0;
    const lineasProcesadas = (lineas || []).map((l, idx) => {
      const precioUnit = parseFloat(l.precio_unitario_usd) || 0;
      const cantidad   = parseFloat(l.cantidad) || 1;
      const metros     = parseFloat(l.metros_lineales) || 0;

      // Si tiene metros lineales, el subtotal es precio × metros × cantidad
      // Si no, es precio × cantidad (para flete, carpintería, insumos, etc.)
      const subtotalLinea = metros > 0
        ? precioUnit * metros * cantidad
        : precioUnit * cantidad;

      subtotal_usd += subtotalLinea;

      return {
        ...l,
        orden:              l.orden ?? idx,
        precio_unitario_usd: precioUnit,
        cantidad,
        metros_lineales:    metros,
        subtotal_usd:       subtotalLinea,
        subtotal_bs:        subtotalLinea * tasa,
      };
    });

    const total_usd = subtotal_usd;
    const total_bs  = total_usd * tasa;

    // ── 3. Generar número de presupuesto ─────
    let numPresupuesto = numero_presupuesto;
    if (!numPresupuesto) {
      const [[{ ultimo }]] = await conn.query(
        "SELECT COUNT(*) AS ultimo FROM presupuestos WHERE YEAR(created_at) = YEAR(NOW())"
      );
      const seq = String(parseInt(ultimo) + 1).padStart(4, '0');
      const year = new Date().getFullYear();
      numPresupuesto = `PRES-${year}-${seq}`;
    }

    // ── 4. Insertar presupuesto ──────────────
    const [presResult] = await conn.query(
      `INSERT INTO presupuestos
         (numero_presupuesto, cliente_id, proyecto_descripcion,
          tasa_cambio_usd_bs, subtotal_usd, total_usd, total_bs,
          descripcion_legal, observaciones, validez_dias, estatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'borrador')`,
      [
        numPresupuesto, finalClienteId, proyecto_descripcion || '',
        tasa, subtotal_usd, total_usd, total_bs,
        descripcion_legal || '', observaciones || '',
        validez_dias || 30,
      ]
    );
    const presupuestoId = presResult.insertId;

    // ── 5. Insertar líneas ───────────────────
    for (const linea of lineasProcesadas) {
      await conn.query(
        `INSERT INTO presupuesto_lineas
           (presupuesto_id, tipo, descripcion, metros_lineales,
            precio_unitario_usd, precio_usd, cantidad, subtotal_usd, subtotal_bs, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          presupuestoId,
          linea.tipo          || 'otro',
          linea.descripcion   || '',
          linea.metros_lineales,
          linea.precio_unitario_usd,
          linea.precio_unitario_usd, // precio_usd es alias de precio_unitario_usd
          linea.cantidad,
          linea.subtotal_usd,
          linea.subtotal_bs,
          linea.orden,
        ]
      );
    }

    await conn.commit();
    await invalidatePresupuestos();

    res.status(201).json({
      success: true,
      message: `Presupuesto ${numPresupuesto} creado exitosamente.`,
      data: {
        id: presupuestoId,
        numero_presupuesto: numPresupuesto,
        cliente_id: finalClienteId,
        total_usd,
        total_bs,
        tasa_cambio_usd_bs: tasa,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error POST /presupuestos:', err);
    res.status(500).json({ success: false, message: 'Error al crear el presupuesto.' });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────
// PUT /api/presupuestos/:id  → Actualizar
// ─────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const {
      proyecto_descripcion,
      tasa_cambio_usd_bs,
      descripcion_legal,
      observaciones,
      validez_dias,
      estatus,
      lineas,
    } = req.body;

    // Verificar que existe
    const [[existe]] = await conn.query('SELECT id_presupuesto AS id FROM presupuestos WHERE id_presupuesto = ?', [id]);
    if (!existe) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Presupuesto no encontrado' });
    }

    // Recalcular totales
    const tasa = parseFloat(tasa_cambio_usd_bs) || 0;
    let subtotal_usd = 0;

    const lineasProcesadas = (lineas || []).map((l, idx) => {
      const precioUnit = parseFloat(l.precio_unitario_usd) || 0;
      const cantidad   = parseFloat(l.cantidad) || 1;
      const metros     = parseFloat(l.metros_lineales) || 0;

      const subtotalLinea = metros > 0
        ? precioUnit * metros * cantidad
        : precioUnit * cantidad;

      subtotal_usd += subtotalLinea;

      return {
        ...l,
        orden:               l.orden ?? idx,
        precio_unitario_usd: precioUnit,
        cantidad,
        metros_lineales:     metros,
        subtotal_usd:        subtotalLinea,
        subtotal_bs:         subtotalLinea * tasa,
      };
    });

    const total_usd = subtotal_usd;
    const total_bs  = total_usd * tasa;

    // Actualizar cabecera
    await conn.query(
      `UPDATE presupuestos SET
         proyecto_descripcion = ?, tasa_cambio_usd_bs = ?,
         subtotal_usd = ?, total_usd = ?, total_bs = ?,
         descripcion_legal = ?, observaciones = ?,
         validez_dias = ?, estatus = ?
       WHERE id_presupuesto = ?`,
      [
        proyecto_descripcion || '', tasa,
        subtotal_usd, total_usd, total_bs,
        descripcion_legal || '', observaciones || '',
        validez_dias || 30, estatus || 'borrador',
        id,
      ]
    );

    // Reemplazar líneas (eliminar antiguas e insertar nuevas)
    await conn.query('DELETE FROM presupuesto_lineas WHERE presupuesto_id = ?', [id]);

    for (const linea of lineasProcesadas) {
      await conn.query(
        `INSERT INTO presupuesto_lineas
           (presupuesto_id, tipo, descripcion, metros_lineales,
            precio_unitario_usd, precio_usd, cantidad, subtotal_usd, subtotal_bs, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          linea.tipo          || 'otro',
          linea.descripcion   || '',
          linea.metros_lineales,
          linea.precio_unitario_usd,
          linea.precio_unitario_usd,
          linea.cantidad,
          linea.subtotal_usd,
          linea.subtotal_bs,
          linea.orden,
        ]
      );
    }

    await conn.commit();
    await invalidatePresupuestos();

    res.json({
      success: true,
      message: 'Presupuesto actualizado correctamente.',
      data: { id: parseInt(id), total_usd, total_bs, tasa_cambio_usd_bs: tasa },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error PUT /presupuestos/:id:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar el presupuesto.' });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────
// PATCH /api/presupuestos/:id/estatus → Cambiar estatus
// Si estatus === 'aprobado' → crea proyecto automáticamente
// ─────────────────────────────────────────────
router.patch('/:id/estatus', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { estatus } = req.body;

    const estatusValidos = ['borrador', 'enviado', 'aprobado', 'rechazado', 'vencido'];
    if (!estatusValidos.includes(estatus)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Estatus inválido. Valores permitidos: ${estatusValidos.join(', ')}`,
      });
    }

    // Obtener datos del presupuesto + cliente
    const [[presupuesto]] = await conn.query(`
      SELECT p.*, p.id_presupuesto AS id, c.nombre AS cliente_nombre, c.rif AS cliente_rif
      FROM presupuestos p
      LEFT JOIN clientes c ON p.cliente_id = c.id_cliente
      WHERE p.id_presupuesto = ?
    `, [id]);

    if (!presupuesto) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Presupuesto no encontrado' });
    }

    // Actualizar estatus del presupuesto
    await conn.query(
      'UPDATE presupuestos SET estatus = ? WHERE id_presupuesto = ?',
      [estatus, id]
    );

    let proyectoCreado = null;

    // ── AUTOMATIZACIÓN: Si se aprueba → crear proyecto ──────────────────
    if (estatus === 'aprobado') {
      const nombreCliente = presupuesto.cliente_nombre
        || `Presupuesto ${presupuesto.numero_presupuesto}`;
      const descripcion   = presupuesto.proyecto_descripcion || null;
      const rifCliente    = presupuesto.cliente_rif || presupuesto.rif || null;
      const tasaBcv       = presupuesto.tasa_cambio_usd_bs   || null;

      const [result] = await conn.query(`
        INSERT INTO proyectos
          (nombre_proyecto, nombre_cliente, rif_cedula, descripcion_obra, estatus, fecha_inicio, monto_usd)
        VALUES (?, ?, ?, ?, 'Activo', CURDATE(), ?)
      `, [
        nombreCliente,
        nombreCliente,
        rifCliente,
        descripcion,
        presupuesto.total_usd || 0,
      ]);

      proyectoCreado = {
        id_proyecto:    result.insertId,
        nombre_proyecto: nombreCliente,
        estatus:        'Activo',
      };
    }

    await conn.commit();
    await invalidatePresupuestos();
    if (estatus === 'aprobado') await invalidateProyectos();

    res.json({
      success: true,
      message: `Estatus actualizado a "${estatus}".`,
      proyecto_creado: proyectoCreado,
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error PATCH /presupuestos/:id/estatus:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar el estatus.' });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────
// DELETE /api/presupuestos/:id  → Eliminar
// ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    // Las líneas se eliminan en cascada si la FK está configurada,
    // pero lo hacemos explícito para mayor seguridad.
    await conn.query('DELETE FROM presupuesto_lineas WHERE presupuesto_id = ?', [id]);
    const [result] = await conn.query('DELETE FROM presupuestos WHERE id_presupuesto = ?', [id]);

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Presupuesto no encontrado' });
    }

    await conn.commit();
    await invalidatePresupuestos();
    res.json({ success: true, message: 'Presupuesto eliminado correctamente.' });
  } catch (err) {
    await conn.rollback();
    console.error('Error DELETE /presupuestos/:id:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar el presupuesto.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
