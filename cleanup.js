const db = require('./server/db');

async function cleanup() {
    try {
        console.log("Limpiando tablas antiguas...");
        await db.query('DROP TABLE IF EXISTS inventario');
        console.log("Tabla inventario eliminada.");
        // Opcional: intentar eliminar tablas que pudieran llamarse reportes
        await db.query('DROP TABLE IF EXISTS reportes');
        console.log("Limpieza completada.");
        process.exit(0);
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
}

cleanup();
