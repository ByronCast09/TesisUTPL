/**
 * Script para forzar sincronización de LOXX y diagnosticar problemas
 */
const PNGSyncService = require('./services/pngSyncService');

console.log('🔍 Iniciando sincronización FORZADA de LOXX con logs detallados\n');
console.log('='.repeat(70));

// Crear instancia para LOXX
const loxxSync = new PNGSyncService({
    radarId: 'LOXX',
    syncInterval: 300000
});

// Override temporalmente isRunning para forzar ejecución
loxxSync.isRunning = false;

// Ejecutar sincronización
loxxSync.performSync()
    .then(() => {
        console.log('\n' + '='.repeat(70));
        console.log('✅ Sincronización completada');
        console.log('Archivos sincronizados:', loxxSync.syncedFiles.size);
        process.exit(0);
    })
    .catch(error => {
        console.error('\n' + '='.repeat(70));
        console.error('❌ Error en sincronización:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    });
