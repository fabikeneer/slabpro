const db = require('./server/db');

async function fixEmpleados() {
    try {
        await db.query(`
            ALTER TABLE empleados 
            CHANGE COLUMN id_empleado id INT(11) NOT NULL AUTO_INCREMENT,
            CHANGE COLUMN cargo rol VARCHAR(255) DEFAULT NULL,
            ADD COLUMN cedula_rif VARCHAR(50) DEFAULT NULL AFTER nombre;
        `);
        console.log('Tabla empleados alterada correctamente.');
    } catch (error) {
        console.log('Error alterando empleados:', error.message);
        
        // Maybe id is already id? Let's check
        try {
            const [desc] = await db.query('DESCRIBE empleados');
            console.table(desc);
        } catch (e) {}
    }
    process.exit(0);
}

fixEmpleados();
