const PNGSyncService = require('./services/pngSyncService');

async function forceSync() {
    console.log('🚀 Forzando sincronización inmediata de últimos frames...');

    const syncService = new PNGSyncService({
        radarId: 'LGUAXX',
        syncInterval: 1000, // 1 segundo (solo para este test)
    });

    try {
        await syncService.sync();
        console.log('\n✅ Sincronización completada');
        console.log('🔄 Recarga el visor para ver los nuevos frames');
    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    process.exit(0);
}

forceSync();
