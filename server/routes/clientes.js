// routes/clientes.js — CRUD de clientes
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { getOrSetCache, invalidateClientes } = require('../utils/cacheUtils');
const { TTL, keys } = require('../utils/cacheKeys');

// GET /api/clientes — Buscar/listar clientes
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;

    const data = await getOrSetCache(keys.clientesList(q), TTL.LIST, async () => {
      if (q) {
        const [rows] = await db.query(
          `SELECT id, nombre, rif, telefono, email
         FROM clientes
         WHERE nombre LIKE ? OR rif LIKE ?
         ORDER BY nombre ASC LIMIT 20`,
          [`%${q}%`, `%${q}%`]
        );
        return rows;
      }
      const [rows] = await db.query(
        'SELECT id, nombre, rif, telefono, email FROM clientes ORDER BY nombre ASC'
      );
      return rows;
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener clientes.' });
  }
});

// GET /api/clientes/:id
router.get('/:id', async (req, res) => {
  try {
    const cliente = await getOrSetCache(keys.clienteDetail(req.params.id), TTL.LIST, async () => {
      const [[row]] = await db.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
      return row || null;
    });

    if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    res.json({ success: true, data: cliente });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener el cliente.' });
  }
});

// POST /api/clientes
router.post('/', async (req, res) => {
  try {
    const { nombre, rif, telefono, email, direccion } = req.body;
    if (!nombre) return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });

    const [result] = await db.query(
      'INSERT INTO clientes (nombre, rif, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)',
      [nombre, rif || null, telefono || null, email || null, direccion || null]
    );

    await invalidateClientes();
    res.status(201).json({ success: true, data: { id: result.insertId, nombre } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al crear el cliente.' });
  }
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res) => {
  try {
    const { nombre, rif, telefono, email, direccion } = req.body;
    await db.query(
      `UPDATE clientes SET nombre=?, rif=?, telefono=?, email=?, direccion=?, updated_at=NOW()
       WHERE id = ?`,
      [nombre, rif || null, telefono || null, email || null, direccion || null, req.params.id]
    );
    await invalidateClientes();
    res.json({ success: true, message: 'Cliente actualizado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al actualizar el cliente.' });
  }
});

module.exports = router;
