const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/dashboard/resumen
router.get('/resumen', async (req, res) => {
  try {
    // 1. Proyectos Activos (Count y Suma USD)
    const pProyectos = db.query(`
      SELECT COUNT(*) as cantidad, COALESCE(SUM(monto_usd), 0) as total_usd
      FROM proyectos
      WHERE estatus IN ('Activo', 'En Proceso')
    `);

    // 2. Presupuestos Pendientes (Borrador)
    const pPresupuestos = db.query(`
      SELECT COUNT(*) as cantidad, COALESCE(SUM(total_usd), 0) as total_usd
      FROM presupuestos
      WHERE estatus = 'borrador'
    `);

    // 3. Total Gastos (Suma USD)
    const pGastos = db.query(`
      SELECT COALESCE(SUM(monto_usd), 0) as total_usd
      FROM gastos
    `);

    // 4. Total Nómina (Suma USD)
    const pNomina = db.query(`
      SELECT COALESCE(SUM(monto_usd), 0) as total_usd
      FROM pagos_nomina
    `);

    // 5. Últimos 5 Presupuestos
    const pUltimosPresupuestos = db.query(`
      SELECT p.id_presupuesto, p.numero_presupuesto, p.total_usd, p.estatus, p.created_at, c.nombre as cliente
      FROM presupuestos p
      LEFT JOIN clientes c ON p.cliente_id = c.id_cliente
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    // Ejecutar todas las consultas en paralelo
    const [
      [rowsProyectos],
      [rowsPresupuestos],
      [rowsGastos],
      [rowsNomina],
      [rowsUltimosPresupuestos]
    ] = await Promise.all([
      pProyectos,
      pPresupuestos,
      pGastos,
      pNomina,
      pUltimosPresupuestos
    ]);

    res.json({
      success: true,
      data: {
        proyectosActivos: {
          cantidad: rowsProyectos[0].cantidad,
          total_usd: rowsProyectos[0].total_usd
        },
        presupuestosPendientes: {
          cantidad: rowsPresupuestos[0].cantidad,
          total_usd: rowsPresupuestos[0].total_usd
        },
        totalGastos: rowsGastos[0].total_usd,
        totalNomina: rowsNomina[0].total_usd,
        ultimosPresupuestos: rowsUltimosPresupuestos
      }
    });

  } catch (error) {
    console.error('Error GET /dashboard/resumen:', error);
    res.status(500).json({ success: false, message: 'Error al obtener resumen del dashboard' });
  }
});

module.exports = router;
