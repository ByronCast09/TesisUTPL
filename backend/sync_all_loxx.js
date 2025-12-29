/**
 * Script para sincronizar TODO lo que falta de LOXX de una vez
 * Sin límites de tiempo ni archivos
 */

const PNGSyncService = require('./services/pngSyncService');

console.log('🚀 SINCRONIZACIÓN COMPLETA DE LOXX - SIN LÍMITES');
console.log('='.repeat(70));
console.log('Este script sincronizará TODOS los archivos faltantes');
console.log('Puede tardar varias horas dependiendo de cuántos archivos falten');
console.log('='.repeat(70));
console.log('');

// Sobrescribir límites temporalmente
const originalPerformSync = PNGSyncService.prototype.performSync;

PNGSyncService.prototype.performSync = async function () {
    // Guardar método original para restaurar después
    const self = this;

    if (this.isRunning) {
        console.log(`[full-sync] Ya hay una sincronización en progreso, esperando...`);
        return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
        console.log(`[full-sync] Iniciando sincronización completa para ${this.radarId}...`);

        const remoteRadarService = require('./services/remoteRadarService');

        // Obtener lista de archivos remotos
        let allFiles;
        try {
            allFiles = await remoteRadarService.listAllRemoteFiles(this.radarId);
        } catch (error) {
            console.error(`[full-sync] Error obteniendo índice remoto:`, error.message);
            return;
        }

        if (!allFiles || allFiles.length === 0) {
            console.log(`[full-sync] No se encontraron archivos remotos`);
            return;
        }

        const results = {
            total: 0,
            downloaded: 0,
            skipped: 0,
            errors: [],
        };

        // Procesar cada fecha (empezar por las más recientes)
        const sortedFiles = allFiles.sort((a, b) => b.date.localeCompare(a.date));

        console.log(`[full-sync] Procesando ${sortedFiles.length} fechas...`);

        for (const dateEntry of sortedFiles) {
            if (!dateEntry.png || dateEntry.png.length === 0) {
                continue;
            }

            console.log(`[full-sync] Procesando fecha ${dateEntry.date}: ${dateEntry.png.length} archivos`);

            // Procesar PNGs de esta fecha
            for (const pngFile of dateEntry.png) {
                results.total++;

                // Mostrar progreso cada 100 archivos
                if (results.total % 100 === 0) {
                    console.log(`[full-sync] Progreso: ${results.total} verificados, ${results.downloaded} descargados, ${results.skipped} omitidos`);
                }

                const result = await this.syncPNG(pngFile, dateEntry.date);

                if (result.success) {
                    results.downloaded++;
                } else if (result.skipped) {
                    results.skipped++;
                } else {
                    results.errors.push({ file: pngFile.name, error: result.error || result.reason });
                }

                // Pausa mínima para no saturar
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`[full-sync] ✓ Fecha ${dateEntry.date} completada`);
        }

        this.lastSyncTime = new Date();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('');
        console.log('='.repeat(70));
        console.log(`[full-sync] ✓ SINCRONIZACIÓN COMPLETA TERMINADA en ${elapsed}s`);
        console.log(`[full-sync] Total verificados: ${results.total}`);
        console.log(`[full-sync] Descargados: ${results.downloaded}`);
        console.log(`[full-sync] Ya existían: ${results.skipped}`);
        console.log(`[full-sync] Errores: ${results.errors.length}`);
        console.log('='.repeat(70));

        if (results.errors.length > 0) {
            console.warn(`[full-sync] ⚠️ Errores encontrados (${results.errors.length}):`)
            results.errors.slice(0, 20).forEach((err, idx) => {
                console.warn(`  ${idx + 1}. ${err.file}: ${err.error}`);
            });
            if (results.errors.length > 20) {
                console.warn(`  ... y ${results.errors.length - 20} errores más`);
            }
        }

        this.saveSyncState();
    } catch (error) {
        console.error(`[full-sync] ✗ Error en sincronización completa:`, error.message);
        console.error(error.stack);
    } finally {
        this.isRunning = false;
        console.log(`[full-sync] Estado de sincronización liberado`);
    }
};

// Crear instancia y ejecutar
const loxxSync = new PNGSyncService({
    radarId: 'LOXX',
    syncInterval: 600000
});

// Forzar ejecución (ignorar si ya está corriendo)
loxxSync.isRunning = false;

console.log('Iniciando sincronización completa...');
console.log('');

loxxSync.performSync()
    .then(() => {
        console.log('');
        console.log('✅ PROCESO COMPLETADO');
        console.log('Puedes verificar los datos sincronizados en PostgreSQL');
        process.exit(0);
    })
    .catch(error => {
        console.error('');
        console.error('❌ ERROR EN SINCRONIZACIÓN:', error);
        console.error(error.stack);
        process.exit(1);
    });
