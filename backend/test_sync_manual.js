const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'radar_metadata',
});

async function testSyncManual() {
    try {
        console.log('🧪 Test manual de sincronización\n');

        // Importar el servicio
        const PNGSyncService = require('./services/pngSyncService');

        // Crear servicio para LGUAXX solamente (más rápido)
        console.log('📡 Probando sincronización con LGUAXX...\n');
        const syncService = new PNGSyncService({
            radarId: 'LGUAXX',
            syncInterval: 60000, // 1 minuto (solo para el test)
        });

        // Ejecutar una sincronización manual
        console.log('⏳ Iniciando sincronización manual (puede tardar 1-2 minutos)...\n');
        await syncService.performSync();

        console.log('\n✅ Sincronización manual completada');
        console.log('💡 Si ves errores arriba, ese es el problema');
        console.log('💡 Si no hay errores, revisa cuántos PNG se descargaron\n');

    } catch (error) {
        console.error('\n❌ Error en test manual:', error.message);
        console.error('\nStack trace:', error.stack);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

testSyncManual();
