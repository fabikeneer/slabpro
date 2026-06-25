// routes/gastos.js — Módulo de Gastos para SlabPro
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { getOrSetCache, invalidateGastos } = require('../utils/cacheUtils');
const { TTL, keys } = require('../utils/cacheKeys');

// ── Asegurar que la tabla existe en arranque ─────────────────────────────
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS gastos (
                id_gasto    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                id_proyecto INT UNSIGNED DEFAULT NULL,
                categoria   ENUM('Insumos','Fletes','Pagos Externos','Nomina','Otros') NOT NULL DEFAULT 'Otros',
                descripcion VARCHAR(500) NOT NULL,
                monto_usd   DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                monto_bs    DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                tasa_usdt   DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
                fecha_gasto DATE NOT NULL,
                created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_categoria (categoria),
                INDEX idx_fecha     (fecha_gasto),
                INDEX idx_proyecto  (id_proyecto)
            ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
    } catch (e) {
        console.error('Error verificando tabla gastos:', e.message);
    }
})();

// ── GET /api/gastos ──────────────────────────────────────────────────────
// Retorna historial de gastos con filtros opcionales
router.get('/', async (req, res) => {
    try {
        const { categoria, inicio, fin } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const cacheQuery = { categoria: categoria || '', inicio: inicio || '', fin: fin || '', page, limit };

        const payload = await getOrSetCache(
            keys.gastosList(cacheQuery),
            TTL.LIST,
            async () => {
        const offset = (page - 1) * limit;

        let sql = `
            SELECT
                g.id_gasto,
                g.categoria,
                g.descripcion,
                g.monto_usd,
                g.monto_bs,
                g.tasa_usdt,
                g.fecha_gasto,
                g.created_at,
                COALESCE(pr.nombre_proyecto, pr.nombre_cliente, NULL) AS proyecto_nombre
            FROM gastos g
            LEFT JOIN proyectos pr ON g.id_proyecto = pr.id_proyecto
            WHERE 1=1
        `;
        const params = [];

        if (categoria && categoria !== 'Todos') {
            sql += ` AND g.categoria = ?`;
            params.push(categoria);
        }

        if (inicio) {
            sql += ` AND g.fecha_gasto >= ?`;
            params.push(inicio.split('T')[0]);
        }

        if (fin) {
            sql += ` AND g.fecha_gasto <= ?`;
            params.push(fin.split('T')[0]);
        }

        sql += ` ORDER BY g.fecha_gasto DESC, g.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.query(sql, params);

        let sqlTotales = `
            SELECT
                categoria,
                SUM(monto_usd) AS total_usd,
                SUM(monto_bs)  AS total_bs,
                COUNT(*)       AS cantidad
            FROM gastos
            WHERE 1=1
        `;
        const paramsTotales = [];
        if (categoria && categoria !== 'Todos') {
            sqlTotales += ` AND categoria = ?`;
            paramsTotales.push(categoria);
        }
        if (inicio) { sqlTotales += ` AND fecha_gasto >= ?`; paramsTotales.push(inicio.split('T')[0]); }
        if (fin)    { sqlTotales += ` AND fecha_gasto <= ?`; paramsTotales.push(fin.split('T')[0]); }
        sqlTotales += ` GROUP BY categoria ORDER BY total_usd DESC`;

        const [totalesCat] = await db.query(sqlTotales, paramsTotales);

        let sqlTotal = `SELECT SUM(monto_usd) AS total_usd, SUM(monto_bs) AS total_bs, COUNT(*) AS total_registros FROM gastos WHERE 1=1`;
        const paramsTotal = [];
        if (inicio) { sqlTotal += ` AND fecha_gasto >= ?`; paramsTotal.push(inicio.split('T')[0]); }
        if (fin)    { sqlTotal += ` AND fecha_gasto <= ?`; paramsTotal.push(fin.split('T')[0]); }
        const [[totalGeneral]] = await db.query(sqlTotal, paramsTotal);

        const totalRegistros = totalGeneral?.total_registros || 0;

        return {
            success: true,
            gastos: rows,
            totales_por_categoria: totalesCat,
            total_general: {
                total_usd: totalGeneral?.total_usd || 0,
                total_bs:  totalGeneral?.total_bs  || 0,
                total_registros: totalRegistros,
            },
            pagination: {
                total: totalRegistros,
                page,
                limit,
                totalPages: Math.ceil(totalRegistros / limit)
            }
        };
            }
        );

        res.json(payload);
    } catch (error) {
        console.error('Error en GET /gastos:', error);
        res.status(500).json({ success: false, message: 'Error al obtener gastos.' });
    }
});

// ── POST /api/gastos ─────────────────────────────────────────────────────
// Crear gasto manual
router.post('/', async (req, res) => {
    try {
        const { categoria, descripcion, monto_usd, tasa_usdt, id_proyecto, fecha_gasto } = req.body;

        if (!categoria || !descripcion || !monto_usd) {
            return res.status(400).json({ success: false, message: 'Categoría, descripción y monto son requeridos.' });
        }

        const tasa    = parseFloat(tasa_usdt) || 0;
        const monto   = parseFloat(monto_usd) || 0;
        const monto_bs = monto * tasa;
        const fecha   = fecha_gasto || new Date().toISOString().split('T')[0];

        const [result] = await db.query(
            `INSERT INTO gastos (id_proyecto, categoria, descripcion, monto_usd, monto_bs, tasa_usdt, fecha_gasto)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id_proyecto || null, categoria, descripcion, monto, monto_bs, tasa, fecha]
        );

        await invalidateGastos();
        res.status(201).json({ success: true, id_gasto: result.insertId });
    } catch (error) {
        console.error('Error en POST /gastos:', error);
        res.status(500).json({ success: false, message: 'Error al crear el gasto.' });
    }
});

