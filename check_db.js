const db = require('./server/db');

async function check() {
  try {
    const [cols] = await db.query('SHOW COLUMNS FROM proyectos;');
    console.log(cols);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
