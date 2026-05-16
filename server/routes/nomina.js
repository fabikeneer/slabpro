const express = require('express');
const router = express.Router();
const db = require('../db'); 

// Sincronizar estructura de empleados y pagos_nomina
(async () => {
    try { await db.query(`ALTER TABLE empleados CHANGE COLUMN id_empleado id INT(11) NOT NULL AUTO_INCREMENT`); } catch(e) {}
    try { await db.query(`ALTER TABLE empleados ADD COLUMN cedula_rif VARCHAR(50) DEFAULT NULL AFTER nombre`); } catch(e) {}
    try { await db.query(`ALTER TABLE empleados CHANGE COLUMN cargo rol VARCHAR(255) DEFAULT NULL`); } catch(e) {}
    // Agregar columna estado
    try { await db.query(`ALTER TABLE empleados ADD COLUMN estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo'`); } catch(e) {}
    // Agregar columna beneficiario para pagos externos
    try { await db.query(`ALTER TABLE pagos_nomina ADD COLUMN beneficiario VARCHAR(255) DEFAULT NULL`); } catch(e) {}
})();

// POST /api/nomina/registrar
router.post('/registrar', async (req, res) => {
    const { id_empleado, id_proyecto, monto_usd, tasa_dia, concepto, fecha_pago, beneficiario, es_externo } = req.body;
    const monto_bs = monto_usd * tasa_dia;

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const proyecto_id = id_proyecto || null;
        const empleado_id = es_externo ? null : (id_empleado || null);
        const beneficiario_val = es_externo ? (beneficiario || 'Beneficiario Externo') : null;

        // 1. Insertar el pago al trabajador
        const sqlNomina = `INSERT INTO pagos_nomina 
            (id_empleado, id_proyecto, monto_usd, tasa_dia, monto_bs, concepto, fecha_pago, beneficiario) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        await conn.query(sqlNomina, [empleado_id, proyecto_id, monto_usd, tasa_dia, monto_bs, concepto, fecha_pago, beneficiario_val]);

        // 2. Insertar automáticamente en la tabla de GASTOS generales
        const categoriaGasto = es_externo ? 'Pagos Externos' : 'Nomina';
        const descripcionGasto = es_externo
            ? `Pago externo: ${beneficiario_val} — ${concepto}`
            : `Pago nómina: ${concepto}`;
        const monto_bs_calc = parseFloat(monto_usd) * parseFloat(tasa_dia);
        const sqlGasto = `INSERT INTO gastos 
            (id_proyecto, categoria, descripcion, monto_usd, monto_bs, tasa_usdt, fecha_gasto) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        await conn.query(sqlGasto, [proyecto_id, categoriaGasto, descripcionGasto, monto_usd, monto_bs_calc, tasa_dia, fecha_pago]);

        await conn.commit();
        res.status(201).json({ success: true, message: 'Pago y gasto registrados correctamente' });
    } catch (error) {
        await conn.rollback();
        console.error('Error en POST /nomina/registrar:', error);
        res.status(500).json({ success: false, error: `Error al procesar el pago: ${error.message}` });
    } finally {
        // Siempre liberar la conexión al final para no agotar el pool
        conn.release();
    }
});

// GET /api/nomina/reporte
router.get('/reporte', async (req, res) => {
    try {
        const { id, inicio, fin } = req.query;

        let sqlResumen = `SELECT SUM(monto_usd) as total_usd, SUM(monto_bs) as total_bs FROM pagos_nomina p WHERE 1=1`;
        let sqlLista = `
            SELECT 
                p.id_pago as id, p.fecha_pago, p.concepto, p.monto_usd, p.monto_bs,
                COALESCE(e.nombre, p.beneficiario, 'Externo') as trabajador,
                p.beneficiario,
                COALESCE(pr.nombre_proyecto, pr.nombre_cliente, 'Desconocido') as proyecto
            FROM pagos_nomina p
            LEFT JOIN empleados e ON p.id_empleado = e.id
            LEFT JOIN proyectos pr ON p.id_proyecto = pr.id_proyecto
            WHERE 1=1
        `;
        const params = [];

        if (id) {
            sqlResumen += ` AND p.id_empleado = ?`;
            sqlLista += ` AND p.id_empleado = ?`;
            params.push(id);
        }

        if (inicio && fin) {
            // Asumimos que inicio y fin son ISO strings, cortamos a YYYY-MM-DD
            sqlResumen += ` AND p.fecha_pago BETWEEN ? AND ?`;
            sqlLista += ` AND p.fecha_pago BETWEEN ? AND ?`;
            params.push(inicio.split('T')[0], fin.split('T')[0]);
        }

        // Ordenar lista por fecha
        sqlLista += ` ORDER BY p.fecha_pago DESC`;

        const [rowsResumen] = await db.query(sqlResumen, params);
        
        // Parámetros duplicados para la segunda consulta
        const [rowsLista] = await db.query(sqlLista, params);
        
        res.json({
            resumen: {
                total_usd: rowsResumen[0].total_usd || 0,
                total_bs: rowsResumen[0].total_bs || 0
            },
            pagos: rowsLista
        });
    } catch (error) {
        console.error('Error en GET /nomina/reporte:', error);
        res.status(500).json({ error: `Error al obtener el reporte: ${error.message}` });
    }
});

// GET /api/nomina/empleados
router.get('/empleados', async (req, res) => {
    try {
        // Solo devolvemos los empleados con estado 'Activo'
        const [rows] = await db.query("SELECT * FROM empleados WHERE estado = 'Activo' ORDER BY nombre ASC");
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo empleados:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/nomina/empleados
router.post('/empleados', async (req, res) => {
    try {
        const { nombre, cedula_rif, telefono, rol } = req.body;
        const [result] = await db.query(
            'INSERT INTO empleados (nombre, cedula_rif, telefono, rol) VALUES (?, ?, ?, ?)',
            [nombre, cedula_rif, telefono, rol]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Error creando empleado:', error);
        res.status(500).json({ error: 'Error al crear empleado' });
    }
});

// PUT /api/nomina/empleados/:id
router.put('/empleados/:id', async (req, res) => {
    try {
        const { nombre, cedula_rif, telefono, rol } = req.body;
        await db.query(
            'UPDATE empleados SET nombre = ?, cedula_rif = ?, telefono = ?, rol = ? WHERE id = ?',
            [nombre, cedula_rif, telefono, rol, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error actualizando empleado:', error);
        res.status(500).json({ error: 'Error al actualizar empleado' });
    }
});

// DELETE /api/nomina/empleados/:id
router.delete('/empleados/:id', async (req, res) => {
    try {
        // En lugar de eliminar físicamente, cambiamos el estado a Inactivo (Soft Delete)
        await db.query("UPDATE empleados SET estado = 'Inactivo' WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error eliminando empleado:', error);
        res.status(500).json({ error: 'Error al cambiar el estado del empleado a inactivo' });
    }
});

// GET /api/nomina/proyectos  — Solo proyectos activos (para dropdown)
router.get('/proyectos', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                id_proyecto  AS id,
                COALESCE(nombre_proyecto, nombre_cliente, 'Proyecto sin nombre') AS nombre,
                estatus
            FROM proyectos
            WHERE estatus IN ('Activo', 'En Proceso')
            ORDER BY nombre ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo proyectos:', error);
        res.status(500).json({ error: error.message });
    }
});

// DEBUG SCHEMA
router.get('/debug_schema', async (req, res) => {
    try {
        const [emp] = await db.query('DESCRIBE empleados');
        const [proy] = await db.query('DESCRIBE proyectos');
        res.json({ empleados: emp, proyectos: proy });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
