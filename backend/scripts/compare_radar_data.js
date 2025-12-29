require('dotenv').config();
const db = require('../services/db');

/**
 * Compara la cantidad de datos entre LGUAXX y LOXX
 */
async function compareRadarData() {
    console.log('=== COMPARACIÓN DE DATOS POR RADAR ===\n');

    const pool = db.getPool();
    if (!pool) {
        console.error('❌ Pool no disponible');
        return;
    }

    try {
        // Contar por radar
        const countResult = await pool.query(`
      SELECT 
        radar_id,
        COUNT(*) as total,
        COUNT(CASE WHEN metadata::text LIKE '%maxDbz%' THEN 1 END) as with_metadata,
        MIN(source_timestamp) as oldest,
        MAX(source_timestamp) as newest
      FROM radar_products 
      WHERE status = 'ready'
      GROUP BY radar_id
      ORDER BY radar_id
    `);

        console.log('Datos por radar:');
        countResult.rows.forEach(row => {
            console.log(`\n${row.radar_id}:`);
            console.log(`  Total registros: ${row.total}`);
            console.log(`  Con metadatos (maxDbz): ${row.with_metadata} (${((row.with_metadata / row.total) * 100).toFixed(1)}%)`);
            console.log(`  Sin metadatos: ${row.total - row.with_metadata}`);
            console.log(`  Fecha más antigua: ${row.oldest}`);
            console.log(`  Fecha más reciente: ${row.newest}`);
        });

        // Ver últimos registros de LGUAXX
        console.log('\n\n=== ÚLTIMOS 10 REGISTROS DE LGUAXX ===');
        const lguaxxResult = await pool.query(`
      SELECT 
        id,
        filename,
        source_timestamp,
        CASE 
          WHEN metadata::text LIKE '%maxDbz%' THEN 'CON DATOS'
          ELSE 'SIN DATOS'
        END as has_data,
        png_data IS NOT NULL as has_image
      FROM radar_products 
      WHERE radar_id = 'LGUAXX' AND status = 'ready'
      ORDER BY source_timestamp DESC
      LIMIT 10
    `);

        lguaxxResult.rows.forEach(row => {
            console.log(`${row.filename}: ${row.has_data}, Imagen: ${row.has_image ? 'Sí' : 'No'}`);
        });

        // Verificar si hay datos HOY de LGUAXX
        console.log('\n\n=== DATOS DE HOY POR RADAR ===');
        const todayResult = await pool.query(`
      SELECT 
        radar_id,
        COUNT(*) as total_today
      FROM radar_products 
      WHERE status = 'ready'
        AND DATE(source_timestamp AT TIME ZONE 'America/Guayaquil') = CURRENT_DATE
      GROUP BY radar_id
    `);

        todayResult.rows.forEach(row => {
            console.log(`${row.radar_id}: ${row.total_today} registros hoy`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }

    process.exit(0);
}

compareRadarData();