// ── PUT /api/gastos/:id ──────────────────────────────────────────────────
// Editar gasto existente
router.put('/:id', async (req, res) => {
    try {
        const { categoria, descripcion, monto_usd, tasa_usdt, id_proyecto, fecha_gasto } = req.body;
        const { id } = req.params;

        const tasa     = parseFloat(tasa_usdt) || 0;
        const monto    = parseFloat(monto_usd) || 0;
        const monto_bs = monto * tasa;

        await db.query(
            `UPDATE gastos
             SET categoria = ?, descripcion = ?, monto_usd = ?, monto_bs = ?,
                 tasa_usdt = ?, id_proyecto = ?, fecha_gasto = ?
             WHERE id_gasto = ?`,
            [categoria, descripcion, monto, monto_bs, tasa, id_proyecto || null, fecha_gasto, id]
        );

        await invalidateGastos();
        res.json({ success: true });
    } catch (error) {
        console.error('Error en PUT /gastos/:id:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el gasto.' });
    }
});

// ── DELETE /api/gastos/:id ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM gastos WHERE id_gasto = ?', [req.params.id]);
        await invalidateGastos();
        res.json({ success: true });
    } catch (error) {
        console.error('Error en DELETE /gastos/:id:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar el gasto.' });
    }
});

// ── GET /api/gastos/reporte ──────────────────────────────────────────────
// Datos consolidados para el PDF
router.get('/reporte', async (req, res) => {
    try {
        const { inicio, fin, categoria } = req.query;

        let sqlGastos = `
            SELECT
                g.id_gasto, g.categoria, g.descripcion,
                g.monto_usd, g.monto_bs, g.tasa_usdt, g.fecha_gasto,
                COALESCE(pr.nombre_proyecto, pr.nombre_cliente, 'Sin proyecto') AS proyecto
            FROM gastos g
            LEFT JOIN proyectos pr ON g.id_proyecto = pr.id_proyecto
            WHERE 1=1
        `;
        const params = [];

        if (categoria && categoria !== 'Todos') {
            sqlGastos += ` AND g.categoria = ?`;
            params.push(categoria);
        }
        if (inicio) { sqlGastos += ` AND g.fecha_gasto >= ?`; params.push(inicio.split('T')[0]); }
        if (fin)    { sqlGastos += ` AND g.fecha_gasto <= ?`; params.push(fin.split('T')[0]); }
        sqlGastos += ` ORDER BY g.fecha_gasto ASC`;

        const [gastos] = await db.query(sqlGastos, params);

        // Subtotales por categoría
        let sqlSub = `
            SELECT categoria,
                   SUM(monto_usd) AS total_usd,
                   SUM(monto_bs)  AS total_bs,
                   COUNT(*)       AS cantidad
            FROM gastos WHERE 1=1
        `;
        const paramsSub = [...params];
        // reutilizamos los filtros pero sin el de categoría (queremos todos los grupos)
        let sqlSubFull = `SELECT categoria, SUM(monto_usd) AS total_usd, SUM(monto_bs) AS total_bs, COUNT(*) AS cantidad FROM gastos WHERE 1=1`;
        const paramsSubFull = [];
        if (inicio) { sqlSubFull += ` AND fecha_gasto >= ?`; paramsSubFull.push(inicio.split('T')[0]); }
        if (fin)    { sqlSubFull += ` AND fecha_gasto <= ?`; paramsSubFull.push(fin.split('T')[0]); }
        sqlSubFull += ` GROUP BY categoria ORDER BY total_usd DESC`;

        const [subtotales] = await db.query(sqlSubFull, paramsSubFull);

        const totalUSD = subtotales.reduce((acc, r) => acc + parseFloat(r.total_usd || 0), 0);
        const totalBs  = subtotales.reduce((acc, r) => acc + parseFloat(r.total_bs  || 0), 0);

        res.json({
            gastos,
            subtotales,
            total_general: { total_usd: totalUSD, total_bs: totalBs },
            periodo: { inicio: inicio || null, fin: fin || null },
            generado_en: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error en GET /gastos/reporte:', error);
        res.status(500).json({ success: false, message: 'Error al generar el reporte.' });
    }
});

module.exports = router;
