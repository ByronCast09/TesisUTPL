require('dotenv').config();
const db = require('../services/db');
const { analyzePngRadarData } = require('../services/pngAnalysisService');
const radarMetadataRepository = require('../services/radarMetadataRepository');

/**
 * Reprocesa los metadatos de las imágenes existentes
 * analizando las imágenes PNG para extraer datos meteorológicos
 */
async function reprocessMetadata() {
    console.log('=== REPROCESANDO METADATOS DE IMÁGENES ===\n');

    const pool = db.getPool();
    if (!pool) {
        console.error('❌ Pool no disponible');
        return false;
    }

    try {
        // Obtener registros que tienen imagen pero metadata incompleta
        const result = await pool.query(`
      SELECT 
        id, 
        radar_id, 
        filename, 
        metadata,
        png_data
      FROM radar_products 
      WHERE status = 'ready' 
        AND png_data IS NOT NULL
      ORDER BY source_timestamp DESC
      LIMIT 100
    `);

        console.log(`Total de registros a procesar: ${result.rows.length}\n`);

        let processed = 0;
        let updated = 0;
        let errors = 0;

        for (const row of result.rows) {
            try {
                processed++;

                // Analizar la imagen PNG
                const imageBuffer = row.png_data;
                const radarStats = await analyzePngRadarData(imageBuffer);

                if (!radarStats.hasData || radarStats.maxDbz === 0) {
                    console.log(`[${processed}/${result.rows.length}] ${row.filename}: Sin datos meteorológicos`);
                    continue;
                }

                // Obtener metadata actual
                let currentMetadata = row.metadata || {};
                if (typeof currentMetadata === 'string') {
                    try {
                        currentMetadata = JSON.parse(currentMetadata);
                    } catch (e) {
                        currentMetadata = {};
                    }
                }

                // Actualizar metadata con estadísticas de radar
                const updatedMetadata = {
                    ...currentMetadata,
                    maxDbz: radarStats.maxDbz,
                    minDbz: radarStats.minDbz,
                    avgDbz: radarStats.avgDbz,
                    stats: {
                        max: radarStats.maxDbz,
                        min: radarStats.minDbz,
                        avg: radarStats.avgDbz,
                        dataPixels: radarStats.dataPixels
                    },
                    analyzed: true,
                    analyzedAt: new Date().toISOString()
                };

                // Actualizar en BD
                await radarMetadataRepository.update(row.id, {
                    metadata: updatedMetadata
                });

                updated++;
                console.log(`[${processed}/${result.rows.length}] ✓ ${row.filename}: maxDbz=${radarStats.maxDbz.toFixed(1)} dBZ`);

            } catch (error) {
                errors++;
                console.error(`[${processed}/${result.rows.length}] ✗ ${row.filename}: ${error.message}`);
            }
        }

        console.log('\n=== RESUMEN ===');
        console.log(`Procesados: ${processed}`);
        console.log(`Actualizados: ${updated}`);
        console.log(`Errores: ${errors}`);
        console.log(`Sin datos: ${processed - updated - errors}`);

        return true;

    } catch (error) {
        console.error('Error fatal:', error.message);
        return false;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    reprocessMetadata()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('Error fatal:', error);
            process.exit(1);
        });
}

module.exports = { reprocessMetadata };
