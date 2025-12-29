require('dotenv').config();
const db = require('../services/db');
const { analyzePngRadarData } = require('../services/pngAnalysisService');
const radarMetadataRepository = require('../services/radarMetadataRepository');

/**
 * Reprocesa TODOS los metadatos en lotes
 */
async function reprocessAllMetadata() {
    console.log('=== REPROCESANDO TODOS LOS METADATOS ===\n');

    const pool = db.getPool();
    if (!pool) {
        console.error('❌ Pool no disponible');
        return false;
    }

    const BATCH_SIZE = 500; // Procesar 500 a la vez
    let offset = 0;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let totalSkipped = 0;

    try {
        // Contar total de registros a procesar
        const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM radar_products 
      WHERE status = 'ready' 
        AND png_data IS NOT NULL
        AND (metadata IS NULL OR metadata::text NOT LIKE '%maxDbz%')
    `);

        const totalRecords = parseInt(countResult.rows[0].total);
        console.log(`Total de registros sin metadatos: ${totalRecords}\n`);

        if (totalRecords === 0) {
            console.log('✓ Todos los registros ya tienen metadatos');
            return true;
        }

        const startTime = Date.now();

        while (true) {
            // Obtener lote de registros
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
          AND (metadata IS NULL OR metadata::text NOT LIKE '%maxDbz%')
        ORDER BY source_timestamp DESC
        LIMIT $1 OFFSET $2
      `, [BATCH_SIZE, offset]);

            if (result.rows.length === 0) {
                break; // No hay más registros
            }

            console.log(`\n--- Procesando lote ${Math.floor(offset / BATCH_SIZE) + 1} (registros ${offset + 1} a ${offset + result.rows.length}) ---`);

            for (const row of result.rows) {
                try {
                    totalProcessed++;

                    // Analizar la imagen PNG
                    const imageBuffer = row.png_data;
                    const radarStats = await analyzePngRadarData(imageBuffer);

                    if (!radarStats.hasData || radarStats.maxDbz === 0) {
                        totalSkipped++;
                        if (totalProcessed % 100 === 0) {
                            console.log(`[${totalProcessed}] ${row.filename}: Sin datos`);
                        }
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

                    // Actualizar metadata
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

                    totalUpdated++;

                    if (totalUpdated % 50 === 0) {
                        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                        const rate = (totalProcessed / (elapsed / 60)).toFixed(1);
                        console.log(`✓ Progreso: ${totalUpdated} actualizados de ${totalProcessed} procesados (${rate} reg/min)`);
                    }

                } catch (error) {
                    totalErrors++;
                    if (error.message.includes('Cannot read properties of null')) {
                        // Imagen corrupta, skip
                        totalSkipped++;
                    } else {
                        console.error(`✗ Error en ${row.filename}: ${error.message}`);
                    }
                }
            }

            offset += BATCH_SIZE;

            // Mostrar progreso cada lote
            const progress = ((totalProcessed / totalRecords) * 100).toFixed(1);
            console.log(`Progreso global: ${progress}% (${totalProcessed}/${totalRecords})`);
        }

        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

        console.log('\n=== RESUMEN FINAL ===');
        console.log(`Tiempo total: ${elapsed} minutos`);
        console.log(`Procesados: ${totalProcessed}`);
        console.log(`Actualizados: ${totalUpdated}`);
        console.log(`Sin datos: ${totalSkipped}`);
        console.log(`Errores: ${totalErrors}`);
        console.log(`Tasa: ${(totalProcessed / elapsed).toFixed(1)} registros/min`);

        return true;

    } catch (error) {
        console.error('Error fatal:', error.message);
        return false;
    }
}

// Ejecutar
if (require.main === module) {
    reprocessAllMetadata()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('Error fatal:', error);
            process.exit(1);
        });
}

module.exports = { reprocessAllMetadata };
