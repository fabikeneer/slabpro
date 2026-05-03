const db = require('./server/db');
(async () => {
    try {
        const [tables] = await db.query('SHOW TABLES');
        console.log('Tablas:', tables);
        
        try {
            const [desc] = await db.query('DESCRIBE proyectos');
            console.log('Proyectos columns:', desc);
        } catch(e) {
            console.log('No existe proyectos o error:', e.message);
        }
    } catch (e) {
        console.log(e);
    }
    process.exit(0);
})();
