const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'radar_metadata',
    password: process.env.DB_PASSWORD || 'byronPost',
    port: process.env.DB_PORT || 5432,
});

async function verifySync() {
    try {
        console.log('=== VERIFICANDO BASE DE DATOS LOCAL ===');
        console.log(`Conectando a BD: ${process.env.DB_NAME} en ${process.env.DB_HOST}`);

        const res = await pool.query(`
      SELECT radar_id, COUNT(*) as count, MAX(processed_at) as last_sync
      FROM radar_products 
      WHERE processed_at > NOW() - INTERVAL '1 hour'
      GROUP BY radar_id
    `);

        if (res.rows.length === 0) {
            console.log('⚠ No se encontraron registros nuevos en la última hora.');
            // Check total to see if DB is empty or just no recent sync
            const total = await pool.query('SELECT COUNT(*) as count FROM radar_products');
            console.log(`Total histórico en DB: ${total.rows[0].count}`);
        } else {
            console.log('✓ Registros encontrados en la última hora:');
            res.rows.forEach(row => {
                console.log(`  - ${row.radar_id}: ${row.count} archivos (Último: ${new Date(row.last_sync).toLocaleTimeString()})`);
            });
        }
    } catch (err) {
        console.error('Error consultando DB:', err.message);
    } finally {
        await pool.end();
    }
}

verifySync();
