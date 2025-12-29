require('dotenv').config();
const db = require('../services/db');

async function checkMetadata() {
    console.log('=== VERIFICACIÓN DE METADATOS PARA ANALYTICS ===\n');

    const pool = db.getPool();
    if (!pool) {
        console.error('❌ Pool no disponible');
        return;
    }

    try {
        // Obtener muestras de datos
        const result = await pool.query(`
      SELECT 
        id, 
        radar_id, 
        filename, 
        metadata,
        source_timestamp 
      FROM radar_products 
      WHERE status = 'ready' 
      ORDER BY source_timestamp DESC 
      LIMIT 5
    `);

        console.log(`Total de registros encontrados: ${result.rows.length}\n`);

        result.rows.forEach((row, index) => {
            console.log(`--- Registro ${index + 1} ---`);
            console.log(`ID: ${row.id}`);
            console.log(`Radar: ${row.radar_id}`);
            console.log(`Filename: ${row.filename}`);
            console.log(`Timestamp: ${row.source_timestamp}`);
            console.log(`Metadata type: ${typeof row.metadata}`);

            if (row.metadata) {
                let meta = row.metadata;
                if (typeof meta === 'string') {
                    try {
                        meta = JSON.parse(meta);
                    } catch (e) {
                        console.log('❌ Error parsing metadata');
                        console.log('Raw metadata:', row.metadata);
                        return;
                    }
                }

                console.log('Metadata content:');
                console.log(JSON.stringify(meta, null, 2));

                // Intentar extraer maxDbz
                const maxDbz = meta.metadata?.maxDbz || meta.maxDbz || meta.stats?.max || meta.max || 0;
                console.log(`Extracted maxDbz: ${maxDbz}`);
            } else {
                console.log('⚠️  No metadata available');
            }
            console.log('');
        });

        // Contar cuántos tienen metadata
        const countResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(metadata) as with_metadata,
        COUNT(CASE WHEN metadata IS NULL THEN 1 END) as without_metadata
      FROM radar_products 
      WHERE status = 'ready'
    `);

        console.log('\n=== ESTADÍSTICAS ===');
        console.log(`Total registros: ${countResult.rows[0].total}`);
        console.log(`Con metadata: ${countResult.rows[0].with_metadata}`);
        console.log(`Sin metadata: ${countResult.rows[0].without_metadata}`);

    } catch (error) {
        console.error('Error:', error.message);
    }

    process.exit(0);
}

checkMetadata();
