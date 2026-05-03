const db = require('./server/db');

async function test() {
    try {
        let sqlLista = `
            SELECT 
                p.id_pago as id, p.fecha_pago, p.concepto, p.monto_usd, p.monto_bs,
                e.nombre as trabajador,
                pr.nombre_cliente as proyecto
            FROM pagos_nomina p
            LEFT JOIN empleados e ON p.id_empleado = e.id
            LEFT JOIN proyectos pr ON p.id_proyecto = pr.id_proyecto
            WHERE 1=1
        `;
        const params = [];
        const [rowsLista] = await db.query(sqlLista, params);
        console.log("Success! rows:", rowsLista.length);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
}

test();
