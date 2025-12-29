require('dotenv').config();
const radarMetadataRepository = require('../services/radarMetadataRepository');
const axios = require('axios');

/**
 * Script para actualizar metadata de registros LOXX existentes descargando los JSON
 */

async function updateExistingLOXXMetadata(limit = 100) {
    try {
        console.log(`🔄 Iniciando actualización de metadata de LOXX...`);

        // Obtener registros de LOXX que no tienen maxDbz
        const records = await radarMetadataRepository.listProcessed({
            radarId: 'LOXX',
            productType: 'ppi_png',
            from: new Date('2025-07-01'),
            to: new Date(),
        });

        console.log(`📊 Total registros LOXX encontrados: ${records.length}`);

        const recordsToUpdate = records.filter(r => {
            const meta = r.metadata || {};
            return !meta.maxDbz || meta.maxDbz === 0;
        });

        console.log(`✏️  Registros sin maxDbz: ${recordsToUpdate.length}`);
        console.log(`   Procesando primeros ${Math.min(limit, recordsToUpdate.length)}...`);

        let updated = 0;
        let failed = 0;

        for (const record of recordsToUpdate.slice(0, limit)) {
            try {
                // Construir URL del JSON basándose en la URL original del PNG
                const originalUrl = record.metadata?.originalUrl || record.storage_path;
                if (!originalUrl) {
                    console.log(`⚠️  Sin URL para registro ${record.id}`);
                    failed++;
                    continue;
                }

                const jsonUrl = originalUrl.replace(/\.png$/i, '.json');

                // Descargar JSON
                const response = await axios.get(jsonUrl, { timeout: 60000, responseType: 'json' });

                if (response.status === 200 && response.data) {
                    const jsonData = response.data;

                    // Fusionar metadata
                    const updatedMetadata = {
                        ...(record.metadata || {}),
                        ...(jsonData.metadata || {}),
                        maxDbz: jsonData.metadata?.maxDbz || jsonData.max,
                        minDbz: jsonData.metadata?.minDbz || jsonData.min,
                        bounds: jsonData.bounds || jsonData.metadata?.bounds,
                        stats: jsonData.stats || (jsonData.metadata ? {
                            max: jsonData.metadata.maxDbz || jsonData.max,
                            min: jsonData.metadata.minDbz || jsonData.min
                        } : undefined),
                    };

                    // Actualizar en PostgreSQL
                    await radarMetadataRepository.update(record.id, {
                        metadata: updatedMetadata
                    });

                    console.log(`✅ Actualizado registro ${record.id} - maxDbz: ${updatedMetadata.maxDbz}`);
                    updated++;
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    console.log(`⚠️  JSON no encontrado para registro ${record.id}`);
                } else {
                    console.log(`❌ Error en registro ${record.id}: ${error.message}`);
                }
                failed++;
            }
        }

        console.log(`\n📈 Resumen:`);
        console.log(`   ✅ Actualizados: ${updated}`);
        console.log(`   ❌ Fallidos: ${failed}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Ejecutar con límite de 100 registros por defecto
const limit = process.argv[2] ? parseInt(process.argv[2]) : 100;
updateExistingLOXXMetadata(limit).then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
}).catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
