const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'radar_metadata',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function deleteTodayFrames() {
    try {
        console.log('🗑️ Eliminando frames de hoy para LGUAXX...');

        // Obtener fecha de hoy en formato YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];
        console.log(`Fecha objetivo: ${today}`);

        const query = `
      DELETE FROM radar_products 
      WHERE radar_id = 'LGUAXX' 
      AND product_type = 'ppi_png' 
      AND source_timestamp >= CURRENT_DATE;
    `;

        const result = await pool.query(query);
        console.log(`✅ Eliminados ${result.rowCount} registros.`);
        console.log('🔄 El servicio png-sync debería volver a descargarlos automáticamente.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

deleteTodayFrames();
