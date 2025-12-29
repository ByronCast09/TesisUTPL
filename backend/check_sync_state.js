// Ver estado del archivo de sincronización
const fs = require('fs');
const path = require('path');

const stateFile = path.join(__dirname, 'storage', 'png_sync_state_LOXX.json');

if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    console.log('Estado de sincronización LOXX:');
    console.log('  Última actualización:', state.lastUpdate);
    console.log('  Archivos sincronizados:', state.syncedFiles?.length || 0);
    console.log('  Última sincronización:', state.lastSyncTime);

    const lastUpdate = new Date(state.lastUpdate);
    const now = new Date();
    const minutesAgo = Math.floor((now - lastUpdate) / 60000);

    console.log(`\n  Hace ${minutesAgo} minutos que se actualizó el estado`);

    if (minutesAgo > 30) {
        console.log('\n⚠️ La sincronización lleva más de 30 minutos - probablemente bloqueada');
    }
} else {
    console.log('No existe archivo de estado');
}

process.exit(0);
