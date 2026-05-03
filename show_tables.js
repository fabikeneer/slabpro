const db = require('./server/db');

async function test() {
    try {
        const [rows] = await db.query('SHOW TABLES');
        console.log(rows);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
}

test();
