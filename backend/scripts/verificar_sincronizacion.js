/**
 * Script para verificar que la sincronización automática está funcionando
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const PNGSyncService = require('../services/pngSyncService');
const radarMetadataRepository = require('../services/radarMetadataRepository');
const db = require('../services/db');

console.log('='.repeat(60));
console.log('VERIFICACIÓN DE SINCRONIZACIÓN AUTOMÁTICA');
console.log('='.repeat(60));
console.log('');

// 1. Verificar PostgreSQL
console.log('1. Verificando conexión a PostgreSQL...');
if (db.isConfigured()) {
  console.log('   ✅ PostgreSQL configurado');
  db.initialize()
    .then(() => {
      console.log('   ✅ Conexión a PostgreSQL exitosa');
    })
    .catch((err) => {
      console.log('   ❌ Error de conexión:', err.message);
    });
} else {
  console.log('   ❌ PostgreSQL NO está configurado');
  console.log('   Configura las variables DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
}

console.log('');

// 2. Verificar STORE_PNG_IN_DB
console.log('2. Verificando almacenamiento de PNGs en BD...');
const storePng = String(process.env.STORE_PNG_IN_DB || '').trim().toLowerCase();
if (['1', 'true', 'yes', 'on'].includes(storePng)) {
  console.log('   ✅ STORE_PNG_IN_DB está activado');
} else {
  console.log('   ⚠️  STORE_PNG_IN_DB NO está activado');
  console.log('   Agrega STORE_PNG_IN_DB=true a tu archivo .env');
}

console.log('');

// 3. Verificar ENABLE_PNG_SYNC
console.log('3. Verificando activación de sincronización...');
const enableSync = String(process.env.ENABLE_PNG_SYNC || '').trim().toLowerCase();
if (['1', 'true', 'yes', 'on'].includes(enableSync)) {
  console.log('   ✅ ENABLE_PNG_SYNC está activado');
} else {
  console.log('   ❌ ENABLE_PNG_SYNC NO está activado');
  console.log('   Agrega ENABLE_PNG_SYNC=true a tu archivo .env');
}

console.log('');

// 4. Verificar URLs remotas
console.log('4. Verificando URLs remotas de radar...');
const radars = ['LGUAXX', 'LOXX'];
let urlsOk = true;
radars.forEach(radar => {
  const url = process.env[`RADAR_${radar}_URL`];
  if (url) {
    console.log(`   ✅ ${radar}: ${url}`);
  } else {
    console.log(`   ❌ ${radar}: NO configurado`);
    urlsOk = false;
  }
});

if (!urlsOk) {
  console.log('   Configura RADAR_LGUAXX_URL y RADAR_LOXX_URL en tu .env');
}

console.log('');

// 5. Verificar PNGs en PostgreSQL
console.log('5. Verificando PNGs en PostgreSQL...');
(async () => {
  try {
    if (db.isConfigured()) {
      await db.initialize();
      
      for (const radarId of radars) {
        const pngs = await radarMetadataRepository.listProcessed({
          radarId,
          productType: 'ppi_png',
          limit: 10,
        });
        
        console.log(`   ${radarId}: ${pngs.length} PNGs encontrados (últimos 10)`);
        
        if (pngs.length > 0) {
          const latest = pngs[0];
          console.log(`      Último: ${latest.filename} (${latest.source_timestamp || 'sin timestamp'})`);
        }
      }
    } else {
      console.log('   ⚠️  PostgreSQL no configurado, no se puede verificar');
    }
  } catch (error) {
    console.log(`   ❌ Error verificando PNGs: ${error.message}`);
  }
  
  console.log('');
  
  // 6. Probar sincronización manual
  console.log('6. ¿Probar sincronización manual? (Ctrl+C para cancelar)');
  console.log('   Esto descargará PNGs nuevos desde la PC remota...');
  console.log('');
  
  setTimeout(async () => {
    try {
      if (['1', 'true', 'yes', 'on'].includes(enableSync)) {
        console.log('   Iniciando prueba de sincronización...');
        
        const syncService = new PNGSyncService({
          radarId: 'LGUAXX',
          syncInterval: 300000,
        });
        
        await syncService.forceSync();
        
        console.log('');
        console.log('   ✅ Prueba de sincronización completada');
      } else {
        console.log('   ⚠️  ENABLE_PNG_SYNC no está activado, omitiendo prueba');
      }
    } catch (error) {
      console.log(`   ❌ Error en prueba: ${error.message}`);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('VERIFICACIÓN COMPLETADA');
    console.log('='.repeat(60));
    process.exit(0);
  }, 2000);
})();

