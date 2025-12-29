const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'radar_metadata',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function findId() {
    try {
        const query = `
      SELECT id, filename, source_timestamp, LENGTH(png_data) as size
      FROM radar_products
      WHERE radar_id = 'LGUAXX'
      AND source_timestamp >= CURRENT_DATE
      ORDER BY source_timestamp DESC
      LIMIT 10
    `;

        const result = await pool.query(query);

        if (result.rows.length === 0) {
            console.log('❌ No se encontraron registros de hoy');
            return;
        }

        console.log(`Últimos ${result.rows.length} registros de hoy:\n`);
        result.rows.forEach(row => {
            console.log(`ID: ${row.id}`);
            console.log(`Filename: ${row.filename}`);
            console.log(`Timestamp: ${row.source_timestamp}`);
            console.log(`Size: ${row.size} bytes`);
            console.log('---');
        });

        console.log('\n💡 Copia uno de estos IDs y úsalo en compare_images.js línea 10');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

findId();
