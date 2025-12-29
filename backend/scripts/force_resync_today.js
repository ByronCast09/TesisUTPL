require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

/**
 * Elimina registros de hoy que no tienen maxDbz para forzar resincronización
 */
async function forceResyncToday() {
    try {
        console.log('🔄 Forzando resincronización de registros sin metadata...');

        const query = `
      DELETE FROM radar_products
      WHERE 
        DATE(source_timestamp) = CURRENT_DATE
        AND product_type = 'ppi_png'
        AND (
          metadata->>'maxDbz' IS NULL 
          OR (metadata->>'maxDbz')::float = 0
        )
      RETURNING id, radar_id, filename
    `;

        const result = await pool.query(query);

        console.log(`✅ Eliminados ${result.rowCount} registros sin metadata`);

        if (result.rows.length > 0) {
            console.log('\nEjemplos eliminados:');
            result.rows.slice(0, 5).forEach(r => {
                console.log(`   - ${r.radar_id}: ${r.filename}`);
            });
        }

        console.log('\n💡 Estos registros se volverán a sincronizar en el próximo ciclo (5 min)');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

forceResyncToday();
